import { getLanguagesAction } from '@/actions/languages'
import LanguagesClient from '@/components/language/LanguagesClient'

export const metadata = { title: 'Languages — SecretSpeak' }
export const dynamic = 'force-dynamic'

export default async function LanguagesPage() {
  const { languages = [] } = await getLanguagesAction()

  return <LanguagesClient initialLanguages={languages} />
}
