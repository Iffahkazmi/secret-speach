import { getUsersAction } from '@/actions/friends'
import UsersClient from '@/components/users/UsersClient'

export const metadata = { title: 'Find Users — SecretSpeak' }
export const dynamic = 'force-dynamic'

export default async function UsersPage({ searchParams }) {
  // Next.js 15: searchParams is a Promise
  const params = await searchParams
  const search = params?.search ?? ''

  const { users = [], currentUserId } = await getUsersAction({ search })

  return <UsersClient initialUsers={users} currentUserId={currentUserId} initialSearch={search} />
}
