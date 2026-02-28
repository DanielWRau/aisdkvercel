import { AngebotsClient } from './angebots-client'

export default function AngebotsvergleichPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return <AngebotsClient params={params} />
}
