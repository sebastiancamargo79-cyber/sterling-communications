import DeliveryClient from './DeliveryClient'

export const dynamic = 'force-dynamic'

export default async function DeliveryPage({
  params,
}: {
  params: Promise<{ editionId: string }>
}) {
  const { editionId } = await params

  return <DeliveryClient editionId={editionId} />
}
