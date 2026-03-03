import matter from 'gray-matter'

const BLOCK_RE = /^:::module:(\w+)\s*\n([\s\S]*?)^:::/gm

export function parseModuleBlocks(raw: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  let match: RegExpExecArray | null
  while ((match = BLOCK_RE.exec(raw)) !== null) {
    const name = match[1]
    const body = match[2]
    const { data } = matter(`---\n${body}---`)
    result[name.toLowerCase()] = data
  }
  // Reset lastIndex for reuse
  BLOCK_RE.lastIndex = 0
  return result
}

export function serializeModules(modules: Record<string, { name: string; yaml: string }>): string {
  return Object.values(modules)
    .map(({ name, yaml }) => `:::module:${name}\n${yaml}\n:::`)
    .join('\n\n')
}

export function serializeModuleArray(blocks: Array<{ name: string; yaml: string }>): string {
  return blocks.map(({ name, yaml }) => `:::module:${name}\n${yaml}\n:::`).join('\n\n')
}

export function extractModuleBlocks(raw: string): Array<{ name: string; yaml: string }> {
  const blocks: Array<{ name: string; yaml: string }> = []
  const re = /^:::module:(\w+)\s*\n([\s\S]*?)^:::/gm
  let match: RegExpExecArray | null
  while ((match = re.exec(raw)) !== null) {
    blocks.push({ name: match[1], yaml: match[2] })
  }
  return blocks
}
