import matter from 'gray-matter'
import { readFileSync } from 'fs'
import { join } from 'path'
import { NewsletterSchema, type Newsletter } from './newsletter-schema'

export function parseNewsletter(file = 'newsletter.md'): Newsletter {
  const raw = readFileSync(join(process.cwd(), 'src/content', file), 'utf8')
  const { data } = matter(raw)
  return NewsletterSchema.parse(data)
}
