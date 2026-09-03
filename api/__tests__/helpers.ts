import { vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '../vercel.d.ts'

interface FakeRequestInit {
  method?: string
  headers?: Record<string, string>
  query?: Record<string, string | string[]>
  body?: unknown
}

export function makeRequest(init: FakeRequestInit = {}): VercelRequest {
  return {
    method: init.method ?? 'GET',
    headers: init.headers ?? {},
    query: init.query ?? {},
    body: init.body,
  } as unknown as VercelRequest
}

export interface FakeResponse extends VercelResponse {
  statusCode: number
  headers: Record<string, string | number | readonly string[]>
  body: unknown
}

export function makeResponse(): FakeResponse {
  const res = {
    statusCode: 200,
    headers: {} as Record<string, string | number | readonly string[]>,
    body: undefined as unknown,
    setHeader(name: string, value: string | number | readonly string[]) {
      res.headers[name] = value
      return res
    },
    status(code: number) {
      res.statusCode = code
      return res
    },
    json(body: unknown) {
      res.body = body
      return res
    },
    send(body: unknown) {
      res.body = body
      return res
    },
    end(body?: string | Buffer) {
      res.body = body
      return res
    },
  }
  return res as unknown as FakeResponse
}

/** A minimal fetch Response stand-in. */
export function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
    text: async () => JSON.stringify(body),
    arrayBuffer: async () => new TextEncoder().encode(JSON.stringify(body)).buffer,
  } as unknown as Response
}

/** Install a fetch mock that answers by URL substring, in call order of the given list. */
export function mockFetchByUrl(routes: Array<[string, Response | (() => Response)]>) {
  const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const hit = routes.find(([needle]) => url.includes(needle))
    if (!hit) throw new Error(`unexpected fetch: ${url}`)
    const value = hit[1]
    return typeof value === 'function' ? value() : value
  })
  return spy
}
