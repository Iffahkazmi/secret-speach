'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { signInAction, signUpAction } from '@/actions/auth'
import { Lock, Eye, EyeOff, Zap, MessageSquare, Shield, Languages, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

// Cipher characters for the animated background
const CIPHER_CHARS = '01アイウエオカキクケコサシスセソタチツテトナニヌネノ∆∑∏√∫≈≠≤≥∞αβγδεζ'

function CipherRain() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const cols = Math.floor(canvas.width / 20)
    const drops = Array.from({ length: cols }, () => Math.random() * -100)

    const draw = () => {
      ctx.fillStyle = 'rgba(7, 11, 20, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      drops.forEach((y, i) => {
        const char = CIPHER_CHARS[Math.floor(Math.random() * CIPHER_CHARS.length)]
        const x = i * 20

        // Leading char is bright cyan
        ctx.fillStyle = `hsl(185, 100%, 75%)`
        ctx.font = '13px JetBrains Mono, monospace'
        ctx.fillText(char, x, y)

        // Trail chars fade out
        for (let j = 1; j < 8; j++) {
          const trailChar = CIPHER_CHARS[Math.floor(Math.random() * CIPHER_CHARS.length)]
          const opacity = (8 - j) / 8 * 0.4
          ctx.fillStyle = `hsla(185, 100%, 50%, ${opacity})`
          ctx.fillText(trailChar, x, y - j * 16)
        }

        drops[i] = y > canvas.height + 50 ? -20 : y + 1.2
      })

      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ opacity: 0.25, zIndex: 0 }}
    />
  )
}

function FloatingOrb({ style }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        animation: 'float 8s ease-in-out infinite',
        ...style,
      }}
    />
  )
}

// Demo pairs: plain = what user typed, encoded = what SecretSpeak sends
const DEMO_PAIRS = [
  { plain: 'hello world',    encoded: 'ellohay orldway'  },
  { plain: 'secret message', encoded: 'zzkrzt mzssagz'   },
  { plain: 'only we know',   encoded: 'ylno ew wonk'     },
  { plain: 'cant crack this',encoded: 'fDqw fudfn wklv'  },
]

