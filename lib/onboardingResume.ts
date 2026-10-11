import type { Screen } from '@/types'

// ── STEP 5B: Resume onboarding — PURE, READ-ONLY decision helper ─────────
//
// Given the authenticated user's OWN already-fetched profile data, return
// the EARLIEST onboarding screen whose persisted requirement is not yet
// satisfied. Used only for a user whose onboarding_completed is false;
// onboarding_completed itself stays the one and only completion marker
// (set by Step 7's single final UPDATE) — this file never decides, sets or
// replaces it.
//
// This function performs NO network call, NO write, and NO logging. It is
// handed (a) the safe/public columns app/app/page.tsx already selects with a
// plain select, and (b) the result of the existing owner-only
// fetchOwnPrivateProfile() / get_own_private_profile() RPC. Exact date of
// birth and coordinates are therefore only ever inspected in memory here —
// never stored, returned, or logged.
//
// Every rule below mirrors the CURRENT validation of the matching
// onboarding screen (what its Continue button requires), applied to what
// that screen persists:
//
//   Step 1 Welcome          valid location: non-empty city text OR both
//                           coordinates (the same either-method rule the
//                           Welcome resume hydration and Step 7's final
//                           completion check use). The notification
//                           sub-stage is deliberately NOT part of this rule
//                           — it is optional, best-effort, advances on
//                           every outcome, and leaves no persisted trace.
//   Step 2 About You        name non-blank AND date_of_birth valid with
//                           full-years age >= 18 AND gender canonical.
//   Step 3 Interested In    show_me = 'women' | 'men', OR a valid show_me
//                           together with show_me_confirmed = true.
//                           'everyone' is the database DEFAULT, so on its
//                           own it cannot be told apart from "never
//                           answered"; show_me_confirmed (onboarding
//                           progress, written only by a successful Step 3
//                           Continue) is what records an explicit
//                           Everyone. A missing/false flag keeps Step 3 —
//                           so a new profile, a row from before the column
//                           existed, or an RPC response without the field
//                           all safely land on Step 3. The screen hydrates
//                           the stored value, so confirming costs one tap.
//   Step 4 Interests        at least 1 saved interest key (Interests only).
//   Step 5 Photos           at least 2 saved photo URLs, slot 0 present.
//   Step 6 Bio              non-blank bio (the screen requires >= 1
//                           non-whitespace character).
//   Step 7 Preferences      reached when Steps 1–6 hold; completion is the
//                           onboarding_completed flag itself.
//
// Steps are checked strictly in order, so a populated later field can never
// cause an earlier unsatisfied step to be skipped.

export type OnboardingResumeScreen = Extract<
  Screen,
  | 'onboarding_welcome'
  | 'onboarding_about_you'
  | 'onboarding_interested_in'
  | 'onboarding_location_interests'
  | 'onboarding_photos'
  | 'onboarding_bio'
  | 'onboarding_preferences'
>

// Safe/public columns (plain select — granted to `authenticated`).
export type ResumePublicFields = {
  name?: string | null
  location?: string | null
  interests?: unknown
  photos?: unknown
  bio?: string | null
}

// Owner-only-private fields, exactly as returned by fetchOwnPrivateProfile().
export type ResumePrivateFields = {
  date_of_birth?: string | null
  gender?: string | null
  show_me?: string | null
  show_me_confirmed?: boolean | null
  latitude?: number | null
  longitude?: number | null
}

// Same full-years calculation as OnboardingAboutYouScreen's calcAge().
function fullYearsSince(dobStr: string): number | null {
  if (!dobStr) return null
  const d = new Date(dobStr + 'T00:00:00')
  if (isNaN(d.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - d.getFullYear()
  const monthDiff = today.getMonth() - d.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d.getDate())) age--
  return age
}

function nonEmptyStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string' && v.length > 0)
    : []
}

export function resolveOnboardingResumeScreen(
  pub: ResumePublicFields | null | undefined,
  priv: ResumePrivateFields | null | undefined,
): OnboardingResumeScreen {
  // Not enough information for a safe decision → today's behavior (Step 1).
  // Every onboarding screen still hydrates its own saved values, so nothing
  // already persisted is lost by starting at the top.
  if (!pub || !priv) return 'onboarding_welcome'

  // Step 1 — Welcome / location.
  const hasCity = typeof pub.location === 'string' && pub.location.trim().length > 0
  const hasCoords = typeof priv.latitude === 'number' && typeof priv.longitude === 'number'
  if (!hasCity && !hasCoords) return 'onboarding_welcome'

  // Step 2 — About You.
  const hasName = typeof pub.name === 'string' && pub.name.trim().length > 0
  const age = typeof priv.date_of_birth === 'string' ? fullYearsSince(priv.date_of_birth) : null
  const hasValidDob = age !== null && age >= 18
  const hasGender = priv.gender === 'woman' || priv.gender === 'man' || priv.gender === 'nonbinary'
  if (!hasName || !hasValidDob || !hasGender) return 'onboarding_about_you'

  // Step 3 — Who are you interested in? 'women' / 'men' are never the DB
  // default, so they prove an answer. 'everyone' IS the default, so it only
  // counts once show_me_confirmed === true. An invalid show_me never counts,
  // whatever the flag says.
  const hasValidShowMe = priv.show_me === 'women' || priv.show_me === 'men' || priv.show_me === 'everyone'
  const step3Answered =
    priv.show_me === 'women' || priv.show_me === 'men' ||
    (hasValidShowMe && priv.show_me_confirmed === true)
  if (!step3Answered) return 'onboarding_interested_in'

  // Step 4 — Interests only.
  if (nonEmptyStrings(pub.interests).length < 1) return 'onboarding_location_interests'

  // Step 5 — Photos (>= 2, slot 0 present).
  const photos = Array.isArray(pub.photos) ? pub.photos : []
  const firstPhotoOk = typeof photos[0] === 'string' && (photos[0] as string).length > 0
  if (!firstPhotoOk || nonEmptyStrings(photos).length < 2) return 'onboarding_photos'

  // Step 6 — Bio.
  if (typeof pub.bio !== 'string' || pub.bio.trim().length === 0) return 'onboarding_bio'

  // Step 7 — Preferences (onboarding_completed is still false).
  return 'onboarding_preferences'
}
