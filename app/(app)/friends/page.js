import { getFriendsAction, getPendingRequestsAction } from '@/actions/friends'
import { getLanguagesAction } from '@/actions/languages'
import FriendsClient from '@/components/users/FriendsClient'

export const metadata = { title: 'Friends — SecretSpeak' }
export const dynamic = 'force-dynamic'

export default async function FriendsPage() {
  const [
    { friends = [] },
    { requests = [] },
    { languages = [] },
  ] = await Promise.all([
    getFriendsAction(),
    getPendingRequestsAction(),
    getLanguagesAction(),
  ])

  return (
    <FriendsClient
      initialFriends={friends}
      initialRequests={requests}
      languages={languages}
    />
  )
}
