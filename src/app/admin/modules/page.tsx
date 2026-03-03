import { getAllModuleDefs } from '@/lib/module-registry'
import ModulesClient from './ModulesClient'

export const dynamic = 'force-dynamic'

export default async function AdminModulesPage() {
  const defs = await getAllModuleDefs()
  return <ModulesClient modules={defs} />
}
