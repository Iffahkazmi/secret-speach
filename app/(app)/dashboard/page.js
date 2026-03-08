import { getConversationsAction } from '@/actions/conversations'
import { getLanguagesAction } from '@/actions/languages'
import { getFriendsAction } from '@/actions/friends'
import ConversationsClient from '@/components/chat/ConversationsClient'

export const metadata = { title: 'Chats — SecretSpeak' }
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const [
    { conversations = [], currentUserId },
    { languages = [] },
    { friends = [] },
  ] = await Promise.all([
    getConversationsAction(),
    getLanguagesAction(),
    getFriendsAction(),
  ])

  return (
    <ConversationsClient
      initialConversations={conversations}
      languages={languages}
      friends={friends}
      currentUserId={currentUserId}
    />
  )
}