// Phases: typing → pause → encrypting → show → next
function LiveDemo() {
  const [idx, setIdx] = useState(0)
  // phase: 'typing' | 'encrypting' | 'show' | 'clear'
  const [phase, setPhase] = useState('typing')
  const [charCount, setCharCount] = useState(0)
  const [encCount, setEncCount] = useState(0)

  const pair = DEMO_PAIRS[idx]

  useEffect(() => {
    let t
    if (phase === 'typing') {
      if (charCount < pair.plain.length) {
        t = setTimeout(() => setCharCount(c => c + 1), 80)
      } else {
        t = setTimeout(() => { setPhase('encrypting'); setEncCount(0) }, 600)
      }
    } else if (phase === 'encrypting') {
      if (encCount < pair.encoded.length) {
        t = setTimeout(() => setEncCount(c => c + 1), 55)
      } else {
        t = setTimeout(() => setPhase('show'), 1800)
      }
    } else if (phase === 'show') {
      t = setTimeout(() => setPhase('clear'), 400)
    } else if (phase === 'clear') {
      t = setTimeout(() => {
        setIdx(i => (i + 1) % DEMO_PAIRS.length)
        setCharCount(0)
        setEncCount(0)
        setPhase('typing')
      }, 300)
    }
    return () => clearTimeout(t)
  }, [phase, charCount, encCount, pair])

  const inputText  = phase === 'clear' ? '' : pair.plain.slice(0, charCount) + (phase === 'typing' && charCount < pair.plain.length ? '▊' : '')
  const outputText = phase === 'encrypting' || phase === 'show'
    ? pair.encoded.slice(0, encCount) + (phase === 'encrypting' && encCount < pair.encoded.length ? '▊' : '')
    : ''
  const status = phase === 'typing' ? 'typing…' : phase === 'encrypting' ? 'encrypting…' : phase === 'show' ? 'encrypted ✓' : ''

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{
        background: 'hsl(222 47% 4%)',
        border: '1px solid hsl(185 100% 50% / 0.2)',
        boxShadow: '0 0 40px hsl(185 100% 50% / 0.08), inset 0 1px 0 hsl(185 100% 50% / 0.1)',
      }}>
      {/* Terminal title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b"
        style={{ borderColor: 'hsl(215 25% 12%)', background: 'hsl(222 47% 6%)' }}>
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: 'hsl(0 84% 50%)' }} />
          <div className="w-3 h-3 rounded-full" style={{ background: 'hsl(45 100% 50%)' }} />
          <div className="w-3 h-3 rounded-full" style={{ background: 'hsl(120 60% 40%)' }} />
        </div>
        <span className="text-xs ml-2 font-mono" style={{ color: 'hsl(215 20% 40%)' }}>
          secretspeak — live encode
        </span>
      </div>

      <div className="p-5 space-y-4 font-mono text-sm min-h-[120px]">
        <div>
          <span style={{ color: 'hsl(215 20% 35%)' }}>input  › </span>
          <span style={{ color: 'hsl(210 40% 80%)' }}>{inputText}</span>
        </div>
        <div>
          <span style={{ color: 'hsl(215 20% 35%)' }}>output › </span>
          <span className="encoded-text" style={{ color: 'hsl(185 100% 60%)' }}>{outputText}</span>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: phase === 'show' ? 'hsl(160 84% 50%)' : 'hsl(45 80% 55%)' }} />
          <span className="text-xs" style={{ color: phase === 'show' ? 'hsl(160 84% 45%)' : 'hsl(45 80% 50%)' }}>
            {status}
          </span>
        </div>
      </div>
    </div>
  )
}

function AuthPanel() {
  const [mode, setMode] = useState('signin')
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
    <div className="rounded-2xl overflow-hidden"
      style={{
        background: 'hsl(222 40% 7% / 0.95)',
        border: '1px solid hsl(215 25% 16%)',
        boxShadow: '0 0 60px hsl(185 100% 50% / 0.08)',
        backdropFilter: 'blur(20px)',
      }}>

      {/* Mode toggle */}
      <div className="flex border-b" style={{ borderColor: 'hsl(215 25% 12%)' }}>
        {['signin', 'signup'].map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); setError('') }}
            className="flex-1 py-3.5 text-sm font-semibold transition-all duration-200 relative"
            style={{
              color: mode === m ? 'hsl(185 100% 60%)' : 'hsl(215 20% 40%)',
              background: mode === m ? 'hsl(185 100% 50% / 0.06)' : 'transparent',
            }}>
            {m === 'signin' ? 'Sign In' : 'Create Account'}
            {mode === m && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t"
                style={{ background: 'hsl(185 100% 50%)' }} />
            )}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-3">
        {/* Username */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono"
            style={{ color: 'hsl(215 20% 40%)' }}>@</span>
          <input
            name="username"
            type="text"
            placeholder="username"
            autoComplete="username"
            required
            className="input-field pl-7 font-mono"
          />
        </div>

        {/* Password */}
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
            style={{ color: 'hsl(215 20% 40%)' }} />
          <input
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
            className="input-field pl-8 pr-9 font-mono"
          />
          <button type="button" onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
            style={{ color: 'hsl(215 20% 40%)' }}>
            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>

        {error && (
          <p className="text-xs px-3 py-2 rounded-lg"
            style={{ background: 'hsl(0 84% 40% / 0.1)', color: 'hsl(0 84% 65%)', border: '1px solid hsl(0 84% 40% / 0.2)' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="btn-primary w-full flex items-center justify-center gap-2 mt-1">
          {isPending ? (
            <span className="w-4 h-4 border-2 rounded-full animate-spin"
              style={{ borderColor: 'hsl(222 47% 5% / 0.3)', borderTopColor: 'hsl(222 47% 5%)' }} />
          ) : (
            <>
              <Zap className="w-4 h-4" />
              {mode === 'signin' ? 'Enter the Vault' : 'Create Account'}
            </>
          )}
        </button>
      </form>
    </div>
  )
}

const FEATURES = [
  {
    icon: <Languages className="w-5 h-5" />,
    title: 'Build Your Language',
    desc: 'Stack transformation rules — Caesar ciphers, pig latin, vowel swaps and more — into your own unique cipher.',
    color: '185',
  },
  {
    icon: <MessageSquare className="w-5 h-5" />,
    title: 'Chat in Real Time',
    desc: 'Messages encode instantly as you type. Hover to decode. Only people with your language key can read them.',
    color: '160',
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: 'Share with Friends',
    desc: 'Invite codes let trusted friends join your language. Switch ciphers mid-conversation with one click.',
    color: '280',
  },
]

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen relative overflow-x-hidden"
      style={{ background: 'hsl(222 47% 4%)' }}>

      {/* Cipher rain - client only to avoid hydration mismatch */}
      {mounted && <CipherRain />}

      {/* Glow orbs */}
      <FloatingOrb style={{
        width: '600px', height: '600px',
        top: '-200px', left: '-100px',
        background: 'radial-gradient(ellipse, hsl(185 100% 50% / 0.07) 0%, transparent 70%)',
      }} />
      <FloatingOrb style={{
        width: '500px', height: '500px',
        top: '20%', right: '-150px',
        background: 'radial-gradient(ellipse, hsl(280 70% 50% / 0.05) 0%, transparent 70%)',
        animationDelay: '-3s',
      }} />
      <FloatingOrb style={{
        width: '400px', height: '400px',
        bottom: '10%', left: '20%',
        background: 'radial-gradient(ellipse, hsl(160 84% 39% / 0.05) 0%, transparent 70%)',
        animationDelay: '-6s',
      }} />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'hsl(222 47% 4% / 0.9)' : 'transparent',
          borderBottom: scrolled ? '1px solid hsl(215 25% 12%)' : '1px solid transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
        }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, hsl(185 100% 50% / 0.25), hsl(160 84% 39% / 0.2))',
                border: '1px solid hsl(185 100% 50% / 0.3)',
                boxShadow: '0 0 20px hsl(185 100% 50% / 0.2)',
              }}>
              <MessageSquare className="w-4 h-4" style={{ color: 'hsl(185 100% 60%)' }} />
            </div>
            <span className="font-bold tracking-wide"
              style={{ fontFamily: 'JetBrains Mono, monospace', color: 'hsl(185 100% 70%)', fontSize: '15px' }}>
              SecretSpeak
            </span>
          </div>

          <a href="#auth"
            className="btn-primary flex items-center gap-1.5 text-sm"
            style={{ padding: '8px 18px' }}>
            Get Started
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </nav>

      {/* Hero section */}
      <section className="relative z-10 min-h-screen flex items-center">
        <div className="max-w-6xl mx-auto px-6 py-24 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left — copy */}
            <div style={{ animation: 'fadeSlideUp 0.8s ease both' }}>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
                style={{
                  background: 'hsl(185 100% 50% / 0.08)',
                  border: '1px solid hsl(185 100% 50% / 0.2)',
                }}>
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'hsl(160 84% 50%)' }} />
                <span className="text-xs font-mono" style={{ color: 'hsl(185 100% 60%)' }}>
                  encrypted · real-time · yours
                </span>
              </div>

              <h1 className="font-bold leading-none mb-6"
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 'clamp(2.8rem, 6vw, 5rem)',
                  color: 'hsl(210 40% 95%)',
                  letterSpacing: '-0.02em',
                }}>
                Chat in a<br />
                <span style={{
                  color: 'hsl(185 100% 60%)',
                  textShadow: '0 0 40px hsl(185 100% 50% / 0.4)',
                }}>
                  language
                </span>
                <br />
                <span style={{ color: 'hsl(210 40% 55%)' }}>only you know.</span>
              </h1>

              <p className="text-lg leading-relaxed mb-8"
                style={{ color: 'hsl(215 20% 55%)', maxWidth: '480px' }}>
                Build custom cipher languages from transformation rules. 
                Share invite codes with friends. Chat in real time — 
                messages stay encrypted until you choose to decode them.
              </p>

              {/* Stats */}
              <div className="flex gap-8 mb-10">
                {[
                  { value: '8', label: 'cipher rules' },
                  { value: '∞', label: 'languages' },
                  { value: '0ms', label: 'encode lag' },
                ].map(s => (
                  <div key={s.label}>
                    <div className="text-2xl font-bold font-mono"
                      style={{ color: 'hsl(185 100% 60%)', textShadow: '0 0 20px hsl(185 100% 50% / 0.3)' }}>
                      {s.value}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'hsl(215 20% 40%)' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <a href="#auth"
                className="btn-primary inline-flex items-center gap-2 text-base"
                style={{ padding: '12px 28px', borderRadius: '12px', fontSize: '15px' }}>
                <Zap className="w-5 h-5" />
                Start Speaking in Secret
              </a>
            </div>

            {/* Right — live demo */}
            <div style={{ animation: 'fadeSlideUp 0.8s ease 0.15s both' }}>
              <div className="relative">
                {/* Glow behind demo */}
                <div className="absolute inset-0 rounded-3xl"
                  style={{ background: 'radial-gradient(ellipse, hsl(185 100% 50% / 0.1) 0%, transparent 70%)', transform: 'scale(1.2)' }} />
                <div className="relative">
                  <LiveDemo />
                  {/* Floating labels */}
                  <div className="absolute -left-4 top-1/3 -translate-y-1/2 px-3 py-1.5 rounded-lg text-xs font-mono"
                    style={{
                      background: 'hsl(222 47% 8%)',
                      border: '1px solid hsl(215 25% 16%)',
                      color: 'hsl(215 20% 50%)',
                      boxShadow: '0 4px 20px hsl(0 0% 0% / 0.3)',
                    }}>
                    plain text
                  </div>
                  <div className="absolute -right-4 bottom-1/3 translate-y-1/2 px-3 py-1.5 rounded-lg text-xs font-mono"
                    style={{
                      background: 'hsl(185 100% 50% / 0.1)',
                      border: '1px solid hsl(185 100% 50% / 0.25)',
                      color: 'hsl(185 100% 65%)',
                      boxShadow: '0 4px 20px hsl(185 100% 50% / 0.1)',
                    }}>
                    encrypted ✓
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features section */}
      <section className="relative z-10 py-24 border-t" style={{ borderColor: 'hsl(215 25% 10%)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-3"
              style={{ fontFamily: 'JetBrains Mono, monospace', color: 'hsl(210 40% 90%)' }}>
              How it works
            </h2>
            <p style={{ color: 'hsl(215 20% 45%)' }}>Three steps to speaking in secret</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 group"
                style={{
                  background: 'hsl(222 40% 7%)',
                  border: '1px solid hsl(215 25% 12%)',
                }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110"
                  style={{
                    background: `hsl(${f.color} 80% 50% / 0.12)`,
                    border: `1px solid hsl(${f.color} 80% 50% / 0.25)`,
                    color: `hsl(${f.color} 80% 60%)`,
                  }}>
                  {f.icon}
                </div>
                <div className="text-xs font-mono mb-1" style={{ color: `hsl(${f.color} 80% 50%)` }}>
                  0{i + 1}
                </div>
                <h3 className="font-semibold mb-2" style={{ color: 'hsl(210 40% 90%)' }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'hsl(215 20% 48%)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Auth section */}
      <section id="auth" className="relative z-10 py-24">
        <div className="max-w-md mx-auto px-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2"
              style={{ fontFamily: 'JetBrains Mono, monospace', color: 'hsl(210 40% 90%)' }}>
              Join SecretSpeak
            </h2>
            <p className="text-sm" style={{ color: 'hsl(215 20% 45%)' }}>
              Your messages, your language, your rules.
            </p>
          </div>
          <AuthPanel />
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t py-8 text-center"
        style={{ borderColor: 'hsl(215 25% 10%)' }}>
        <p className="text-xs font-mono" style={{ color: 'hsl(215 20% 30%)' }}>
          SecretSpeak · speak freely · speak secretly
        </p>
      </footer>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-15px); }
        }
      `}</style>
    </div>
  )
}
