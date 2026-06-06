'use client'
import { useState, useEffect } from 'react'
import { useApp } from '@/lib/AppContext'
import { supabase } from '@/lib/supabase'

type State = 'loading' | 'ready' | 'saving' | 'error'

export default function EditProfileScreen() {
  const { navigate, lang } = useApp()

  const [name, setName]       = useState('')
  const [age, setAge]         = useState('')
  const [location, setLoc]    = useState('')
  const [bio, setBio]         = useState('')
  const [photo, setPhoto]     = useState('')
  const [state, setState]     = useState<State>('loading')
  const [error, setError]     = useState('')
  const [saved, setSaved]     = useState(false)
  const [focus, setFocus]     = useState<string|null>(null)

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    setState('loading')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not logged in'); setState('error'); return }

      const { data, error: e } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      console.log('EDIT PROFILE: loaded', data, e)
      if (e && e.code !== 'PGRST116') { setError(e.message); setState('error'); return }

      if (data) {
        setName(data.name || '')
        setAge(data.age ? String(data.age) : '')
        setLoc(data.location || '')
        setBio(data.bio || '')
        setPhoto(data.photo || '')
      }
      setState('ready')
    } catch (err: any) {
      setError(err.message); setState('error')
    }
  }

  async function saveProfile() {
    setState('saving'); setError(''); setSaved(false)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not logged in'); setState('ready'); return }

      const { error: e } = await supabase.from('profiles').upsert({
        id: user.id,
        name,
        age: parseInt(age) || 0,
        location,
        bio,
        photo,
      })

      console.log('EDIT PROFILE: save result', e)
      if (e) { setError(e.message); setState('ready'); return }

      setSaved(true)
      setState('ready')
      setTimeout(() => navigate('profile'), 800)
    } catch (err: any) {
      setError(err.message); setState('ready')
    }
  }

  const t = {
    title:    lang==='gr' ? 'Το προφίλ μου' : 'My Profile',
    name:     lang==='gr' ? 'Όνομα' : 'Name',
    age:      lang==='gr' ? 'Ηλικία' : 'Age',
    location: lang==='gr' ? 'Τοποθεσία' : 'Location',
    bio:      lang==='gr' ? 'Bio' : 'Bio',
    photo:    lang==='gr' ? 'URL φωτογραφίας' : 'Photo URL',
    save:     lang==='gr' ? 'Αποθήκευση' : 'Save',
    saving:   lang==='gr' ? 'Αποθήκευση...' : 'Saving...',
    saved:    lang==='gr' ? 'Αποθηκεύτηκε ✓' : 'Saved ✓',
    back:     lang==='gr' ? '← Πίσω' : '← Back',
  }

  function inputStyle(key: string) {
    return {
      background: 'rgba(255,255,255,0.05)',
      color: '#fff', caretColor: '#fd297b',
      border: focus===key ? '1.5px solid rgba(253,41,123,0.5)' : '1.5px solid rgba(255,255,255,0.07)',
      boxShadow: focus===key ? '0 0 20px rgba(253,41,123,0.1)' : 'none',
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background:'#06060a', scrollbarWidth:'none' as any }}>

      {/* Header */}
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

          {/* Photo preview */}
          <div className="flex justify-center mb-6">
            <div className="w-28 h-28 rounded-full overflow-hidden"
              style={{ border:'3px solid rgba(253,41,123,0.3)', boxShadow:'0 0 24px rgba(253,41,123,0.15)' }}>
              {photo ? (
                <img src={photo} alt="Profile" className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[48px]"
                  style={{ background:'linear-gradient(135deg,#fd297b,#c850c0)' }}>👤</div>
              )}
            </div>
          </div>

          {/* Fields */}
          <div className="flex flex-col gap-3">

            {/* Name */}
            <div>
              <label className="text-[11px] font-bold text-white/30 uppercase tracking-[1px] mb-1.5 block">{t.name}</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder={t.name} onFocus={() => setFocus('n')} onBlur={() => setFocus(null)}
                className="w-full rounded-2xl px-4 py-3.5 text-[14px] outline-none transition-all duration-300"
                style={inputStyle('n')} />
            </div>

            {/* Age + Location row */}
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

            {/* Bio */}
            <div>
              <label className="text-[11px] font-bold text-white/30 uppercase tracking-[1px] mb-1.5 block">{t.bio}</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)}
                placeholder={lang==='gr' ? 'Πες κάτι για σένα...' : 'Say something about yourself...'}
                rows={3} maxLength={200}
                onFocus={() => setFocus('b')} onBlur={() => setFocus(null)}
                className="w-full rounded-2xl px-4 py-3.5 text-[14px] outline-none transition-all duration-300 resize-none"
                style={inputStyle('b')} />
              <div className="text-right text-[10px] mt-1" style={{ color:'rgba(255,255,255,0.2)' }}>{bio.length}/200</div>
            </div>

            {/* Photo URL */}
            <div>
              <label className="text-[11px] font-bold text-white/30 uppercase tracking-[1px] mb-1.5 block">{t.photo}</label>
              <input value={photo} onChange={e => setPhoto(e.target.value)}
                placeholder="https://..."
                onFocus={() => setFocus('p')} onBlur={() => setFocus(null)}
                className="w-full rounded-2xl px-4 py-3.5 text-[14px] outline-none transition-all duration-300"
                style={inputStyle('p')} />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="text-[12px] text-center px-3 py-2 rounded-xl mt-4"
              style={{ background:'rgba(239,68,68,0.08)', color:'#f87171', border:'1px solid rgba(239,68,68,0.12)' }}>
              {error}
            </div>
          )}

          {/* Save */}
          <button onClick={saveProfile} disabled={state==='saving' || !name}
            className="w-full rounded-2xl py-4 text-[16px] font-bold mt-5 active:scale-[0.97] transition-all cursor-pointer disabled:opacity-40"
            style={{
              fontFamily:"'Plus Jakarta Sans',sans-serif",
              background: saved ? 'rgba(74,222,128,0.2)' : 'linear-gradient(135deg,#fd297b,#c850c0)',
              color: saved ? '#4ade80' : '#fff',
              border: saved ? '1px solid rgba(74,222,128,0.3)' : 'none',
              boxShadow: saved ? 'none' : '0 8px 30px rgba(253,41,123,0.3)',
            }}>
            {state==='saving' ? t.saving : saved ? t.saved : t.save}
          </button>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }`}</style>
    </div>
  )
}
