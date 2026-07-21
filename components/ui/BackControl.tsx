'use client'

interface Props {
  onClick: () => void
  lang: 'en' | 'gr'
}

// Shared back-navigation control for game screens — same arrow as before,
// with localized text next to it ("← Back" / "← Πίσω"). Each game keeps
// its own click behavior; this only renders the control itself.
export default function BackControl({ onClick, lang }: Props) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 text-white/40 text-[14px] font-medium cursor-pointer transition-colors hover:text-white/70">
      <span>←</span>
      <span>{lang === 'gr' ? 'Πίσω' : 'Back'}</span>
    </button>
  )
}
