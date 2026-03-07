import './globals.css'
import { Toaster } from 'sonner'
import { auth } from '@/lib/auth'
import { SessionProvider } from 'next-auth/react'

export const metadata = {
  title: 'SecretSpeak — Chat in Your Own Language',
  description: 'Create secret languages and chat with friends in code.',
}

export default async function RootLayout({ children }) {
  const session = await auth()

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <SessionProvider session={session}>
          {children}
          <Toaster
            theme="dark"
            toastOptions={{
              style: {
                background: 'hsl(222 40% 8%)',
                border: '1px solid hsl(215 25% 14%)',
                color: 'hsl(210 40% 95%)',
              },
            }}
          />
        </SessionProvider>
      </body>
    </html>
  )
}
