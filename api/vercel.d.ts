import type { IncomingMessage, ServerResponse } from 'node:http'

/**
 * Lightweight type definitions for Vercel serverless functions.
 * Replaces the heavy @vercel/node package (which pulls in vulnerable
 * transitive deps) — we only ever used it for these two interfaces.
 */
export interface VercelRequest extends IncomingMessage {
  query: Record<string, string | string[]>
  body?: Record<string, unknown>
  url?: string
}

export interface VercelResponse extends ServerResponse {
  status(code: number): VercelResponse
  json(body: unknown): VercelResponse
  send(body: unknown): VercelResponse
  end(body?: string | Buffer): this
  setHeader(name: string, value: string | number | readonly string[]): this
}
