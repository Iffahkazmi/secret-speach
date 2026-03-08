import { auth, signOut } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MessageSquare, Languages, LogOut, Users, Search } from 'lucide-react'

export default async function AppLayout({ children }) {
  const session = await auth()
  if (!session) redirect('/auth')

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b"
        style={{
          background: 'hsl(222 47% 5% / 0.9)',
          borderColor: 'hsl(215 25% 14%)',
          backdropFilter: 'blur(16px)',
        }}>
        <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 group-hover:shadow-[0_0_15px_hsl(185_100%_50%/0.4)]"
              style={{
                background: 'linear-gradient(135deg, hsl(185 100% 50% / 0.2), hsl(160 84% 39% / 0.2))',
                border: '1px solid hsl(185 100% 50% / 0.25)',
              }}>
              <MessageSquare className="w-4 h-4" style={{ color: 'hsl(185 100% 50%)' }} />
            </div>
            <span className="font-bold text-sm tracking-wide hidden sm:block"
              style={{ color: 'hsl(185 100% 70%)' }}>
              SecretSpeak
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            <NavLink href="/dashboard" icon={<MessageSquare className="w-4 h-4" />} label="Chats" />
            <NavLink href="/languages" icon={<Languages className="w-4 h-4" />} label="Languages" />
            <NavLink href="/friends" icon={<Users className="w-4 h-4" />} label="Friends" />
            <NavLink href="/users" icon={<Search className="w-4 h-4" />} label="Find" />
          </nav>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium px-3 py-1 rounded-lg hidden sm:block"
              style={{
                background: 'hsl(215 25% 12%)',
                color: 'hsl(215 20% 65%)',
                border: '1px solid hsl(215 25% 18%)',
              }}>
              {session.user.username}
            </span>
            <form action={async () => {
              'use server'
              await signOut({ redirectTo: '/' })
            }}>
              <button type="submit"
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:bg-red-500/10"
                style={{ color: 'hsl(215 20% 50%)' }}
                title="Sign out">
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  )
}

function NavLink({ href, icon, label }) {
  return (
    <Link href={href}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 text-[hsl(215,20%,55%)] hover:text-[hsl(185,100%,70%)] hover:bg-[hsl(215,25%,14%)]"
    >
      {icon}
      <span className="hidden sm:block">{label}</span>
    </Link>
  )
}