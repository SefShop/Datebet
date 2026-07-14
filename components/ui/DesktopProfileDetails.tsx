'use client'
// Desktop-only details view for the Discover/Profile card's front/details
// flip interaction. Renders ONLY real, existing data (bio, interests,
// profile details) — never invents fields. Reveal Progress lives only on
// the front card, not here. Scoped entirely under .desktop-profile-details,
// hidden below 1024px, so it has zero effect on mobile/tablet regardless of
// when it mounts.
import { UserProfile } from '@/lib/profiles'
import { appLangToIso } from '@/lib/langDetect'

interface Progress { games_completed: number; photo_unlocked: boolean; chat_unlocked: boolean }

interface Props {
  p: UserProfile
  lang: 'en' | 'gr'
  progress: Progress
  translatedBio: string | null
  translating: boolean
  translateError: boolean
  onTranslate: () => void
  onShowOriginal: () => void
  onClose: () => void
}

export default function DesktopProfileDetails({
  p, lang, progress, translatedBio, translating, translateError, onTranslate, onShowOriginal, onClose,
}: Props) {
  const bio = p.bio[lang]
  const showTranslate = !!bio && !translatedBio && !!p.bioLanguage && p.bioLanguage !== 'und' && p.bioLanguage !== appLangToIso(lang)

  return (
    <div className="desktop-profile-details" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0a0a10' }}>

      {/* Fixed header — never scrolls */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <button onClick={onClose}
          aria-label={lang === 'gr' ? 'Επιστροφή στη φωτογραφία' : 'Back to photo'}
          style={{ width: 34, height: 34, borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.08)', color: '#fff', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
          <span aria-hidden="true" style={{ fontSize: 14 }}>↙</span>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{p.name}</span>
            {p.age > 0 && <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{p.age}</span>}
          </div>
        </div>
        {progress && (
          <div style={{ width: 8, height: 8, borderRadius: '9999px', background: p.online ? '#4ade80' : '#666', flexShrink: 0 }} />
        )}
      </div>

      {/* Scrollable body — only this scrolls, only in this view */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px' }}>

        {/* About / Bio */}
        {bio && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
              {lang === 'gr' ? 'Σχετικά' : 'About'}
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,0.85)', fontStyle: 'italic' }}>
              "{translatedBio || bio}"
            </p>
            <div style={{ marginTop: 6, display: 'flex', gap: 10 }}>
              {translating ? (
                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>
                  {lang === 'gr' ? 'Μετάφραση...' : 'Translating...'}
                </span>
              ) : translatedBio ? (
                <button onClick={onShowOriginal} style={{ fontSize: 12, fontWeight: 700, color: '#7c72ff', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  {lang === 'gr' ? 'Εμφάνιση πρωτοτύπου' : 'Show original'}
                </button>
              ) : translateError ? (
                <>
                  <span style={{ fontSize: 11.5, color: 'rgba(248,113,113,0.85)' }}>
                    {lang === 'gr' ? 'Η μετάφραση δεν είναι διαθέσιμη αυτή τη στιγμή.' : 'Translation is unavailable right now.'}
                  </span>
                  <button onClick={onTranslate} style={{ fontSize: 12, fontWeight: 700, color: '#ff8fbb', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    {lang === 'gr' ? 'Ξανά' : 'Retry'}
                  </button>
                </>
              ) : showTranslate ? (
                <button onClick={onTranslate} style={{ fontSize: 12, fontWeight: 700, color: '#7c72ff', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  🌐 {lang === 'gr' ? 'Μετάφραση' : 'Translate'}
                </button>
              ) : null}
            </div>
          </div>
        )}

        {/* Interests — all of them, wraps freely */}
        {p.interests.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
              🏷 {lang === 'gr' ? 'Ενδιαφέροντα' : 'Interests'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {p.interests.map(tag => (
                <span key={tag} style={{ fontSize: 12.5, fontWeight: 500, padding: '6px 12px', borderRadius: '9999px',
                  background: 'rgba(108,99,255,0.12)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(108,99,255,0.24)' }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Profile details — only fields that already exist */}
        {p.location[lang] && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
              {lang === 'gr' ? 'Στοιχεία Προφίλ' : 'Profile Details'}
            </div>
            <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>📍</span>{p.location[lang]}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
