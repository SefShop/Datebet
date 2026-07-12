'use client'
// Discover/Profile card — feature-flagged entry point.
//
// USE_NEW_PROFILE_DESIGN controls which visual design renders. All business
// logic (Supabase queries, photo unlock, chat unlock, presence, interests,
// bio, invites, etc.) lives identically in both — this file only chooses
// which JSX/visual layer to show. Flip the flag to instantly revert to the
// old design if needed; the legacy component is never deleted.
import ProfileScreenNew from './ProfileScreenNew'
import ProfileScreenLegacy from './ProfileScreenLegacy'

const USE_NEW_PROFILE_DESIGN = true

export default function ProfileScreen() {
  return USE_NEW_PROFILE_DESIGN ? <ProfileScreenNew /> : <ProfileScreenLegacy />
}
