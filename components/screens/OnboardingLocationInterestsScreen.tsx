'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  /** Called only after interests have been written to the existing
   * `profiles` row and confirmed via a re-select. The locked onboarding
   * sequence is Welcome (1, now also handling location + notification
   * permission setup internally) → About You (2) → Who You're
   * Interested In (3) → Interests (this screen, Step 4) → Photos (5) →
   * About You/Bio (6) → Preferences (7).
   *
   * ROUND E1 CHANGE: this screen used to also collect location (device
   * geolocation or manual city). That entire flow has MOVED to Step 1
   * (components/screens/OnboardingWelcomeScreen.tsx) — it still exists,
   * unchanged in mechanism, just earlier in onboarding. This screen is
   * now interests-only. `profiles.interests` is written using the same
   * canonical, language-neutral keys used throughout this screen — this
   * is still the ONE shared interests vocabulary, also consumed by
   * EditProfileScreen.tsx. On mount, any already-saved interests are
   * hydrated back in (never overwriting a selection already made this
   * session). */
  onNext: () => void
}

type InterestKey = 'gaming' | 'music' | 'travel' | 'movies' | 'sports' | 'food' | 'art' | 'books'

// The "+" button's "More interests" panel adds these on top of the main
// 8 — never replacing them. Deliberately excludes alcohol/drinking
// categories per explicit instruction.
type ExtraInterestKey =
  | 'photography' | 'hiking' | 'fitness' | 'dancing' | 'cooking' | 'animals'
  | 'technology' | 'startups' | 'reading' | 'writing' | 'nature'
  | 'spirituality' | 'cars' | 'diy_crafts' | 'history'

// The main grid and the "More interests" panel both read/write ONE
// combined Set of this type, so "Gaming + Photography" really does count
// as 2 selected interests, and Continue's gating (`selected.size > 0`)
// naturally covers both groups without any special-casing.
type AnyInterestKey = InterestKey | ExtraInterestKey

