import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { createServiceClient } from '@/lib/supabase/server'

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: 'jwt' },

  pages: {
    signIn: '/auth',
    error: '/auth',
  },

  callbacks: {
    // Attach user id and username to the JWT
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = user.username
      }
      return token
    },
    // Expose id and username on the session object
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.username = token.username
      }
      return session
    },
  },

  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        const supabase = createServiceClient()

        // Look up profile by username, join the auth table via id
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, username, password_hash')
          .eq('username', credentials.username.toLowerCase().trim())
          .single()

        if (error || !profile) return null

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          profile.password_hash
        )

        if (!passwordMatch) return null

        return {
          id: profile.id,
          username: profile.username,
          name: profile.username,
        }
      },
    }),
  ],
})
