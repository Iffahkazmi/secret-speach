import { getConversationAction } from '@/actions/conversations'
import ChatRoom from '@/components/chat/ChatRoom'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

// Next.js 15: params is now a Promise — must be awaited
export default async function ChatPage({ params }) {
  const { id } = await params

  const result = await getConversationAction(id)

  if (result.error) notFound()

  return (
    <ChatRoom
      initialData={result}
      conversationId={id}
    />
  )
}

export async function generateMetadata({ params }) {
  const { id } = await params
  const result = await getConversationAction(id)
  return {
    title: result?.conversation?.name
      ? `${result.conversation.name} — SecretSpeak`
      : 'Chat — SecretSpeak',
  }
}
