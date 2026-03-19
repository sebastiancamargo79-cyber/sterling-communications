import { getAllModuleDefs } from '@/lib/module-registry'
import AiPromptsClient from './AiPromptsClient'

export const dynamic = 'force-dynamic'

export default async function AdminAiPromptsPage() {
  const defs = await getAllModuleDefs()
  return <AiPromptsClient modules={defs} />
}
