'use client'
import { useState, useEffect } from 'react'
import { useApp } from '@/lib/AppContext'
import { Lang } from '@/lib/copy'
import {
  isPushSupported, isIOSNonStandalone, getPushPermissionState, getExistingSubscription,
  enablePushForThisDevice, disablePushForThisDevice, sendTestNotification, PushPermissionState,
} from '@/lib/push'

export default function SettingsScreen() {
  const { navigate, lang, setLang } = useApp()

  // ── Notification settings state ──
  const [pushState, setPushState] = useState<PushPermissionState>('unsupported')
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const iosNotInstalled = isIOSNonStandalone()

  useEffect(() => {
    setPushState(getPushPermissionState())
    getExistingSubscription().then(sub => setSubscribed(!!sub))
  }, [])

  async function handleEnable() {
    // Only ever called from this explicit button press — the permission
    // prompt appears nowhere else in the app.
    setBusy(true)
    const result = await enablePushForThisDevice()
    setBusy(false)
    setPushState(getPushPermissionState())
    setSubscribed(!!result.ok)
  }

  async function handleDisable() {
    setBusy(true)
    await disablePushForThisDevice()
    setBusy(false)
    setSubscribed(false)
  }

  async function handleTestNotification() {
    if (testStatus === 'sending') return  // prevent repeated clicks while sending
    setTestStatus('sending')
    const result = await sendTestNotification(lang)
    setTestStatus(result.ok && (result.sent ?? 0) > 0 ? 'success' : 'error')
    setTimeout(() => setTestStatus('idle'), 2500)
  }

  const t = {
    title:    lang === 'gr' ? 'Ρυθμίσεις' : 'Settings',
    back:     lang === 'gr' ? '← Πίσω' : '← Back',
    language: lang === 'gr' ? 'Γλώσσα' : 'Language',
    hint:     lang === 'gr'
      ? 'Αλλάζει αμέσως τη γλώσσα σε όλη την εφαρμογή.'
      : 'Changes the language across the whole app immediately.',
    notifTitle: lang === 'gr' ? 'Ενεργοποίηση ειδοποιήσεων' : 'Enable notifications',
    notifHint:  lang === 'gr' ? 'Λάβε ειδοποιήσεις για νέες προκλήσεις και μηνύματα.' : 'Get notified about new challenges and messages.',
    notifEnabling: lang === 'gr' ? 'Ενεργοποίηση…' : 'Enabling…',
    notifEnabled:  lang === 'gr' ? 'Οι ειδοποιήσεις είναι ενεργές' : 'Notifications enabled',
    notifDenied:   lang === 'gr' ? 'Οι ειδοποιήσεις έχουν απορριφθεί από τον browser σου. Ενεργοποίησέ τις από τις ρυθμίσεις του browser.' : 'Notifications were denied in your browser. You can re-enable them from your browser\'s site settings.',
    notifUnsupported: lang === 'gr' ? 'Οι ειδοποιήσεις δεν υποστηρίζονται σε αυτόν τον browser.' : 'Notifications aren\'t supported in this browser.',
    notifDisable: lang === 'gr' ? 'Απενεργοποίηση για αυτή τη συσκευή' : 'Disable notifications for this device',
    notifIos: lang === 'gr'
      ? 'Για ειδοποιήσεις στο iPhone, πρόσθεσε πρώτα το DateDuel στην Αρχική Οθόνη και άνοιξέ το από εκεί.'
      : 'To receive notifications on iPhone, first add DateDuel to your Home Screen and open it from there.',
    testSend:    lang === 'gr' ? 'Αποστολή δοκιμαστικής ειδοποίησης' : 'Send test notification',
    testSending: lang === 'gr' ? 'Αποστολή…' : 'Sending…',
    testSuccess: lang === 'gr' ? 'Η δοκιμαστική ειδοποίηση στάλθηκε.' : 'Test notification sent.',
    testError:   lang === 'gr' ? 'Δεν ήταν δυνατή η αποστολή της ειδοποίησης.' : 'Could not send the test notification.',
  }

  function choose(l: Lang) {
    // Reuses the existing app-wide language state and persistence
    // (lib/AppContext.tsx) — no new storage or detection logic added here.
    setLang(l)
    console.log('SETTINGS LANG:', l)
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: '#0a0a10', scrollbarWidth: 'none' as any }}>

      <div className="flex items-center gap-3 px-5 pt-14 pb-4">
        <button onClick={() => navigate('profile')}
          className="text-white/40 text-[14px] active:opacity-60 cursor-pointer">{t.back}</button>
        <h1 className="text-[18px] font-extrabold text-white flex-1"
          style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{t.title}</h1>
      </div>

      <div className="px-5 pb-10">
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="text-[13px] font-bold text-white mb-1 flex items-center gap-2">
            🌐 {t.language}
          </div>
          <div className="text-[11.5px] mb-3.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {t.hint}
          </div>

          <div className="flex flex-col gap-2">
            <button onClick={() => choose('gr')}
              className="flex items-center justify-between rounded-xl px-4 py-3 cursor-pointer active:scale-[0.98] transition-transform"
              style={{
                background: lang === 'gr' ? 'linear-gradient(135deg,rgba(253,41,123,0.18),rgba(216,77,216,0.12))' : 'rgba(255,255,255,0.03)',
                border: lang === 'gr' ? '1px solid rgba(253,41,123,0.4)' : '1px solid rgba(255,255,255,0.08)',
              }}>
              <span className="text-[14px] font-semibold text-white">Ελληνικά</span>
              {lang === 'gr' && <span className="text-[14px]" style={{ color: '#ff3384' }}>✓</span>}
            </button>

            <button onClick={() => choose('en')}
              className="flex items-center justify-between rounded-xl px-4 py-3 cursor-pointer active:scale-[0.98] transition-transform"
              style={{
                background: lang === 'en' ? 'linear-gradient(135deg,rgba(253,41,123,0.18),rgba(216,77,216,0.12))' : 'rgba(255,255,255,0.03)',
                border: lang === 'en' ? '1px solid rgba(253,41,123,0.4)' : '1px solid rgba(255,255,255,0.08)',
              }}>
              <span className="text-[14px] font-semibold text-white">English</span>
              {lang === 'en' && <span className="text-[14px]" style={{ color: '#ff3384' }}>✓</span>}
            </button>
          </div>
        </div>

        {/* Notifications — Phase 1: enable/disable push for this device only.
            No real event notifications are wired up yet. */}
        <div className="rounded-2xl p-4 mt-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="text-[13px] font-bold text-white mb-1 flex items-center gap-2">
            🔔 {t.notifTitle}
          </div>
          <div className="text-[11.5px] mb-3.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {t.notifHint}
          </div>

          {iosNotInstalled ? (
            <div className="text-[11.5px] rounded-xl px-3.5 py-3" style={{ color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {t.notifIos}
            </div>
          ) : pushState === 'unsupported' ? (
            <div className="text-[11.5px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{t.notifUnsupported}</div>
          ) : pushState === 'denied' ? (
            <div className="text-[11.5px] rounded-xl px-3.5 py-3" style={{ color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {t.notifDenied}
            </div>
          ) : subscribed ? (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[13px] font-semibold flex items-center gap-2" style={{ color: '#4ade80' }}>
                  ✓ {t.notifEnabled}
                </div>
                <button onClick={handleDisable} disabled={busy}
                  className="text-[11.5px] font-medium active:opacity-60 cursor-pointer"
                  style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {t.notifDisable}
                </button>
              </div>

              <button onClick={handleTestNotification} disabled={testStatus === 'sending'}
                className="w-full rounded-xl px-4 py-2.5 text-[12.5px] font-bold cursor-pointer active:scale-[0.98] transition-transform"
                style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', opacity: testStatus === 'sending' ? 0.7 : 1 }}>
                {testStatus === 'sending' ? t.testSending : t.testSend}
              </button>
              {testStatus === 'success' && (
                <div className="text-[11px] text-center" style={{ color: '#4ade80' }}>{t.testSuccess}</div>
              )}
              {testStatus === 'error' && (
                <div className="text-[11px] text-center" style={{ color: '#f87171' }}>{t.testError}</div>
              )}
            </div>
          ) : (
            <button onClick={handleEnable} disabled={busy}
              className="w-full rounded-xl px-4 py-3 text-[14px] font-bold cursor-pointer active:scale-[0.98] transition-transform"
              style={{ background: 'linear-gradient(135deg,#ff3384,#d84dd8)', color: '#fff', opacity: busy ? 0.7 : 1 }}>
              {busy ? t.notifEnabling : t.notifTitle}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
