export function formatBTCAddress(address: string): string {
  const groups: string[] = address.match(/.{1,4}/g) || []
  const lines: string[] = []

  for (let i = 0; i < groups.length; i += 6) {
    lines.push(groups.slice(i, i + 6).join(' '))
  }

  return lines.join('\n')
}