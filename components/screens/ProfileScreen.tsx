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
  console.log('PROFILE FEATURE FLAG:', USE_NEW_PROFILE_DESIGN)
  console.log('ACTIVE PROFILE COMPONENT:', USE_NEW_PROFILE_DESIGN ? 'ProfileScreenNew' : 'ProfileScreenLegacy')
  console.log('PROFILE COMPONENT FILE:', USE_NEW_PROFILE_DESIGN ? 'components/screens/ProfileScreenNew.tsx' : 'components/screens/ProfileScreenLegacy.tsx')
  return USE_NEW_PROFILE_DESIGN ? <ProfileScreenNew /> : <ProfileScreenLegacy />
}
