import { redirect } from 'next/navigation'

export default async function OldBrandStudioPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  redirect(`/clients/${clientId}/brand-studio`)
}