// ── Icons — plain inline SVG line-art, no emoji, matching the thin-stroke
// treatment already established on Steps 1-3. Self-contained here (not
// imported from the locked Step 1/2/3 files) even though the style echoes
// them. ──
function GamingIcon({ color }: { color: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 8.5h11a3.5 3.5 0 0 1 3.42 4.24l-.63 2.9a2.3 2.3 0 0 1-4.2.8L15 14.5H9l-1.09 1.94a2.3 2.3 0 0 1-4.2-.8l-.63-2.9A3.5 3.5 0 0 1 6.5 8.5z" />
      <line x1="7.2" y1="10.8" x2="7.2" y2="13.2" />
      <line x1="6" y1="12" x2="8.4" y2="12" />
      <circle cx="14.5" cy="11" r="0.9" fill={color} stroke="none" />
      <circle cx="16.8" cy="13" r="0.9" fill={color} stroke="none" />
    </svg>
  )
}
function MusicIcon({ color }: { color: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="17.5" r="2.3" />
      <circle cx="16.5" cy="15.5" r="2.3" />
      <line x1="9.3" y1="17.5" x2="9.3" y2="6" />
      <line x1="18.8" y1="15.5" x2="18.8" y2="4" />
      <path d="M9.3 6 18.8 4" />
      <path d="M9.3 9 18.8 7" />
    </svg>
  )
}
function TravelIcon({ color }: { color: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 3.5 3.5 9l3 1 2-1.4v5l-2 1.5v1.4l3.5-1.3 3.5 1.3v-1.4l-2-1.5v-5l2 1.4 3-1L13 3.5a1 1 0 0 0-2 0z" />
    </svg>
  )
}
function MoviesIcon({ color }: { color: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10.5 5 5.5l14 2.8-1 5z" />
      <rect x="3.5" y="10.5" width="17" height="8" rx="1.3" />
      <line x1="8.3" y1="6.4" x2="9.7" y2="10.5" />
      <line x1="12.6" y1="7.2" x2="14" y2="10.5" />
      <line x1="16.9" y1="8" x2="18.3" y2="10.5" />
    </svg>
  )
}
function SportsIcon({ color }: { color: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8.2 15 10.5 13.8 14h-3.6L9 10.5z" />
      <path d="M12 8.2V5.3" />
      <path d="M15 10.5l2.7-1.2" />
      <path d="M13.8 14l1.6 2.6" />
      <path d="M10.2 16.6l1.6-2.6" />
      <path d="M9 10.5 6.3 9.3" />
    </svg>
  )
}
function FoodIcon({ color }: { color: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3v7a2 2 0 0 0 2 2v9" />
      <path d="M7 3v6M9 3v6" />
      <path d="M17 3c-1.5 0-2.5 1.6-2.5 4.5S15.5 12 17 12v9" />
    </svg>
  )
}
function ArtIcon({ color }: { color: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.5c-4.7 0-8.5 3.6-8.5 8s3.4 5 5 4c1-.6.3-1.8 1.1-2.4.8-.6 3.3 0 4.9-1 1.8-1.1 3-3 3-5.1 0-1.9-2.4-3.5-5.5-3.5z" />
      <circle cx="8.3" cy="10.3" r="0.9" fill={color} stroke="none" />
      <circle cx="11.3" cy="7.6" r="0.9" fill={color} stroke="none" />
      <circle cx="14.8" cy="8.6" r="0.9" fill={color} stroke="none" />
    </svg>
  )
}
function BooksIcon({ color }: { color: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6.2c-1.6-1-4-1.4-6.5-1V17c2.5-.4 4.9 0 6.5 1" />
      <path d="M12 6.2c1.6-1 4-1.4 6.5-1V17c-2.5-.4-4.9 0-6.5 1V6.2z" />
    </svg>
  )
}
function PlusIcon({ color }: { color: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
function CheckIcon({ color }: { color: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12.5 9.5 18 20 6.5" />
    </svg>
  )
}
function CloseIcon({ color }: { color: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  )
}

// ── "More interests" panel icons — same thin-stroke line-art language as
// the main 8. Kept intentionally simple/abstract rather than literal, in
// the same spirit as the icons above. ──
function PhotographyIcon({ color }: { color: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8.5h3l1.5-2h7l1.5 2h3v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <circle cx="12" cy="13.5" r="3.3" />
    </svg>
  )
}
function HikingIcon({ color }: { color: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 19 10 6l2.4 4.3" />
      <path d="M11 19 15.5 9l5 10" />
      <path d="M8.3 15h3.5" />
    </svg>
  )
}
function FitnessIcon({ color }: { color: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 12h2M18.5 12h2" />
      <path d="M6 9v6M18 9v6" />
      <path d="M8.5 12h7" />
    </svg>
  )
}
function DancingIcon({ color }: { color: string }) {
  // A simple 4-point sparkle/star — the same abstract "energy" mark used
  // for Dancing in the reference concept.
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.5c.6 3.4 2.1 4.9 5.5 5.5-3.4.6-4.9 2.1-5.5 5.5-.6-3.4-2.1-4.9-5.5-5.5 3.4-.6 4.9-2.1 5.5-5.5z" />
      <path d="M18 16.5c.3 1.4.9 2 2.3 2.3-1.4.3-2 .9-2.3 2.3-.3-1.4-.9-2-2.3-2.3 1.4-.3 2-.9 2.3-2.3z" />
    </svg>
  )
}
function CookingIcon({ color }: { color: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12c0-3.5 2.9-6.2 6.5-6.5C11.9 4.4 12.9 3.5 14 3.5c1.2 0 2 1 2 2.1 0 .4-.1.8-.3 1.1 2.3.9 3.8 3 3.8 5.3z" />
      <path d="M4.5 12h15" />
      <path d="M6 15.5h12l-1 3.5a1.5 1.5 0 0 1-1.4 1H8.4a1.5 1.5 0 0 1-1.4-1z" />
    </svg>
  )
}
function AnimalsIcon({ color }: { color: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8.2" cy="8.5" r="1.6" />
      <circle cx="15.8" cy="8.5" r="1.6" />
      <circle cx="5.3" cy="12.8" r="1.5" />
      <circle cx="18.7" cy="12.8" r="1.5" />
      <path d="M12 12.2c-2.6 0-4.6 1.9-4.6 3.9 0 1.5 1.2 2.4 2.6 2 .7-.2 1.3-.4 2-.4s1.3.2 2 .4c1.4.4 2.6-.5 2.6-2 0-2-2-3.9-4.6-3.9z" />
    </svg>
  )
}
function TechnologyIcon({ color }: { color: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="5.5" width="16" height="10" rx="1.3" />
      <path d="M2.5 19h19" />
    </svg>
  )
}
function StartupsIcon({ color }: { color: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.5c2.5 2 4 5.3 4 9 0 2-1 4-1.8 5l-.3-2.5-1.9 1.6-1.9-1.6-.3 2.5c-.8-1-1.8-3-1.8-5 0-3.7 1.5-7 4-9z" />
      <circle cx="12" cy="10.5" r="1.4" />
      <path d="M8.3 16.5 6 20M15.7 16.5 18 20" />
    </svg>
  )
}
function ReadingIcon({ color }: { color: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5.5c-1.8-1.3-4.3-1.5-6.5-1v13c2.2-.5 4.7-.3 6.5 1 1.8-1.3 4.3-1.5 6.5-1v-13c-2.2-.5-4.7-.3-6.5 1z" />
      <path d="M12 5.5v13" />
    </svg>
  )
}
function WritingIcon({ color }: { color: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4.5 19 9l-9.5 9.5-5 1 1-5z" />
      <path d="M13 6l4.5 4.5" />
    </svg>
  )
}
function NatureIcon({ color }: { color: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18.5 5.5c0 7-3.5 12-9 12-2 0-3.5-1-3.5-2.6 0-6 6-9.4 12.5-9.4z" />
      <path d="M9.5 17.5c0-4.5 2.5-8 6-10" />
    </svg>
  )
}
function SpiritualityIcon({ color }: { color: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20c-4-2.5-6.5-4.6-6.5-8.3 2.4 0 4.6 1 6.5 3.3 1.9-2.3 4.1-3.3 6.5-3.3 0 3.7-2.5 5.8-6.5 8.3z" />
      <path d="M12 11.7c0-3.4 1.4-6 3.5-8.2" />
      <path d="M12 11.7c0-3.4-1.4-6-3.5-8.2" />
    </svg>
  )
}
function CarsIcon({ color }: { color: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15.5 5.3 10a2 2 0 0 1 1.9-1.5h9.6a2 2 0 0 1 1.9 1.5l1.3 5.5" />
      <path d="M3.5 15.5h17v3a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1h-11v1a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1z" />
      <circle cx="7" cy="15.5" r="0.2" fill={color} stroke="none" />
      <circle cx="17" cy="15.5" r="0.2" fill={color} stroke="none" />
    </svg>
  )
}
function DiyCraftsIcon({ color }: { color: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="6.5" r="2.2" />
      <circle cx="7" cy="17.5" r="2.2" />
      <line x1="8.6" y1="8" x2="19" y2="18.5" />
      <line x1="8.6" y1="16" x2="19" y2="5.5" />
    </svg>
  )
}
function HistoryIcon({ color }: { color: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8 12 4l8 4" />
      <line x1="5" y1="8" x2="19" y2="8" />
      <line x1="6.5" y1="8" x2="6.5" y2="17" />
      <line x1="11.3" y1="8" x2="11.3" y2="17" />
      <line x1="16.1" y1="8" x2="16.1" y2="17" />
      <line x1="4" y1="19.5" x2="20" y2="19.5" />
      <line x1="4.5" y1="17" x2="19.5" y2="17" />
    </svg>
  )
}

const INTERESTS: { key: InterestKey; label: string; icon: (c: string) => React.ReactNode }[] = [
  { key: 'gaming', label: 'Gaming', icon: (c) => <GamingIcon color={c} /> },
  { key: 'music', label: 'Music', icon: (c) => <MusicIcon color={c} /> },
  { key: 'travel', label: 'Travel', icon: (c) => <TravelIcon color={c} /> },
  { key: 'movies', label: 'Movies', icon: (c) => <MoviesIcon color={c} /> },
  { key: 'sports', label: 'Sports', icon: (c) => <SportsIcon color={c} /> },
  { key: 'food', label: 'Food', icon: (c) => <FoodIcon color={c} /> },
  { key: 'art', label: 'Art', icon: (c) => <ArtIcon color={c} /> },
  { key: 'books', label: 'Books', icon: (c) => <BooksIcon color={c} /> },
]

// The "+" panel's extra interests. These are ADDITIONAL to the 8 above —
// the main grid is never replaced. Deliberately excludes alcohol/drinking
// categories (e.g. no "Wine") per explicit instruction, even though the
// visual reference image includes one — the same "trust the explicit
// text over an imprecise reference image" precedent used throughout this
// project. All of these share ONE combined selection Set with the main 8
// (see AnyInterestKey / `selected` below).
const EXTRA_INTERESTS: { key: ExtraInterestKey; label: string; icon: (c: string) => React.ReactNode }[] = [
  { key: 'photography', label: 'Photography', icon: (c) => <PhotographyIcon color={c} /> },
  { key: 'hiking', label: 'Hiking', icon: (c) => <HikingIcon color={c} /> },
  { key: 'fitness', label: 'Fitness', icon: (c) => <FitnessIcon color={c} /> },
  { key: 'dancing', label: 'Dancing', icon: (c) => <DancingIcon color={c} /> },
  { key: 'cooking', label: 'Cooking', icon: (c) => <CookingIcon color={c} /> },
  { key: 'animals', label: 'Animals', icon: (c) => <AnimalsIcon color={c} /> },
  { key: 'technology', label: 'Technology', icon: (c) => <TechnologyIcon color={c} /> },
  { key: 'startups', label: 'Startups', icon: (c) => <StartupsIcon color={c} /> },
  { key: 'reading', label: 'Reading', icon: (c) => <ReadingIcon color={c} /> },
  { key: 'writing', label: 'Writing', icon: (c) => <WritingIcon color={c} /> },
  { key: 'nature', label: 'Nature', icon: (c) => <NatureIcon color={c} /> },
  { key: 'spirituality', label: 'Spirituality', icon: (c) => <SpiritualityIcon color={c} /> },
  { key: 'cars', label: 'Cars', icon: (c) => <CarsIcon color={c} /> },
  { key: 'diy_crafts', label: 'DIY & Crafts', icon: (c) => <DiyCraftsIcon color={c} /> },
  { key: 'history', label: 'History', icon: (c) => <HistoryIcon color={c} /> },
]

export default function OnboardingLocationInterestsScreen({ onNext }: Props) {
  // ONE combined Set for the main 8 chips AND the "More interests" panel's
  // 15 extra options — see AnyInterestKey above.
  const [selected, setSelected] = useState<Set<AnyInterestKey>>(new Set())
  // Controls the "More interests" bottom-sheet panel only. Selections
  // themselves live in `selected` above, which this panel never resets —
  // closing (Done, X, or backdrop tap) simply hides the panel, so
  // re-opening it later in the same Step 4 session shows the same
  // checked items.
  const [panelOpen, setPanelOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const selectedRef = useRef(selected); selectedRef.current = selected

  // ── Resume safety: hydrate interests from the EXISTING profile (if
  // any) so leaving mid-Step-4 and coming back doesn't lose them.
  // Read-only — no write happens until Continue. ──
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (cancelled || !user) return
        const { data } = await supabase.from('profiles').select('interests').eq('id', user.id).maybeSingle()
        if (cancelled || !data) return
        if (Array.isArray(data.interests) && data.interests.length > 0 && selectedRef.current.size === 0) {
          setSelected(new Set(data.interests as AnyInterestKey[]))
        }
      } catch (err) {
        console.error('ONBOARDING INTERESTS: load existing failed', err)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const toggle = (key: AnyInterestKey) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // selected.size already covers BOTH the main 8 and the panel's 15 extra
  // interests, since they share one combined Set — no special-casing
  // needed for Continue's gating.
  const canContinue = selected.size > 0 && !submitting
  const extraSelectedCount = EXTRA_INTERESTS.reduce((n, item) => n + (selected.has(item.key) ? 1 : 0), 0)

  async function handleContinue() {
    if (!canContinue || submitting) return
    setSubmitting(true)
    setSubmitError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSubmitError("We couldn't confirm you're signed in. Please try again.")
      setSubmitting(false)
      return
    }

    const finalInterests = Array.from(selected)

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ interests: finalInterests })
      .eq('id', user.id)

    if (updateErr) {
      console.error('ONBOARDING INTERESTS: profile update failed', updateErr)
      setSubmitError("We couldn't save your interests. Please check your connection and try again.")
      setSubmitting(false)
      return
    }

    // Verify, the same way this screen has always confirmed its own
    // save — an immediate re-select rather than trusting the update call
    // alone. `interests` is a safe/public column (plain select) — no
    // privacy-locked field is involved on this screen anymore.
    const { data: verify, error: verifyErr } = await supabase
      .from('profiles').select('interests').eq('id', user.id).maybeSingle()

    const verifiedInterests: string[] = Array.isArray(verify?.interests) ? verify.interests : []
    const interestsMatch = verifiedInterests.length === finalInterests.length &&
      finalInterests.every(k => verifiedInterests.includes(k))

    if (verifyErr || !verify || !interestsMatch) {
      console.error('ONBOARDING INTERESTS: post-save verification failed', verifyErr, verify)
      setSubmitError("We couldn't confirm your interests saved. Please try again.")
      setSubmitting(false)
      return
    }

    onNext()
  }

  function Chip({ item }: { item: typeof INTERESTS[number] }) {
    const isSelected = selected.has(item.key)
    return (
      <button type="button" onClick={() => toggle(item.key)}
        className="flex-1 flex items-center cursor-pointer transition-all active:scale-[0.97]"
        style={{
          borderRadius: 14, gap: 10,
          paddingLeft: 14, paddingRight: 14,
          paddingTop: 'var(--ol-chip-pad-y)', paddingBottom: 'var(--ol-chip-pad-y)',
          background: isSelected ? 'rgba(255,51,132,0.12)' : 'rgba(255,255,255,0.03)',
          border: isSelected ? '1.5px solid #ff3384' : '1.5px solid rgba(255,51,132,0.3)',
          boxShadow: isSelected ? '0 0 16px rgba(255,51,132,0.35)' : 'none',
        }}>
        <span style={{ fontSize: 'var(--ol-chip-icon)', display: 'flex', color: isSelected ? '#ff5fa0' : 'rgba(255,51,132,0.7)' }}>
          {item.icon(isSelected ? '#ff5fa0' : 'rgba(255,51,132,0.7)')}
        </span>
        <span className="font-bold" style={{ fontSize: 'var(--ol-chip-label-size)', color: isSelected ? '#fff' : 'rgba(255,255,255,0.75)' }}>
          {item.label}
        </span>
      </button>
    )
  }

  return (
    <div className="dd-onboard-location relative flex flex-col h-full overflow-hidden" style={{ background: '#09090f' }}>
      {/* Same premium near-black base + subtle brand glow as every other
          onboarding screen (Welcome, About You, Who You're Interested In). */}
      <div className="absolute inset-0" style={{ background: '#08070a' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 40% at 50% 20%, rgba(255,51,132,0.15) 0%, transparent 62%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 45% at 80% 60%, rgba(139,123,255,0.1) 0%, transparent 60%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 45% at 15% 75%, rgba(139,123,255,0.07) 0%, transparent 60%)' }} />
      </div>

      <div className="relative z-10 flex flex-col h-full px-4 mx-auto w-full"
        style={{ maxWidth: 390, paddingTop: 'var(--ol-outer-pad-top)', paddingBottom: 'var(--ol-outer-pad-bottom)' }}>

        {/* Step badge + 7-segment progress — same design system and same
            single-highlight convention as every other onboarding screen:
            only the current step's own segment (index 3, the 4th) is
            filled pink; every other segment — including steps already
            passed — stays inactive gray. No cumulative fill, no glow. */}
        <div className="flex items-center flex-shrink-0" style={{ gap: 'var(--ol-badge-gap)' }}>
          <div className="flex items-center justify-center flex-shrink-0 font-extrabold text-white"
            style={{
              width: 'var(--ol-badge-s)', height: 'var(--ol-badge-s)', borderRadius: '50%',
              background: '#ff2d7a', fontSize: 'var(--ol-badge-font)',
              fontFamily: "'Plus Jakarta Sans',sans-serif",
            }}>4</div>
          <div className="flex flex-1" style={{ gap: 'var(--ol-progress-gap)' }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1" style={{
                height: 'var(--ol-progress-h)', borderRadius: 999,
                background: i === 3 ? 'linear-gradient(90deg,#ff3384,#ff5fa0)' : 'rgba(255,255,255,0.1)',
              }} />
            ))}
          </div>
        </div>

        {/* Form content — top-anchored like the other onboarding steps,
            with Continue pinned to the bottom of the remaining space via
            marginTop:auto. */}
        <div className="flex-1 flex flex-col min-h-0" style={{ marginTop: 'var(--ol-gap-tc)' }}>

          <div className="text-center flex-shrink-0">
            <h1 className="font-extrabold text-white" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 'var(--ol-title-size)' }}>
              Interests
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'var(--ol-sub-size)', lineHeight: 1.4, marginTop: 'var(--ol-gap-ts)' }}>
              Pick a few things you're into — it helps us<br />show you more compatible people.
            </p>
          </div>

          {/* Interests — multi-select. Tapping a selected chip again
              deselects it; any number (including zero, which simply
              keeps Continue disabled) may be selected. */}
          <div className="flex-shrink-0" style={{ marginTop: 'var(--ol-gap-sl)' }}>
            <div className="flex flex-col" style={{ gap: 'var(--ol-chip-gap)' }}>
              {[0, 1, 2].map(rowIdx => (
                <div key={rowIdx} className="flex" style={{ gap: 'var(--ol-chip-gap)' }}>
                  <Chip item={INTERESTS[rowIdx * 2]} />
                  <Chip item={INTERESTS[rowIdx * 2 + 1]} />
                </div>
              ))}
              {/* Last row: Art fills its own column; Books shares its
                  column with the "+" button, exactly matching the
                  MASTER's narrower final chip beside a small square add
                  control. */}
              <div className="flex" style={{ gap: 'var(--ol-chip-gap)' }}>
                <Chip item={INTERESTS[6]} />
                <div className="flex-1 flex items-center" style={{ gap: 'var(--ol-chip-gap)' }}>
                  <Chip item={INTERESTS[7]} />
                  {/* "+" — opens the "More interests" bottom-sheet panel
                      (see the panel JSX near the end of this component).
                      Its own selections live in the same combined
                      `selected` Set as the main 8 chips, so this button
                      lights up pink with a small count badge once at
                      least one extra interest has been chosen — a quiet
                      confirmation that something is selected behind it. */}
                  <button type="button" onClick={() => setPanelOpen(true)}
                    aria-label="More interests" aria-haspopup="dialog" aria-expanded={panelOpen}
                    className="relative flex items-center justify-center flex-shrink-0 cursor-pointer transition-all active:scale-[0.94]"
                    style={{
                      width: 'var(--ol-plus-size)', height: 'var(--ol-plus-size)', borderRadius: 12,
                      background: extraSelectedCount > 0 ? 'rgba(255,51,132,0.12)' : 'rgba(255,255,255,0.03)',
                      border: extraSelectedCount > 0 ? '1.5px solid #ff3384' : '1.5px solid rgba(255,255,255,0.15)',
                      color: extraSelectedCount > 0 ? '#ff5fa0' : 'rgba(255,255,255,0.4)',
                      fontSize: 'calc(var(--ol-plus-size) * 0.45)',
                    }}>
                    <PlusIcon color={extraSelectedCount > 0 ? '#ff5fa0' : 'rgba(255,255,255,0.4)'} />
                    {extraSelectedCount > 0 && (
                      <span className="absolute flex items-center justify-center font-bold"
                        style={{
                          top: -6, right: -6, minWidth: 16, height: 16, borderRadius: 999, paddingLeft: 3, paddingRight: 3,
                          background: '#ff3384', color: '#fff', fontSize: 10, lineHeight: '16px',
                          boxShadow: '0 0 8px rgba(255,51,132,0.6)',
                        }}>
                        {extraSelectedCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {submitError && (
            <div className="px-3 py-1.5 rounded-lg flex-shrink-0"
              style={{
                marginTop: 10, fontSize: 12,
                background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.12)',
              }}>
              {submitError}
            </div>
          )}

          {/* CTA — pinned to the bottom of the remaining space, same
              pattern as every other onboarding step's Continue button. */}
          <button onClick={handleContinue} disabled={!canContinue}
            className="w-full rounded-2xl font-bold transition-all active:scale-[0.97] cursor-pointer flex-shrink-0 disabled:cursor-not-allowed"
            style={{
              marginTop: 'auto',
              paddingTop: 'var(--ol-cta-pad-y)', paddingBottom: 'var(--ol-cta-pad-y)',
              fontSize: 'var(--ol-cta-size)', fontFamily: "'Plus Jakarta Sans',sans-serif",
              background: canContinue
                ? 'linear-gradient(135deg, #ff3384 0%, #d84dd8 50%, #7c72ff 100%)'
                : 'rgba(255,255,255,0.08)',
              color: canContinue ? '#fff' : 'rgba(255,255,255,0.3)',
              boxShadow: canContinue ? '0 12px 36px rgba(253,41,123,0.354), 0 0 50px rgba(200,80,192,0.094)' : 'none',
            }}>
            {submitting ? 'Saving…' : 'Continue'}
          </button>
        </div>
      </div>

      {/* "More interests" panel — a fixed full-viewport overlay + bottom
          sheet, so it sits on top of Step 4 without affecting Step 4's
          own layout/zero-scroll at all (it is not part of the flex
          column above). The sheet's own list scrolls independently
          (overflow-y-auto with its own bounded height); the Step 4 page
          behind it stays exactly as it was — it doesn't scroll and isn't
          re-laid-out while this is open. Done, the X, and tapping the
          backdrop all just hide the panel; none of them clear
          `selected`, so re-opening later in this Step 4 session shows
          the same checked items. */}
      {panelOpen && (
        <div className="absolute inset-0 flex flex-col justify-end" style={{ zIndex: 50 }}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setPanelOpen(false)} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-label="More interests"
            className="relative flex flex-col"
            style={{
              maxHeight: '82%', borderTopLeftRadius: 24, borderTopRightRadius: 24,
              background: '#0d0c12', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none',
              boxShadow: '0 -20px 60px rgba(0,0,0,0.5)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              overscrollBehavior: 'contain',
            }}>
            {/* Drag-handle affordance (decorative — panel is closed via
                Done/X/backdrop, not a real drag gesture, in this round). */}
            <div className="flex-shrink-0 flex justify-center" style={{ paddingTop: 10, paddingBottom: 4 }}>
              <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.2)' }} />
            </div>

            <div className="flex-shrink-0 flex items-start justify-between" style={{ padding: '10px 20px 14px' }}>
              <div>
                <h2 className="font-extrabold text-white" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 20 }}>
                  More interests
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 3 }}>
                  Select any that apply to you
                </p>
              </div>
              <button type="button" onClick={() => setPanelOpen(false)} aria-label="Close"
                className="flex items-center justify-center flex-shrink-0 cursor-pointer transition-all active:scale-[0.92]"
                style={{
                  width: 32, height: 32, borderRadius: '50%', marginLeft: 12,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.7)', fontSize: 15,
                }}>
                <CloseIcon color="rgba(255,255,255,0.7)" />
              </button>
            </div>

            {/* Independently scrollable list — this is the one place on
                this screen that is intentionally allowed to scroll. */}
            <div className="flex-1 min-h-0" style={{ overflowY: 'auto', padding: '2px 20px 4px', WebkitOverflowScrolling: 'touch' }}>
              <div className="flex flex-col" style={{ gap: 10 }}>
                {EXTRA_INTERESTS.map(item => {
                  const isSelected = selected.has(item.key)
                  return (
                    <button key={item.key} type="button" onClick={() => toggle(item.key)}
                      className="w-full flex items-center cursor-pointer transition-all active:scale-[0.98]"
                      style={{
                        borderRadius: 14, gap: 12, paddingLeft: 16, paddingRight: 14,
                        paddingTop: 13, paddingBottom: 13,
                        background: isSelected ? 'rgba(255,51,132,0.12)' : 'rgba(255,255,255,0.03)',
                        border: isSelected ? '1.5px solid #ff3384' : '1.5px solid rgba(255,255,255,0.1)',
                        boxShadow: isSelected ? '0 0 16px rgba(255,51,132,0.3)' : 'none',
                      }}>
                      <span style={{ fontSize: 19, display: 'flex', flexShrink: 0, color: isSelected ? '#ff5fa0' : 'rgba(255,51,132,0.7)' }}>
                        {item.icon(isSelected ? '#ff5fa0' : 'rgba(255,51,132,0.7)')}
                      </span>
                      <span className="font-bold flex-1 text-left" style={{ fontSize: 14.5, color: isSelected ? '#fff' : 'rgba(255,255,255,0.75)' }}>
                        {item.label}
                      </span>
                      <span className="flex items-center justify-center flex-shrink-0"
                        style={{
                          width: 22, height: 22, borderRadius: '50%',
                          background: isSelected ? '#ff3384' : 'transparent',
                          border: isSelected ? 'none' : '1.5px solid rgba(255,255,255,0.25)',
                          color: '#fff', fontSize: 13,
                        }}>
                        {isSelected && <CheckIcon color="#fff" />}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Extra bottom clearance (beyond the safe-area inset already
                applied to the sheet) so Done never sits under the
                floating bottom-left "N" control during local/dev
                testing — the same clearance philosophy the main Step 4
                Continue button already uses via --ol-outer-pad-bottom. */}
            <div className="flex-shrink-0" style={{ padding: '14px 20px 58px' }}>
              <button type="button" onClick={() => setPanelOpen(false)}
                className="w-full rounded-2xl font-bold transition-all active:scale-[0.97] cursor-pointer"
                style={{
                  paddingTop: 15, paddingBottom: 15, fontSize: 16, fontFamily: "'Plus Jakarta Sans',sans-serif",
                  background: 'linear-gradient(135deg, #ff3384 0%, #d84dd8 50%, #7c72ff 100%)',
                  color: '#fff', boxShadow: '0 12px 36px rgba(253,41,123,0.354), 0 0 50px rgba(200,80,192,0.094)',
                }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* Same 3-MODE height-responsive philosophy as the other onboarding
           screens: MODE A (>=900px) flat base values, MODE B (700-899px)
           a fluid clamp(MIN, calc(A+Cdvh), MAX) anchored at 700/860, MODE
           C (<700px) a second clamp anchored at 600/700 whose ceiling
           equals MODE B's own 700px floor for a continuous tier
           boundary. Badge/progress vars reuse the exact same numbers as
           the other onboarding screens. */
        .dd-onboard-location {
          /* height: prefer svh (small viewport height — assumes the
             browser's toolbar/URL bar IS showing) as the final/winning
             declaration over dvh. Real-device testing found dvh can
             report a taller-than-actually-visible height on Android
             Chrome when the page never scrolls (the resize event that
             would normally correct dvh to the toolbar-adjusted value
             never fires), silently pushing the bottom CTA behind the
             browser's own chrome. svh always assumes the smaller,
             toolbar-visible viewport, so the layout is sized to the
             guaranteed-visible area instead. This also benefits the
             "More interests" bottom-sheet panel below, since it is
             absolutely positioned (inset-0) inside this same corrected
             container. */
          height: 100vh; height: 100dvh; height: 100svh;
          min-height: 100vh; min-height: 100dvh; min-height: 100svh;
          max-height: 100vh; max-height: 100dvh; max-height: 100svh;
          padding-top: env(safe-area-inset-top, 0px);
          /* A real, fixed 8px minimum sits UNDER the responsive
             --ol-outer-pad-bottom value below (which was reduced by
             exactly 8px in every tier to compensate — total bottom
             clearance is unchanged on a correctly-behaving browser).
             This part of the budget no longer depends on dvh/svh
             support, tier math, or safe-area-inset-bottom being non-zero
             (Android Chrome can legitimately report 0 there even when
             the visible chrome still makes the layout feel tight) — it's
             a hard floor that always applies. */
          padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));

          --ol-outer-pad-top: 14px;
          /* Reduced by 8px from its original value (28px) — that 8px now
             lives in the fixed padding-bottom above instead. Raised a
             further +14px (real-Android-phone CTA positioning
             correction) on top of that — the fixed safe-area floor
             above is untouched, only this responsive padding grew. */
          --ol-outer-pad-bottom: 34px;
          --ol-badge-gap: 10px;
          --ol-badge-s: 34px;
          --ol-badge-font: 15px;
          --ol-progress-h: 6px;
          --ol-progress-gap: 6px;
          --ol-gap-tc: 26px;
          --ol-title-size: 32px;
          --ol-gap-ts: 8px;
          --ol-sub-size: 15px;
          --ol-gap-sl: 22px;
          --ol-chip-gap: 10px;
          --ol-chip-pad-y: 14px;
          --ol-chip-icon: 20px;
          --ol-chip-label-size: 14px;
          --ol-plus-size: 40px;
          --ol-cta-pad-y: 17px;
          --ol-cta-size: 16px;
        }
        @media (max-height: 899px) {
          .dd-onboard-location {
            --ol-outer-pad-top: clamp(8px, calc(-9.50px + 2.50dvh), 12px);
            --ol-outer-pad-bottom: clamp(30px, calc(-75.00px + 15.00dvh), 54px);
            --ol-badge-s: clamp(28px, calc(19.53px + 0.98dvh), 32px);
            --ol-badge-font: clamp(13px, calc(9.53px + 0.4dvh), 14.5px);
            --ol-progress-h: clamp(5px, calc(3.6px + 0.16dvh), 5.5px);
            --ol-gap-tc: clamp(14px, calc(-29.75px + 6.25dvh), 24px);
            --ol-title-size: clamp(24px, calc(-2.25px + 3.75dvh), 30px);
            --ol-gap-ts: clamp(6px, calc(-2.75px + 1.25dvh), 8px);
            --ol-sub-size: clamp(13px, calc(6.44px + 0.94dvh), 14.5px);
            --ol-gap-sl: clamp(14px, calc(-3.50px + 2.50dvh), 18px);
            --ol-chip-gap: clamp(7px, calc(-1.75px + 1.25dvh), 9px);
            --ol-chip-pad-y: clamp(9px, calc(-4.12px + 1.88dvh), 12px);
            --ol-chip-icon: clamp(16px, calc(7.25px + 1.25dvh), 18px);
            --ol-chip-label-size: clamp(12px, calc(7.62px + 0.62dvh), 13px);
            --ol-plus-size: clamp(32px, calc(14.50px + 2.50dvh), 36px);
            --ol-cta-pad-y: clamp(12px, calc(-5.50px + 2.50dvh), 16px);
            --ol-cta-size: clamp(14px, calc(5.25px + 1.25dvh), 16px);
          }
        }
        @media (max-height: 699px) {
          .dd-onboard-location {
            --ol-outer-pad-top: clamp(6px, calc(-6.00px + 2.00dvh), 8px);
            --ol-outer-pad-bottom: clamp(20px, calc(-40.00px + 10.00dvh), 30px);
            --ol-badge-gap: clamp(8px, calc(-4.00px + 2.00dvh), 10px);
            --ol-badge-s: clamp(26px, calc(14.00px + 2.00dvh), 28px);
            --ol-badge-font: clamp(12px, calc(6.00px + 1.00dvh), 13px);
            --ol-progress-h: clamp(4.5px, calc(1.50px + 0.50dvh), 5px);
            --ol-progress-gap: clamp(5px, calc(-1.00px + 1.00dvh), 6px);
            --ol-gap-tc: clamp(8px, calc(-28.00px + 6.00dvh), 14px);
            --ol-title-size: clamp(21px, calc(3.00px + 3.00dvh), 24px);
            --ol-gap-ts: clamp(4px, calc(-8.00px + 2.00dvh), 6px);
            --ol-sub-size: clamp(12px, calc(6.00px + 1.00dvh), 13px);
            --ol-gap-sl: clamp(8px, calc(-28.00px + 6.00dvh), 14px);
            --ol-chip-gap: clamp(5px, calc(-7.00px + 2.00dvh), 7px);
            --ol-chip-pad-y: clamp(7px, calc(-5.00px + 2.00dvh), 9px);
            --ol-chip-icon: clamp(14px, calc(2.00px + 2.00dvh), 16px);
            --ol-chip-label-size: clamp(11px, calc(5.00px + 1.00dvh), 12px);
            --ol-plus-size: clamp(28px, calc(4.00px + 4.00dvh), 32px);
            --ol-cta-pad-y: clamp(10px, calc(-2.00px + 2.00dvh), 12px);
            --ol-cta-size: clamp(13.5px, calc(10.50px + 0.50dvh), 14px);
          }
        }
      `}</style>
    </div>
  )
}
