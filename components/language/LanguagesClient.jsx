'use client'

import { useState, useTransition } from 'react'
import {
  createLanguageAction, updateLanguageAction,
  deleteLanguageAction, joinLanguageAction
} from '@/actions/languages'
import { RULE_TYPES, encodeMessage } from '@/lib/encoder'
import {
  Plus, Trash2, Edit2, Copy, Check, Link2,
  X, Zap, Languages, Lock, ChevronUp, ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'

export default function LanguagesClient({ initialLanguages }) {
  const [languages, setLanguages] = useState(initialLanguages)
  const [editing, setEditing] = useState(null) // null | 'new' | language object
  const [joinCode, setJoinCode] = useState('')
  const [isPendingJoin, startJoinTransition] = useTransition()

  function handleCreated(newLang) {
    setLanguages(prev => [newLang, ...prev])
    setEditing(null)
  }

  function handleUpdated(updated) {
    setLanguages(prev => prev.map(l => l.id === updated.id ? updated : l))
    setEditing(null)
  }

  function handleDeleted(id) {
    setLanguages(prev => prev.filter(l => l.id !== id))
  }

  function handleJoin(e) {
    e.preventDefault()
    startJoinTransition(async () => {
      const result = await joinLanguageAction(joinCode)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Joined "${result.languageName}"!`)
        setJoinCode('')
        // Reload page data
        window.location.reload()
      }
    })
  }

  const presets = languages.filter(l => l.is_preset)
  const mine = languages.filter(l => !l.is_preset)

  return (
    <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(210 40% 95%)' }}>Languages</h1>
          <p className="text-sm mt-0.5" style={{ color: 'hsl(215 20% 45%)' }}>
            Create and manage your secret languages
          </p>
        </div>
        <div className="flex gap-2">
          {/* Join by code */}
          <form onSubmit={handleJoin} className="flex gap-1">
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="INVITE CODE"
              maxLength={8}
              className="input-field w-28 text-center font-mono text-xs uppercase tracking-widest"
            />
            <button
              type="submit"
              disabled={isPendingJoin || !joinCode.trim()}
              className="btn-ghost px-3 flex items-center gap-1"
              title="Join language">
              <Link2 className="w-4 h-4" />
            </button>
          </form>
          <button
            onClick={() => setEditing('new')}
            className="btn-primary flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create</span>
          </button>
        </div>
      </div>

      {/* Preset languages */}
      {presets.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: 'hsl(215 20% 40%)' }}>
            Preset Languages
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {presets.map(lang => (
              <LanguageCard
                key={lang.id}
                lang={lang}
                onEdit={() => {}}
                onDelete={() => {}}
                isOwner={false}
              />
            ))}
          </div>
        </section>
      )}

      {/* My languages */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: 'hsl(215 20% 40%)' }}>
          {mine.length > 0 ? 'My Languages' : ''}
        </h2>
        {mine.length === 0 && presets.length === 0 && (
          <EmptyState onCreateClick={() => setEditing('new')} />
        )}
        {mine.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {mine.map(lang => (
              <LanguageCard
                key={lang.id}
                lang={lang}
                onEdit={() => setEditing(lang)}
                onDelete={handleDeleted}
                isOwner={true}
              />
            ))}
          </div>
        )}
      </section>

      {/* Editor modal */}
      {editing && (
        <LanguageEditor
          language={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onCreated={handleCreated}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  )
}

function LanguageCard({ lang, onEdit, onDelete, isOwner }) {
  const [copied, setCopied] = useState(false)
  const [isPendingDelete, startDelete] = useTransition()
  const [showPreview, setShowPreview] = useState(false)
  const previewText = 'hello world'
  const encoded = encodeMessage(previewText, lang.rules ?? [])

  function copyCode() {
    navigator.clipboard.writeText(lang.invite_code)
    setCopied(true)
    toast.success('Invite code copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDelete() {
    if (!confirm(`Delete "${lang.name}"? This will also delete all conversations using it.`)) return
    startDelete(async () => {
      const result = await deleteLanguageAction(lang.id)
      if (result.error) toast.error(result.error)
      else { toast.success('Language deleted'); onDelete(lang.id) }
    })
  }

  return (
    <div className="card-glass rounded-xl p-4 flex flex-col gap-3 transition-all duration-200">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
            style={{
              background: lang.is_preset
                ? 'hsl(160 84% 39% / 0.15)'
                : 'hsl(185 100% 50% / 0.12)',
              border: `1px solid ${lang.is_preset ? 'hsl(160 84% 39% / 0.25)' : 'hsl(185 100% 50% / 0.2)'}`,
            }}>
            <Languages className="w-4 h-4"
              style={{ color: lang.is_preset ? 'hsl(160 84% 50%)' : 'hsl(185 100% 55%)' }} />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate" style={{ color: 'hsl(210 40% 92%)' }}>
              {lang.name}
            </h3>
            {lang.description && (
              <p className="text-xs truncate mt-0.5" style={{ color: 'hsl(215 20% 45%)' }}>
                {lang.description}
              </p>
            )}
          </div>
        </div>
        {isOwner && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={onEdit} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
              style={{ color: 'hsl(215 20% 50%)' }}>
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleDelete} disabled={isPendingDelete}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-red-500/10"
              style={{ color: 'hsl(215 20% 50%)' }}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Rules */}
      <div className="flex flex-wrap gap-1">
        {(lang.rules ?? []).map((rule, i) => {
          const meta = RULE_TYPES.find(r => r.value === rule.rule_type)
          return (
            <span key={rule.id ?? `${rule.rule_type}-${i}`} className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'hsl(215 25% 14%)', color: 'hsl(215 20% 55%)', border: '1px solid hsl(215 25% 20%)' }}>
              {meta?.emoji} {meta?.label}
            </span>
          )
        })}
        {(lang.rules ?? []).length === 0 && (
          <span className="text-xs" style={{ color: 'hsl(215 20% 35%)' }}>No rules</span>
        )}
      </div>

      {/* Preview + invite */}
      <div className="flex items-center justify-between pt-1 border-t"
        style={{ borderColor: 'hsl(215 25% 12%)' }}>
        <button
          onClick={() => setShowPreview(v => !v)}
          className="text-xs flex items-center gap-1 transition-colors"
          style={{ color: 'hsl(215 20% 45%)' }}>
          {showPreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          Preview
        </button>
        {lang.invite_code && (
          <button onClick={copyCode}
            className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg transition-all"
            style={{
              background: 'hsl(185 100% 50% / 0.08)',
              color: 'hsl(185 100% 60%)',
              border: '1px solid hsl(185 100% 50% / 0.15)',
            }}>
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {lang.invite_code}
          </button>
        )}
      </div>

      {showPreview && (
        <div className="rounded-lg px-3 py-2 text-xs"
          style={{ background: 'hsl(222 47% 5%)', border: '1px solid hsl(215 25% 12%)' }}>
          <div style={{ color: 'hsl(215 20% 40%)' }}>"{previewText}" →</div>
          <div className="encoded-text mt-0.5">"{encoded}"</div>
        </div>
      )}
    </div>
  )
}

function LanguageEditor({ language, onClose, onCreated, onUpdated }) {
  const isNew = !language
  const [name, setName] = useState(language?.name ?? '')
  const [description, setDescription] = useState(language?.description ?? '')
  const [rules, setRules] = useState(language?.rules ?? [])
  const [isPending, startTransition] = useTransition()

  const MAX_RULES = 3

  function addRule(ruleType) {
    if (rules.length >= MAX_RULES) {
      toast.error(`Maximum ${MAX_RULES} rules per language`)
      return
    }
    setRules(prev => [...prev, {
      rule_type: ruleType,
      rule_config: getDefaultConfig(ruleType),
      sort_order: prev.length,
    }])
  }

  function removeRule(index) {
    setRules(prev => prev.filter((_, i) => i !== index).map((r, i) => ({ ...r, sort_order: i })))
  }

  function moveRule(index, direction) {
    setRules(prev => {
      const arr = [...prev]
      const target = index + direction
      if (target < 0 || target >= arr.length) return arr;
      [arr[index], arr[target]] = [arr[target], arr[index]]
      return arr.map((r, i) => ({ ...r, sort_order: i }))
    })
  }

  function updateRuleConfig(index, key, value) {
    setRules(prev => prev.map((r, i) =>
      i === index ? { ...r, rule_config: { ...r.rule_config, [key]: value } } : r
    ))
  }

  function handleSubmit(e) {
    e.preventDefault()
    startTransition(async () => {
      const payload = { name, description, rules }
      let result
      if (isNew) {
        result = await createLanguageAction(payload)
        if (!result.error) {
          const newLang = { ...result.language, rules }
          onCreated(newLang)
          toast.success('Language created!')
        }
      } else {
        result = await updateLanguageAction(language.id, payload)
        if (!result.error) {
          onUpdated({ ...language, name, description, rules })
          toast.success('Language updated!')
        }
      }
      if (result.error) toast.error(result.error)
    })
  }

  const previewText = 'hello world'
  const encoded = encodeMessage(previewText, rules)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card-glass rounded-2xl w-full max-w-lg my-8 shadow-2xl"
        style={{ boxShadow: '0 0 80px hsl(185 100% 50% / 0.1)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b"
          style={{ borderColor: 'hsl(215 25% 14%)' }}>
          <h2 className="font-bold text-lg" style={{ color: 'hsl(210 40% 95%)' }}>
            {isNew ? 'Create Language' : 'Edit Language'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors"
            style={{ color: 'hsl(215 20% 50%)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(215 20% 55%)' }}>
              Language name *
            </label>
            <input
              className="input-field"
              placeholder="e.g. Dragon Tongue"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          {/* Rule builder */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'hsl(215 20% 55%)' }}>
              Transformation Rules <span style={{ color: 'hsl(215 20% 35%)' }}>(applied in order)</span>
            </label>

            {/* Current rules */}
            {rules.length > 0 && (
              <div className="space-y-2 mb-3">
                {rules.map((rule, i) => {
                  const meta = RULE_TYPES.find(r => r.value === rule.rule_type)
                  return (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{ background: 'hsl(222 47% 6%)', border: '1px solid hsl(215 25% 14%)' }}>
                      <span className="text-sm">{meta?.emoji}</span>
                      <span className="text-sm flex-1 font-medium" style={{ color: 'hsl(210 40% 85%)' }}>
                        {meta?.label}
                      </span>
                      {/* Config */}
                      {rule.rule_type === 'caesar_cipher' && (
                        <input
                          type="number" min="1" max="25"
                          value={rule.rule_config?.shift ?? 3}
                          onChange={e => updateRuleConfig(i, 'shift', Number(e.target.value))}
                          className="input-field w-14 text-center text-xs py-1 px-2"
                          title="Shift amount"
                        />
                      )}
                      {rule.rule_type === 'add_prefix' && (
                        <input
                          value={rule.rule_config?.prefix ?? 'sec-'}
                          onChange={e => updateRuleConfig(i, 'prefix', e.target.value)}
                          className="input-field w-20 text-xs py-1 px-2 font-mono"
                          placeholder="prefix"
                        />
                      )}
                      {rule.rule_type === 'add_suffix' && (
                        <input
                          value={rule.rule_config?.suffix ?? '-ix'}
                          onChange={e => updateRuleConfig(i, 'suffix', e.target.value)}
                          className="input-field w-20 text-xs py-1 px-2 font-mono"
                          placeholder="suffix"
                        />
                      )}
                      {rule.rule_type === 'vowel_replace' && (
                        <input
                          value={rule.rule_config?.replacement ?? 'z'}
                          onChange={e => updateRuleConfig(i, 'replacement', e.target.value.slice(0, 3))}
                          className="input-field w-14 text-xs py-1 px-2 font-mono text-center"
                          placeholder="z"
                          maxLength={3}
                        />
                      )}
                      {/* Move up/down */}
                      <button type="button" onClick={() => moveRule(i, -1)} disabled={i === 0}
                        className="w-5 h-5 flex items-center justify-center rounded opacity-50 hover:opacity-100 disabled:opacity-20 transition-opacity"
                        style={{ color: 'hsl(215 20% 55%)' }}>
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button type="button" onClick={() => moveRule(i, 1)} disabled={i === rules.length - 1}
                        className="w-5 h-5 flex items-center justify-center rounded opacity-50 hover:opacity-100 disabled:opacity-20 transition-opacity"
                        style={{ color: 'hsl(215 20% 55%)' }}>
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      <button type="button" onClick={() => removeRule(i)}
                        className="w-5 h-5 flex items-center justify-center rounded transition-colors hover:text-red-400"
                        style={{ color: 'hsl(215 20% 50%)' }}>
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Add rule buttons */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs" style={{ color: 'hsl(215 20% 45%)' }}>Add rules</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full"
                  style={{
                    background: rules.length >= MAX_RULES ? 'hsl(0 84% 40% / 0.15)' : 'hsl(215 25% 12%)',
                    color: rules.length >= MAX_RULES ? 'hsl(0 84% 65%)' : 'hsl(215 20% 50%)',
                    border: `1px solid ${rules.length >= MAX_RULES ? 'hsl(0 84% 40% / 0.3)' : 'hsl(215 25% 18%)'}`,
                  }}>
                  {rules.length} / {MAX_RULES} rules
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {RULE_TYPES.map(rt => {
                  const atLimit = rules.length >= MAX_RULES
                  return (
                    <button
                      key={rt.value}
                      type="button"
                      onClick={() => addRule(rt.value)}
                      disabled={atLimit}
                      className="text-xs px-2.5 py-1.5 rounded-lg transition-all duration-150"
                      style={{
                        background: 'hsl(215 25% 12%)',
                        color: atLimit ? 'hsl(215 20% 30%)' : 'hsl(215 20% 60%)',
                        border: '1px solid hsl(215 25% 18%)',
                        cursor: atLimit ? 'not-allowed' : 'pointer',
                        transform: atLimit ? 'none' : undefined,
                        opacity: atLimit ? 0.4 : 1,
                      }}
                    >
                      {rt.emoji} {rt.label}
                    </button>
                  )
                })}
              </div>
              {rules.length >= MAX_RULES && (
                <p className="text-xs mt-2" style={{ color: 'hsl(0 84% 55%)' }}>
                  Maximum {MAX_RULES} rules reached. Remove a rule to add another.
                </p>
              )}
            </div>
          </div>

          {/* Live preview */}
          {rules.length > 0 && (
            <div className="rounded-xl px-4 py-3"
              style={{ background: 'hsl(222 47% 4%)', border: '1px solid hsl(185 100% 50% / 0.1)' }}>
              <p className="text-xs mb-1.5 flex items-center gap-1.5" style={{ color: 'hsl(215 20% 40%)' }}>
                <Lock className="w-3 h-3" style={{ color: 'hsl(185 100% 50%)' }} />
                Live preview
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span style={{ color: 'hsl(215 20% 50%)' }}>"{previewText}"</span>
                <span style={{ color: 'hsl(215 20% 30%)' }}>→</span>
                <span className="encoded-text">"{encoded}"</span>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={isPending || !name.trim()}
              className="btn-primary flex-1 flex items-center justify-center gap-2">
              {isPending ? (
                <span className="w-4 h-4 border-2 rounded-full animate-spin"
                  style={{ borderColor: 'hsl(222 47% 5% / 0.3)', borderTopColor: 'hsl(222 47% 5%)' }} />
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  {isNew ? 'Create Language' : 'Save Changes'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EmptyState({ onCreateClick }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'hsl(185 100% 50% / 0.08)', border: '1px solid hsl(185 100% 50% / 0.15)' }}>
        <Languages className="w-7 h-7" style={{ color: 'hsl(185 100% 50% / 0.5)' }} />
      </div>
      <h3 className="font-semibold mb-1" style={{ color: 'hsl(215 20% 60%)' }}>No languages yet</h3>
      <p className="text-sm mb-6" style={{ color: 'hsl(215 20% 40%)' }}>
        Create your first secret language or join one with an invite code
      </p>
      <button onClick={onCreateClick} className="btn-primary flex items-center gap-2">
        <Plus className="w-4 h-4" />
        Create a Language
      </button>
    </div>
  )
}

function getDefaultConfig(ruleType) {
  switch (ruleType) {
    case 'caesar_cipher': return { shift: 3 }
    case 'add_prefix': return { prefix: 'sec-' }
    case 'add_suffix': return { suffix: '-ix' }
    case 'vowel_replace': return { replacement: 'z' }
    default: return {}
  }
}
