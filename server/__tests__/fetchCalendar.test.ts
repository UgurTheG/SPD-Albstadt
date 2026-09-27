import { lookup, type LookupAllOptions, type LookupAddress } from 'node:dns'
import { get } from 'node:https'
import type { LookupFunction } from 'node:net'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchCalendar } from '../fetchCalendar'
import { mockHttpsResponse } from '../../api/__tests__/httpsMock'

vi.mock('node:https', () => {
  const get = vi.fn()
  return { get, default: { get } }
})
vi.mock('node:dns', () => {
  const lookup = vi.fn()
  return { lookup, default: { lookup } }
})

const mockLookup = vi.mocked(
  lookup as (
    hostname: string,
    options: LookupAllOptions,
    callback: (error: NodeJS.ErrnoException | null, addresses: LookupAddress[]) => void,
  ) => void,
)

afterEach(() => vi.resetAllMocks())

describe('fetchCalendar network boundary', () => {
  it.each([301, 302, 303, 307, 308])(
    'rejects redirects (%i) without a second request',
    async status => {
      const spy = mockHttpsResponse('', { location: 'https://127.0.0.1/private' }, status)
      await expect(fetchCalendar('https://calendar.example.org/feed', 100)).rejects.toThrow(
        'upstream_error',
      )
      expect(spy).toHaveBeenCalledTimes(1)
    },
  )

  it('limits streamed bodies even without Content-Length', async () => {
    mockHttpsResponse('BEGIN:VCALENDAR' + 'x'.repeat(100))
    await expect(fetchCalendar('https://calendar.example.org/feed', 30)).rejects.toThrow(
      'upstream_too_large',
    )
  })

  it.each([
    '127.0.0.1',
    '10.0.0.1',
    '172.16.0.1',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '198.18.0.1',
    '224.0.0.1',
    '::1',
    'fd00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
    '64:ff9b::7f00:1',
    '2002:7f00:1::',
  ])('rejects DNS answers containing non-public address %s', async address => {
    mockHttpsResponse()
    await fetchCalendar('https://calendar.example.org/feed', 100)
    const options = vi.mocked(get).mock.calls[0]![1]
    const resolver = options.lookup as LookupFunction
    mockLookup.mockImplementation((_host, _options, callback) => {
      callback(null, [
        { address: '93.184.216.34', family: 4 },
        { address, family: address.includes(':') ? 6 : 4 },
      ])
    })
    const callback = vi.fn()
    resolver('calendar.example.org', { all: true }, callback)
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'ics_address_not_allowed' }),
      '',
    )
    expect(options.agent).toBe(false)
  })

  it.each([true, false])(
    'passes the validated public answers directly to the socket (all=%s)',
    async all => {
      mockHttpsResponse()
      await fetchCalendar('https://calendar.example.org/feed', 100)
      const resolver = vi.mocked(get).mock.calls[0]![1].lookup as LookupFunction
      const addresses = [
        { address: '93.184.216.34', family: 4 },
        { address: '2606:4700::1111', family: 6 },
      ]
      mockLookup.mockImplementation((_host, _options, callback) => callback(null, addresses))
      const callback = vi.fn()
      resolver('calendar.example.org', { all }, callback)
      expect(lookup).toHaveBeenCalledTimes(1)
      if (all) expect(callback).toHaveBeenCalledWith(null, addresses)
      else expect(callback).toHaveBeenCalledWith(null, addresses[0].address, 4)
    },
  )
})
