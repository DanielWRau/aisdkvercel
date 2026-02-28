import { getProject } from '@/actions/projects'
import { ChatClient } from './chat-client'

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const project = await getProject(id)

  // Data-minimization: only pass id + name to client
  return <ChatClient projectId={id} projectName={project.name as string} />
}
