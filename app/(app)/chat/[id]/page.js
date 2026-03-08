import { getConversationAction } from '@/actions/conversations'
import { getLanguagesAction } from '@/actions/languages'
import ChatRoom from '@/components/chat/ChatRoom'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ChatPage({ params }) {
  const { id } = await params

  const [result, { languages = [] }] = await Promise.all([
    getConversationAction(id),
    getLanguagesAction(),
  ])

  if (result.error) notFound()

  return (
    <ChatRoom
      initialData={result}
      conversationId={id}
      languages={languages}
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
