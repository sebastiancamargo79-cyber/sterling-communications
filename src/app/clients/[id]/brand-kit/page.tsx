import { redirect } from 'next/navigation'

export default async function BrandKitPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/clients/${id}/brand-studio`)
}
