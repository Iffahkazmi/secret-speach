'use client'

import { useState, useTransition } from 'react'
import { signInAction, signUpAction } from '@/actions/auth'
import { MessageSquare, Lock, User, Eye, EyeOff, Zap } from 'lucide-react'
import { toast } from 'sonner'

export default function AuthPage() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [showPassword, setShowPassword] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const action = mode === 'signin' ? signInAction : signUpAction
      const result = await action(formData)
      if (result?.error) {
        setError(result.error)
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background grid */}
      <div
        className="fixed inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(hsl(215 25% 14%) 1px, transparent 1px), linear-gradient(90deg, hsl(215 25% 14%) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Glow orbs */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, hsl(185 100% 50% / 0.06) 0%, transparent 70%)' }} />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, hsl(160 84% 39% / 0.05) 0%, transparent 70%)' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{
              background: 'linear-gradient(135deg, hsl(185 100% 50% / 0.2), hsl(160 84% 39% / 0.2))',
              border: '1px solid hsl(185 100% 50% / 0.3)',
              boxShadow: '0 0 30px hsl(185 100% 50% / 0.2)',
            }}>
            <MessageSquare className="w-7 h-7" style={{ color: 'hsl(185 100% 50%)' }} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'hsl(185 100% 70%)' }}>
            SecretSpeak
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'hsl(215 20% 50%)' }}>
            Chat in your own secret language
          </p>
        </div>

        {/* Card */}
        <div className="card-glass rounded-2xl p-6">
          {/* Tab switcher */}
          <div className="flex rounded-lg p-1 mb-6" style={{ background: 'hsl(var(--muted))' }}>
            {['signin', 'signup'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                className="flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200"
                style={mode === m ? {
                  background: 'hsl(185 100% 50%)',
                  color: 'hsl(222 47% 5%)',
                  boxShadow: '0 0 15px hsl(185 100% 50% / 0.3)',
                } : {
                  color: 'hsl(215 20% 50%)',
                }}
              >
                {m === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'hsl(215 20% 50%)' }} />
              <input
                name="username"
                type="text"
                placeholder="Username"
                autoComplete="username"
                required
                className="input-field pl-9"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'hsl(215 20% 50%)' }} />
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
                className="input-field pl-9 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'hsl(215 20% 50%)' }}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm px-3 py-2 rounded-lg"
                style={{ background: 'hsl(0 84% 40% / 0.1)', color: 'hsl(0 84% 65%)', border: '1px solid hsl(0 84% 40% / 0.2)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isPending ? (
                <span className="w-4 h-4 border-2 rounded-full animate-spin"
                  style={{ borderColor: 'hsl(222 47% 5% / 0.3)', borderTopColor: 'hsl(222 47% 5%)' }} />
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  {mode === 'signin' ? 'Sign In' : 'Create Account'}
                </>
              )}
            </button>
          </form>

          <p className="mt-4 text-center text-xs" style={{ color: 'hsl(215 20% 40%)' }}>
            {mode === 'signup'
              ? 'By signing up you agree to keep your secrets secret.'
              : 'New here? Switch to Sign Up above.'}
          </p>
        </div>
      </div>
    </div>
  )
}
