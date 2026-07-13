'use client'
import { useState, useEffect } from 'react'

// Use this component for player avatars in all future DateDuel games so
// photo unlock privacy remains consistent. Do not build separate
// photo/unlock rendering logic per game — always import this component and
// pass it photoUnlocked (from getPairProgress / fetchGamePlayerPhotoAccess)
// and the player's primary photo URL.

export interface GamePlayerAvatarProps {
  userId: string
  displayName: string
  photoUrl?: string | null
  photoUnlocked: boolean
  isOnline?: boolean
  size: number            // px diameter — callers pass their screen's existing size
  accentColor?: string    // gradient/glow color, matched to each screen's existing style
  accentColor2?: string   // second gradient stop (mystery avatar background)
  isCurrentUser?: boolean
  emoji?: string          // mystery-avatar glyph (defaults to the existing 🎭)
  fontSize?: number       // emoji size — defaults to ~45% of the avatar size
  glow?: boolean          // keep each screen's existing glow treatment
}

export default function GamePlayerAvatar({
  userId,
  displayName,
  photoUrl,
  photoUnlocked,
  isOnline,
  size,
  accentColor = '#ff3384',
  accentColor2,
  isCurrentUser,
  emoji = '🎭',
  fontSize,
  glow = true,
}: GamePlayerAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false)

  // Reset the failure flag if a different photo URL comes in (e.g. unlock
  // just happened, or the profile's photo changed).
  useEffect(() => { setImgFailed(false) }, [photoUrl])

  const showRealPhoto = photoUnlocked && !!photoUrl && !imgFailed

  console.log('GAME AVATAR USER:', userId, isCurrentUser ? '(you)' : '')
  if (showRealPhoto) {
    console.log('GAME AVATAR USING REAL PHOTO:', userId)
  } else {
    console.log('GAME AVATAR USING MYSTERY:', userId)
  }

  return (
    <div
      className="relative rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: showRealPhoto ? undefined : `linear-gradient(135deg,${accentColor},${accentColor2 || accentColor})`,
        boxShadow: glow ? `0 0 ${Math.round(size * 0.45)}px ${accentColor}55` : 'none',
      }}
    >
      {showRealPhoto ? (
        <img
          src={photoUrl!}
          alt={displayName}
          className="w-full h-full object-cover object-center"
          onError={() => {
            console.log('GAME AVATAR FALLBACK ERROR:', userId)
            setImgFailed(true)
          }}
        />
      ) : (
        <span style={{ fontSize: fontSize || Math.round(size * 0.45) }}>{emoji}</span>
      )}
    </div>
  )
}
