import { ChatShell } from '@/components/chat/chat-shell'
import { getCurrentUser } from '@/lib/auth'
import { getChatBootstrap } from '@/lib/messenger/service'

export default async function ChatPage() {
  const currentUser = await getCurrentUser()
  const bootstrap = await getChatBootstrap(currentUser.id)

  return <ChatShell bootstrap={bootstrap} />
}
