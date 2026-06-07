'use client'

import { Profile } from '@/types'

interface ProfileCardProps {
  profile: Profile
  onClick?: () => void
  isBack?: boolean
}

export default function ProfileCard({ profile, onClick, isBack = false }: ProfileCardProps) {
  return (
    <div
      onClick={onClick}
      className={`absolute inset-0 rounded-3xl overflow-hidden cursor-pointer transition-transform active:scale-[0.99]
        ${isBack ? 'scale-[0.94] z-0 brightness-[0.7]' : 'z-10'}`}
    >
      {/* Photo background */}
      <div className="w-full h-full bg-gradient-to-br from-[#2d1b2e] via-[#1a1040] to-[#0d1a2e] flex items-center justify-center text-[110px] relative">
        <span className="z-10">{profile.emoji}</span>
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
      </div>

      {/* Info */}
      {!isBack && (
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="text-[28px] font-extrabold text-white tracking-tight">
            {profile.name}, {profile.age}
          </div>
          <div className="text-[14px] text-white/65 mt-1">
            📍 {String((profile.location as any)?.en ?? profile.location ?? "")}{profile.distance ? ", " + profile.distance : ""}
          </div>
          <div className="mt-2.5 inline-flex items-center gap-1.5 bg-[#fd297b]/90 backdrop-blur text-white text-[12px] font-semibold px-3 py-1.5 rounded-full">
            <span className="animate-pulse">●</span> Game ready to play
          </div>
        </div>
      )}
    </div>
  )
}
