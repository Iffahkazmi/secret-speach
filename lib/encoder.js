// Secret language encoding/decoding engine

const transformations = {
  reverse_words: {
    encode: (text) => text.split(' ').reverse().join(' '),
    decode: (text) => text.split(' ').reverse().join(' '),
  },

  reverse_letters: {
    encode: (text) => text.split(' ').map(w => w.split('').reverse().join('')).join(' '),
    decode: (text) => text.split(' ').map(w => w.split('').reverse().join('')).join(' '),
  },

  caesar_cipher: {
    encode: (text, config = {}) => {
      const shift = config.shift ?? 3
      return text.split('').map(char => {
        if (!char.match(/[a-zA-Z]/)) return char
        const code = char.charCodeAt(0)
        const isUpper = code >= 65 && code <= 90
        const base = isUpper ? 65 : 97
        return String.fromCharCode(((code - base + shift) % 26 + 26) % 26 + base)
      }).join('')
    },
    decode: (text, config = {}) => {
      const shift = config.shift ?? 3
      return transformations.caesar_cipher.encode(text, { shift: -shift })
    },
  },

  add_prefix: {
    encode: (text, config = {}) => {
      const prefix = config.prefix ?? 'sec-'
      return text.split(' ').map(w => prefix + w).join(' ')
    },
    decode: (text, config = {}) => {
      const prefix = config.prefix ?? 'sec-'
      return text.split(' ').map(w => w.startsWith(prefix) ? w.slice(prefix.length) : w).join(' ')
    },
  },

  add_suffix: {
    encode: (text, config = {}) => {
      const suffix = config.suffix ?? '-ix'
      return text.split(' ').map(w => w + suffix).join(' ')
    },
    decode: (text, config = {}) => {
      const suffix = config.suffix ?? '-ix'
      return text.split(' ').map(w => w.endsWith(suffix) ? w.slice(0, -suffix.length) : w).join(' ')
    },
  },

  vowel_replace: {
    encode: (text, config = {}) => {
      const r = config.replacement ?? 'z'
      return text.replace(/[aeiouAEIOU]/g, m => m === m.toUpperCase() ? r.toUpperCase() : r)
    },
    decode: (text) => text, // lossy — cannot reverse
  },

  pig_latin: {
    encode: (text) => text.split(' ').map(word => {
      if (!word.match(/[a-zA-Z]/)) return word
      const firstVowel = word.match(/[aeiouAEIOU]/)
      if (!firstVowel) return word + 'ay'
      const idx = word.indexOf(firstVowel[0])
      if (idx === 0) return word + 'yay'
      return word.slice(idx) + word.slice(0, idx) + 'ay'
    }).join(' '),
    decode: (text) => {
      const validClusters = new Set([
        'b','c','d','f','g','h','j','k','l','m','n','p','q','r','s','t','v','w','x','y','z',
        'bl','br','ch','cl','cr','dr','fl','fr','gl','gr','ph','pl','pr','sc','sh','sk','sl',
        'sm','sn','sp','st','sw','th','tr','tw','wh','wr','chr','sch','scr','shr','str','thr',
      ])
      return text.split(' ').map(word => {
        if (!word.match(/[a-zA-Z]/)) return word
        if (word.endsWith('yay')) return word.slice(0, -3)
        if (word.endsWith('ay')) {
          const base = word.slice(0, -2)
          for (let len = Math.min(3, base.length); len >= 1; len--) {
            const cluster = base.slice(-len)
            const rest = base.slice(0, -len)
            if (!cluster.match(/[aeiouAEIOU]/) && rest.length > 0 &&
                'aeiouAEIOU'.includes(rest[0]) && validClusters.has(cluster.toLowerCase())) {
              return cluster + rest
            }
          }
          return base
        }
        return word
      }).join(' ')
    },
  },

  word_scramble: {
    encode: (text) => text.split(' ').map(word => {
      if (word.length <= 3) return word
      const chars = word.split('')
      const first = chars[0]
      const last = chars[chars.length - 1]
      const middle = chars.slice(1, -1).sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0))
      return first + middle.join('') + last
    }).join(' '),
    decode: (text) => text, // lossy
  },
}

export const RULE_TYPES = [
  { value: 'reverse_words',   label: 'Reverse Words',    emoji: '🔀', description: 'Flip the order of words' },
  { value: 'reverse_letters', label: 'Reverse Letters',  emoji: '🔄', description: 'Reverse letters in each word' },
  { value: 'caesar_cipher',   label: 'Caesar Cipher',    emoji: '🔐', description: 'Shift letters by N positions' },
  { value: 'add_prefix',      label: 'Add Prefix',       emoji: '➡️',  description: 'Prepend text to each word' },
  { value: 'add_suffix',      label: 'Add Suffix',       emoji: '⬅️',  description: 'Append text to each word' },
  { value: 'vowel_replace',   label: 'Vowel Replace',    emoji: '🔤', description: 'Replace vowels with a character' },
  { value: 'pig_latin',       label: 'Pig Latin',        emoji: '🐷', description: 'Classic pig latin transform' },
  { value: 'word_scramble',   label: 'Word Scramble',    emoji: '🎲', description: 'Scramble middle letters' },
]

export function encodeMessage(text, rules) {
  return [...rules]
    .sort((a, b) => a.sort_order - b.sort_order)
    .reduce((result, rule) => {
      const t = transformations[rule.rule_type]
      if (!t) return result
      return t.encode(result, rule.rule_config ?? {})
    }, text)
}

export function decodeMessage(text, rules) {
  return [...rules]
    .sort((a, b) => b.sort_order - a.sort_order)
    .reduce((result, rule) => {
      const t = transformations[rule.rule_type]
      if (!t) return result
      return t.decode(result, rule.rule_config ?? {})
    }, text)
}
