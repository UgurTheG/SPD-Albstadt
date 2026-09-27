import { EventEmitter } from 'node:events'
import type { ClientRequest, IncomingMessage } from 'node:http'
import { get } from 'node:https'
import { PassThrough } from 'node:stream'
import { vi } from 'vitest'

/** Fake only the HTTPS transport; the calendar validation and stream reader stay real. */
export function mockHttpsResponse(
  body = 'BEGIN:VCALENDAR',
  headers: Record<string, string> = {},
  statusCode = 200,
  error?: Error,
) {
  return vi.mocked(get).mockImplementation((_url, _options, callback) => {
    const request = new EventEmitter() as ClientRequest
    queueMicrotask(() => {
      if (error) {
        request.emit('error', error)
        return
      }
      const response = Object.assign(new PassThrough(), { headers, statusCode })
      callback!(response as unknown as IncomingMessage)
      response.end(Buffer.from(body))
    })
    return request
  })
}
