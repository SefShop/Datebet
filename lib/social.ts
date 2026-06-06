// ─────────────────────────────────────────────────────────────────
// Social Presence Engine — fake but convincing. Bilingual.
// Makes the app feel alive with other users.
// ─────────────────────────────────────────────────────────────────
import type { Lang } from '@/lib/copy'

function pick<T>(a:T[]):T { return a[Math.floor(Math.random()*a.length)] }
function rand(min:number,max:number){ return min+Math.floor(Math.random()*(max-min+1)) }

// ── Names pool ──────────────────────────────────────────────────
const NAMES = ['Anna','Chris','Naya','Demi','Leo','Sofia','Elena','Maria','Iro','Alex','Nikos','Kostas','Mika','Thanos']

// ── Online count ────────────────────────────────────────────────
let _count = rand(95,180)
export function getOnlineCount(): number {
  _count += rand(-8,12)
  _count = Math.max(80, Math.min(240, _count))
  return _count
}

// ── Activity feed lines ─────────────────────────────────────────
const TEMPLATES: Record<Lang, string[]> = {
  en: [
    '{name} just started a game',
    '{name} connected with {name2}',
    '{name} is playing right now',
    'Someone just locked a date',
    '{name} sent a message',
    '{name} is online now',
    '{name} just joined',
    'A new connection just formed',
    '{name} won a game against {name2}',
  ],
  gr: [
    'Ο/Η {name} μόλις ξεκίνησε παιχνίδι',
    'Ο/Η {name} συνδέθηκε με τον/την {name2}',
    'Ο/Η {name} παίζει τώρα',
    'Κάποιος μόλις κλείδωσε ραντεβού',
    'Ο/Η {name} έστειλε μήνυμα',
    'Ο/Η {name} μόλις μπήκε online',
    'Ο/Η {name} μόλις εγγράφηκε',
    'Νέα σύνδεση μόλις έγινε',
    'Ο/Η {name} κέρδισε τον/την {name2}',
  ],
}

export function getActivityLine(lang: Lang): string {
  const t = pick(TEMPLATES[lang])
  const n1 = pick(NAMES)
  let n2 = pick(NAMES.filter(n => n !== n1))
  return t.replace('{name2}', n2).replace('{name}', n1)
}

// ── Status text ─────────────────────────────────────────────────
export function getStatus(online: boolean, lang: Lang): string {
  if (online) return lang==='gr' ? 'online τώρα' : 'online now'
  const opts = lang==='gr'
    ? ['πριν 2 λεπτά','πριν 5 λεπτά','πριν 10 λεπτά','πρόσφατα']
    : ['active 2m ago','active 5m ago','active 10m ago','recently']
  return pick(opts)
}

// ── Notification lines ──────────────────────────────────────────
export function getNotification(lang: Lang): string {
  const lines = lang==='gr'
    ? [`Η ${pick(NAMES)} μόλις μπήκε online`,`Κάποιος είδε το προφίλ σου`,`Νέα σύνδεση σε περιμένει`,`Η ${pick(NAMES)} σε είδε`]
    : [`${pick(NAMES)} is online now`,`Someone viewed your profile`,`New connection found`,`${pick(NAMES)} viewed your profile`]
  return pick(lines)
}
