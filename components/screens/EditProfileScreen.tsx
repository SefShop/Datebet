'use client'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/lib/AppContext'
import { supabase } from '@/lib/supabase'
import { detectBioLanguage } from '@/lib/langDetect'
import { compressImage } from '@/lib/photoCompress'

type State = 'loading' | 'ready' | 'saving' | 'error'
type PhotoState = 'idle' | 'uploading' | 'done' | 'error'

const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
const MAX_PHOTOS = 9

export default function EditProfileScreen() {
  const { navigate, lang } = useApp()

  const [name, setName]         = useState('')
  const [age, setAge]           = useState('')
  const [location, setLoc]      = useState('')
  const [bio, setBio]           = useState('')
  const [photo, setPhoto]       = useState('')
  const [photos, setPhotos]     = useState<string[]>([])  // up to 9, ordered — photos[0] is primary
  const [interests, setInterests] = useState<string[]>([])
  const [state, setState]       = useState<State>('loading')
  const [error, setError]       = useState('')
  const [saved, setSaved]       = useState(false)
  const [focus, setFocus]       = useState<string|null>(null)
  const [photoState, setPhotoState] = useState<PhotoState>('idle')
  const [photoError, setPhotoError] = useState('')
  const [preview, setPreview]   = useState<string|null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadSlot, setUploadSlot] = useState<number | null>(null)  // which slot the file picker targets
  const [userId, setUserId]     = useState<string|null>(null)

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    setState('loading')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not logged in'); setState('error'); return }

      console.log('=== MY PROFILE ===')
      console.log('AUTH USER ID:', user.id)
      console.log('AUTH USER EMAIL:', user.email)
      setUserId(user.id)

      const { data, error: e } = await supabase
        .from('profiles').select('*').eq('id', user.id).maybeSingle()

      if (e && e.code !== 'PGRST116') {
        console.error('PROFILE LOAD ERROR:', e)
        setError(e.message); setState('error'); return
      }

      if (data) {
        console.log('LOADED PROFILE ID:', data.id)
        console.log('LOADED PROFILE NAME:', data.name)
        console.log('LOADED PROFILE PHOTO:', data.photo ? 'yes' : 'none')

        // Mismatch check
        if (data.id !== user.id) {
          console.error('PROFILE MISMATCH:', data.id, '!==', user.id)
          setError('Profile mismatch. Please log out and log in again.')
          setState('error')
          return
        }

        setName(data.name || ''); setAge(data.age ? String(data.age) : '')
        setLoc(data.location || ''); setBio(data.bio || ''); setPhoto(data.photo || '')
        setPhotos(Array.isArray(data.photos) && data.photos.length > 0 ? data.photos : (data.photo ? [data.photo] : []))
        setInterests(Array.isArray(data.interests) ? data.interests : [])
        console.log('INTERESTS LOADED', Array.isArray(data.interests) ? data.interests.length : 0)
      } else {
        console.log('NO PROFILE FOUND for user', user.id)
      }
      setState('ready')
    } catch (err: any) {
      console.error('PROFILE LOAD CATCH:', err)
      setError(err.message); setState('error')
    }
  }

  // ── Photo upload (multi-photo aware) ──
  function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoError('')

    if (!ALLOWED.includes(file.type)) {
      setPhotoError(lang==='gr' ? 'Μόνο JPG, PNG, WebP' : 'Only JPG, PNG, WebP'); return
    }
    if (file.size > MAX_SIZE) {
      setPhotoError(lang==='gr' ? 'Μέγιστο 5MB' : 'Max 5MB'); return
    }

    // Preview only shown for the primary slot (slot 0), matching the
    // existing single-photo preview behavior.
    if (uploadSlot === 0 || uploadSlot === null) {
      const reader = new FileReader()
      reader.onload = () => setPreview(reader.result as string)
      reader.readAsDataURL(file)
    }

    uploadFile(file, uploadSlot ?? photos.length)
  }

  async function uploadFile(file: File, slotIndex: number) {
    if (!userId) return
    setPhotoState('uploading')

    try {
      const compressed = await compressImage(file)
      const ext = compressed.name.split('.').pop()
      const path = `${userId}/${slotIndex}_${Date.now()}.${ext}`

      const { error: upErr } = await supabase.storage
        .from('profile-photos')
        .upload(path, compressed, { upsert: true })

      if (upErr) {
        console.error('PHOTO UPLOAD error:', upErr)
        setPhotoError(upErr.message)
        setPhotoState('error')
        return
      }

      const { data: urlData } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(path)

      console.log('PHOTO UPLOAD: public URL', urlData.publicUrl, 'slot', slotIndex)
      setPhotos(prev => {
        const next = [...prev]
        next[slotIndex] = urlData.publicUrl
        return next.filter(Boolean).slice(0, MAX_PHOTOS)
      })
      if (slotIndex === 0) setPhoto(urlData.publicUrl)
      setPhotoState('done')
    } catch (err: any) {
      console.error('PHOTO UPLOAD catch:', err)
      setPhotoError(err.message)
      setPhotoState('error')
    }
  }

  function openPickerForSlot(slot: number) {
    setUploadSlot(slot)
    fileRef.current?.click()
  }

  function removePhotoAt(index: number) {
    console.log('PHOTO DELETE:', index)
    setPhotos(prev => {
      const next = prev.filter((_, i) => i !== index)
      if (index === 0) setPhoto(next[0] || '')
      return next
    })
    if (index === 0) { setPreview(null); setPhotoState('idle') }
  }

  function movePhoto(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= photos.length) return
    console.log('PHOTO REORDER:', index, '->', target)
    setPhotos(prev => {
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      if (index === 0 || target === 0) setPhoto(next[0] || '')
      return next
    })
  }

  function removePhoto() {
    setPhoto(''); setPreview(null); setPhotoState('idle')
    if (fileRef.current) fileRef.current.value = ''
  }

  const ALL_INTERESTS = ['☕ Coffee','✈️ Travel','🎬 Movies','🎵 Music','🍔 Food','🏋️ Gym','🏖️ Beach','🐾 Pets','🎮 Gaming','📚 Books','🌃 Night Out','🌿 Nature','⚽ Sports','🎨 Art','💃 Dancing']

  function toggleInterest(tag: string) {
    setInterests(prev => {
      if (prev.includes(tag)) {
        console.log('INTEREST REMOVED', tag)
        return prev.filter(t => t !== tag)
      }
      if (prev.length >= 5) return prev  // max 5
      console.log('INTEREST SELECTED', tag)
      return [...prev, tag]
    })
  }

  // ── Save profile ──
  async function saveProfile() {
    setState('saving'); setError(''); setSaved(false)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not logged in'); setState('ready'); return }

      // Detect bio language ONCE, right here at save time — never on every
      // render, never asked of the user.
      const bioLanguage = bio.trim() ? detectBioLanguage(bio) : 'und'

      const primaryPhoto = photos[0] || ''
      const payload = { id: user.id, name, age: parseInt(age) || 0, location, bio, bio_language: bioLanguage, photo: primaryPhoto, photos, interests }
      console.log('EDIT PROFILE: saving for user', user.id, 'photos:', photos.length)

      const { error: e } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' })

      if (e) { console.error('EDIT PROFILE: save error', e); setError(e.message); setState('ready'); return }
      console.log('INTERESTS SAVED', interests.length)
      console.log('BIO LANGUAGE SAVED:', bioLanguage)

      // Immediately refetch to confirm save
      const { data: verify } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      console.log('EDIT PROFILE: verified after save', verify?.id, verify?.name, verify?.photo ? '(has photo)' : '(no photo)')

      setSaved(true); setState('ready')
      setTimeout(() => navigate('profile'), 800)
    } catch (err: any) { setError(err.message); setState('ready') }
  }

  const t = {
    title:    lang==='gr' ? 'Το προφίλ μου' : 'My Profile',
    name:     lang==='gr' ? 'Όνομα' : 'Name',
    age:      lang==='gr' ? 'Ηλικία' : 'Age',
    location: lang==='gr' ? 'Τοποθεσία' : 'Location',
    bio:      'Bio',
    photoUrl: lang==='gr' ? 'Ή URL φωτογραφίας' : 'Or paste photo URL',
    upload:   lang==='gr' ? '📷 Ανέβασε φωτογραφία' : '📷 Upload Photo',
    remove:   lang==='gr' ? 'Αφαίρεση' : 'Remove',
    uploading:lang==='gr' ? 'Ανέβασμα...' : 'Uploading...',
    uploaded: lang==='gr' ? 'Ανέβηκε ✓' : 'Uploaded ✓',
    save:     lang==='gr' ? 'Αποθήκευση' : 'Save',
    saving:   lang==='gr' ? 'Αποθήκευση...' : 'Saving...',
    saved:    lang==='gr' ? 'Αποθηκεύτηκε ✓' : 'Saved ✓',
    back:     lang==='gr' ? '← Πίσω' : '← Back',
  }

  function inputStyle(key: string) {
    return {
      background: 'rgba(255,255,255,0.059)', color: '#fff', caretColor: '#ff3384',
      border: focus===key ? '1.5px solid rgba(253,41,123,0.59)' : '1.5px solid rgba(255,255,255,0.083)',
      boxShadow: focus===key ? '0 0 20px rgba(253,41,123,0.118)' : 'none',
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background:'#0a0a10', scrollbarWidth:'none' as any }}>

      <div className="flex items-center gap-3 px-5 pt-14 pb-4">
        <button onClick={() => navigate('profile')}
          className="text-white/40 text-[14px] active:opacity-60 cursor-pointer">{t.back}</button>
        <h1 className="text-[18px] font-extrabold text-white flex-1"
          style={{ fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{t.title}</h1>
      </div>

      {state === 'loading' ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[32px]" style={{ animation:'pulse 1s infinite' }}>⏳</div>
        </div>
      ) : (
        <div className="px-5 pb-10">

          {/* Photo section — up to 9 photos, slot 0 is always primary */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-28 h-28 rounded-full overflow-hidden mb-3"
              style={{ border:'3px solid rgba(253,41,123,0.354)', boxShadow:'0 0 24px rgba(253,41,123,0.177)' }}>
              {(preview || photos[0]) ? (
                <img src={preview || photos[0]} alt="Profile" className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[48px]"
                  style={{ background:'linear-gradient(135deg,#ff3384,#d84dd8)' }}>👤</div>
              )}
            </div>

            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
              onChange={onFileSelect} className="hidden" />

            <div className="text-[11px] font-bold mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {photos.length} / {MAX_PHOTOS} {lang==='gr' ? 'φωτογραφίες' : 'photos'}
            </div>

            {/* 3x3 photo grid */}
            <div className="grid grid-cols-3 gap-2 w-full max-w-[280px]">
              {Array.from({ length: MAX_PHOTOS }).map((_, i) => {
                const url = photos[i]
                return (
                  <div key={i} className="relative rounded-xl overflow-hidden" style={{
                    aspectRatio: '1', background: 'rgba(255,255,255,0.05)',
                    border: i === 0 ? '2px solid rgba(253,41,123,0.5)' : '1px solid rgba(255,255,255,0.1)',
                  }}>
                    {url ? (
                      <>
                        <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover cursor-pointer"
                          onClick={() => openPickerForSlot(i)}
                          onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                        {i === 0 && (
                          <div className="absolute top-1 left-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: 'rgba(253,41,123,0.85)', color: '#fff' }}>
                            {lang==='gr' ? 'Κύρια' : 'Primary'}
                          </div>
                        )}
                        <button onClick={() => removePhotoAt(i)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] cursor-pointer"
                          style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}>✕</button>
                        <div className="absolute bottom-1 left-1 right-1 flex justify-between">
                          <button onClick={() => movePhoto(i, -1)} disabled={i === 0}
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] cursor-pointer disabled:opacity-20"
                            style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}>‹</button>
                          <button onClick={() => movePhoto(i, 1)} disabled={i === photos.length - 1}
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] cursor-pointer disabled:opacity-20"
                            style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}>›</button>
                        </div>
                      </>
                    ) : (
                      i === photos.length && photos.length < MAX_PHOTOS ? (
                        <button onClick={() => openPickerForSlot(i)}
                          disabled={photoState==='uploading'}
                          className="w-full h-full flex items-center justify-center text-[22px] cursor-pointer disabled:opacity-40"
                          style={{ color: 'rgba(255,255,255,0.3)' }}>
                          {photoState==='uploading' && uploadSlot===i ? '⏳' : '+'}
                        </button>
                      ) : null
                    )}
                  </div>
                )
              })}
            </div>

            {photoError && (
              <div className="text-[11px] mt-2 px-3 py-1 rounded-lg"
                style={{ background:'rgba(239,68,68,0.08)', color:'#f87171' }}>{photoError}</div>
            )}
          </div>

          {/* Fields */}
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-[11px] font-bold text-white/30 uppercase tracking-[1px] mb-1.5 block">{t.name}</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder={t.name} onFocus={() => setFocus('n')} onBlur={() => setFocus(null)}
                className="w-full rounded-2xl px-4 py-3.5 text-[14px] outline-none transition-all duration-300"
                style={inputStyle('n')} />
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0" style={{ width: 90 }}>
                <label className="text-[11px] font-bold text-white/30 uppercase tracking-[1px] mb-1.5 block">{t.age}</label>
                <input value={age} onChange={e => setAge(e.target.value.replace(/\D/g,''))}
                  placeholder="24" inputMode="numeric" maxLength={2}
                  onFocus={() => setFocus('a')} onBlur={() => setFocus(null)}
                  className="w-full rounded-2xl px-4 py-3.5 text-[14px] outline-none transition-all duration-300"
                  style={inputStyle('a')} />
              </div>
              <div className="flex-1">
                <label className="text-[11px] font-bold text-white/30 uppercase tracking-[1px] mb-1.5 block">{t.location}</label>
                <input value={location} onChange={e => setLoc(e.target.value)}
                  placeholder={lang==='gr' ? 'Αθήνα' : 'Athens'}
                  onFocus={() => setFocus('l')} onBlur={() => setFocus(null)}
                  className="w-full rounded-2xl px-4 py-3.5 text-[14px] outline-none transition-all duration-300"
                  style={inputStyle('l')} />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-white/30 uppercase tracking-[1px] mb-1.5 block">{t.bio}</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)}
                placeholder={lang==='gr' ? 'Πες κάτι για σένα...' : 'Say something about yourself...'}
                rows={3} maxLength={200}
                onFocus={() => setFocus('b')} onBlur={() => setFocus(null)}
                className="w-full rounded-2xl px-4 py-3.5 text-[14px] outline-none transition-all duration-300 resize-none"
                style={inputStyle('b')} />
              <div className="text-right text-[10px] mt-1" style={{ color:'rgba(255,255,255,0.236)' }}>{bio.length}/200</div>
            </div>

            {/* Interests */}
            <div>
              <label className="text-[11px] font-bold text-white/30 uppercase tracking-[1px] mb-1.5 block">
                {lang==='gr' ? `Ενδιαφέροντα (${interests.length}/5)` : `Interests (${interests.length}/5)`}
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_INTERESTS.map(tag => {
                  const active = interests.includes(tag)
                  const disabled = !active && interests.length >= 5
                  return (
                    <button key={tag} type="button" onClick={() => toggleInterest(tag)} disabled={disabled}
                      className="px-3 py-2 rounded-full text-[12px] font-bold transition-all active:scale-95 cursor-pointer"
                      style={{
                        background: active ? 'linear-gradient(135deg,#ff3384,#d84dd8)' : 'rgba(255,255,255,0.047)',
                        color: active ? '#fff' : disabled ? 'rgba(255,255,255,0.236)' : 'rgba(255,255,255,0.708)',
                        border: `1px solid ${active ? 'rgba(253,41,123,0.472)' : 'rgba(255,255,255,0.094)'}`,
                        opacity: disabled ? 0.4 : 1,
                      }}>
                      {tag}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {error && (
            <div className="text-[12px] text-center px-3 py-2 rounded-xl mt-4"
              style={{ background:'rgba(239,68,68,0.08)', color:'#f87171', border:'1px solid rgba(239,68,68,0.12)' }}>
              {error}
            </div>
          )}

          <button onClick={saveProfile} disabled={state==='saving' || !name}
            className="w-full rounded-2xl py-4 text-[16px] font-bold mt-5 active:scale-[0.97] transition-all cursor-pointer disabled:opacity-40"
            style={{
              fontFamily:"'Plus Jakarta Sans',sans-serif",
              background: saved ? 'rgba(74,222,128,0.2)' : 'linear-gradient(135deg,#ff3384,#d84dd8)',
              color: saved ? '#4ade80' : '#fff',
              border: saved ? '1px solid rgba(74,222,128,0.3)' : 'none',
              boxShadow: saved ? 'none' : '0 8px 30px rgba(253,41,123,0.354)',
            }}>
            {state==='saving' ? t.saving : saved ? t.saved : t.save}
          </button>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }`}</style>
    </div>
  )
}
