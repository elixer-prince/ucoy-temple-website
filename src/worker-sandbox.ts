/**
 * A sandbox for the hand written service worker (spec 0001, AC-7).
 *
 * `public/sw.js` registers its listeners on the global `self` and reads the
 * Cache API, so it cannot be imported by the test runner. This loads the real
 * file into a virtual machine context with stand ins for the handful of globals
 * it touches, then hands back the fetch handler it registered. Tests drive real
 * requests through that handler, so a regression in the shipped worker fails
 * them: nothing here re-implements the worker.
 *
 * The Cache stand in is deliberately strict. The real Cache API refuses to store
 * a response that is not a whole download, so `put` throws on a 206 here too,
 * which is what lets a test catch the mistake of trying to store one.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import vm from 'node:vm'

const workerSource = readFileSync(join(process.cwd(), 'public', 'sw.js'), 'utf-8')

/** The origin the sandbox pretends the worker runs on. */
const ORIGIN = 'https://ucoy.example'

/** The parts of a request the worker reads. */
export interface SandboxRequest {
  url: string
  method: string
  mode: string
  headers?: Headers
}

/** The parts of a fetch event the worker uses. */
export interface SandboxFetchEvent {
  request: SandboxRequest
  respondWith(response: Promise<FakeResponse>): void
}

/** The fetch handler the worker registers. */
export type FetchHandler = (event: SandboxFetchEvent) => void

/** What a fake response may be built from. */
export interface FakeResponseInit {
  status?: number
  headers?: HeadersInit
}

/** Minimal Response stand in: the worker reads status, headers, clone and body. */
export class FakeResponse {
  body: string
  status: number
  headers: Headers

  constructor(body: string, { status = 200, headers = {} }: FakeResponseInit = {}) {
    this.body = body
    this.status = status
    this.headers = new Headers(headers)
  }

  /** True for any 2xx, exactly as the real Response reports it, 206 included. */
  get ok(): boolean {
    return this.status >= 200 && this.status < 300
  }

  clone(): FakeResponse {
    return new FakeResponse(this.body, { status: this.status, headers: this.headers })
  }
}

/** One write a test watched go into the cache. */
export interface StoredEntry {
  key: string
  status: number
}

/** How a fake cache should misbehave, if at all. */
export interface FakeCacheOptions {
  /** Makes every write fail, the way a full disk quota would. */
  refuseEverything?: boolean
}

/**
 * A Cache stand in, keyed the way the real one is: by the absolute request URL.
 *
 * A relative path resolves against the worker's origin, because that is what the
 * real Cache API does when the worker asks for `cache.match('/index.html')`.
 */
export class FakeCache {
  entries: Map<string, FakeResponse>
  puts: StoredEntry[]

  private refuseEverything: boolean

  constructor(
    entries: Record<string, FakeResponse> = {},
    { refuseEverything = false }: FakeCacheOptions = {}
  ) {
    // Keys go through the same resolution as lookups, so a fixture can name a
    // page the way the worker asks for it, `/index.html`, and still be found.
    this.entries = new Map(
      Object.entries(entries).map(([request, response]) => [FakeCache.key(request), response])
    )
    this.puts = []
    this.refuseEverything = refuseEverything
  }

  static key(request: string | SandboxRequest): string {
    const url = typeof request === 'string' ? request : request.url
    return new URL(url, ORIGIN).href
  }

  async match(request: string | SandboxRequest): Promise<FakeResponse | undefined> {
    return this.entries.get(FakeCache.key(request))
  }

  async put(request: string | SandboxRequest, response: FakeResponse): Promise<void> {
    if (this.refuseEverything) {
      throw new TypeError('QuotaExceededError')
    }

    // The real Cache API refuses to store a partial response.
    if (response.status === 206) {
      throw new TypeError('Partial response (status code 206) is unsupported')
    }

    this.puts.push({ key: FakeCache.key(request), status: response.status })
    this.entries.set(FakeCache.key(request), response)
  }

  async addAll(requests: (string | SandboxRequest)[]): Promise<void> {
    for (const request of requests) {
      this.entries.set(FakeCache.key(request), new FakeResponse('precached'))
    }
  }
}

/** What a test may hand the worker when it loads it. */
export interface SandboxOptions {
  /** The cache the worker pre-caches the shell into. */
  shell?: FakeCache
  /** The cache the worker keeps media in. */
  media?: FakeCache
  /** What the network answers. Throwing from here stands for no connection. */
  fetch: (request: SandboxRequest) => Promise<FakeResponse>
}

/**
 * Loads public/sw.js and hands back the fetch handler it registered.
 *
 * Each call gets its own context, so one test cannot leak state into the next.
 */
export function createWorker({
  shell = new FakeCache(),
  media = new FakeCache(),
  fetch
}: SandboxOptions): FetchHandler {
  let registered: FetchHandler | undefined

  const sandbox = {
    URL,
    Headers,
    console: { warn() {}, debug() {}, error() {}, log() {} },
    Request: class {
      url: string
      method = 'GET'
      mode = 'no-cors'

      constructor(input: string | SandboxRequest) {
        this.url = typeof input === 'string' ? input : input.url
      }
    },
    Response: FakeResponse,
    fetch,
    caches: {
      open: async (name: string): Promise<FakeCache> => (name.includes('media') ? media : shell),
      keys: async (): Promise<string[]> => []
    },
    self: {
      location: { origin: ORIGIN },
      clients: { claim: async (): Promise<void> => {} },
      skipWaiting(): void {},
      addEventListener(type: string, handler: FetchHandler): void {
        if (type === 'fetch') registered = handler
      }
    }
  }

  vm.createContext(sandbox)
  vm.runInContext(workerSource, sandbox)

  const handler = registered
  if (!handler) throw new Error('public/sw.js registered no fetch handler')
  return handler
}

/**
 * Runs one request through a worker and returns the answer it promised.
 *
 * Throws rather than returning nothing when the worker declines to answer, so a
 * worker that stops handling a kind of request fails the test loudly instead of
 * quietly passing it a value of undefined.
 */
export function requestThrough(
  handler: FetchHandler,
  request: SandboxRequest
): Promise<FakeResponse> {
  let answered: Promise<FakeResponse> | undefined

  handler({
    request,
    respondWith(response) {
      answered = response
    }
  })

  if (!answered) throw new Error(`public/sw.js did not answer ${request.url}`)
  return answered
}
