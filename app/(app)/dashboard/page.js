import { getConversationsAction } from '@/actions/conversations'
import { getLanguagesAction } from '@/actions/languages'
import ConversationsClient from '@/components/chat/ConversationsClient'

export const metadata = { title: 'Chats — SecretSpeak' }

// Next.js 15: no-store is the default, but let's be explicit
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const [{ conversations = [] }, { languages = [] }] = await Promise.all([
    getConversationsAction(),
    getLanguagesAction(),
  ])

  return (
    <ConversationsClient
      initialConversations={conversations}
      languages={languages}
    />
  )
}
