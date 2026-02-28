import { WorkspaceClient } from '../workspace-client'

export default function BedarfsanalysePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return <WorkspaceClient params={params} />
}
