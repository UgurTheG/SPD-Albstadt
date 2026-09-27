import { lookup } from 'node:dns'
import { get } from 'node:https'
import { BlockList, isIP, type LookupFunction } from 'node:net'

const blockedV4 = new BlockList()
for (const [address, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const)
  blockedV4.addSubnet(address, prefix, 'ipv4')
const globalV6 = new BlockList()
globalV6.addSubnet('2000::', 3, 'ipv6')
const blockedV6 = new BlockList()
blockedV6.addSubnet('2001::', 23, 'ipv6')
blockedV6.addSubnet('2001:db8::', 32, 'ipv6')
blockedV6.addSubnet('2002::', 16, 'ipv6')
blockedV6.addSubnet('3fff::', 20, 'ipv6')

function isPublicAddress(address: string): boolean {
  if (isIP(address) === 4) return !blockedV4.check(address, 'ipv4')
  return isIP(address) === 6 && globalV6.check(address, 'ipv6') && !blockedV6.check(address, 'ipv6')
}

// Validate the very DNS answers handed to the socket. A separate preflight
// lookup followed by ordinary fetch would still permit DNS rebinding.
const publicLookup: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { all: true, family: options.family }, (error, addresses) => {
    if (error) return callback(error, '')
    if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
      callback(new Error('ics_address_not_allowed'), '')
      return
    }
    if (options.all) callback(null, addresses)
    else callback(null, addresses[0]!.address, addresses[0]!.family)
  })
}

/** HTTPS does not follow redirects, and a dedicated socket uses only checked DNS answers. */
export function fetchCalendar(url: string, maxBytes: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const req = get(
      url,
      {
        agent: false,
        lookup: publicLookup,
        signal: AbortSignal.timeout(10_000),
        headers: { 'User-Agent': 'SPD-Albstadt-Website/1.0', Accept: 'text/calendar' },
      },
      response => {
        if (response.statusCode !== 200) {
          response.destroy()
          reject(new Error('upstream_error'))
          return
        }
        const chunks: Buffer[] = []
        let size = 0
        const tooLarge = () => {
          response.destroy()
          reject(new Error('upstream_too_large'))
        }
        if (Number(response.headers['content-length'] ?? 0) > maxBytes) return tooLarge()
        response.on('data', (chunk: Buffer) => {
          size += chunk.length
          if (size > maxBytes) return tooLarge()
          chunks.push(chunk)
        })
        response.on('end', () => resolve(Buffer.concat(chunks)))
        response.on('error', reject)
        response.on('aborted', () => reject(new Error('upstream_error')))
      },
    )
    req.on('error', reject)
  })
}
