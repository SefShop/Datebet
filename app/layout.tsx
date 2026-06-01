import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DateDuel — Play a game. Win a date.',
  description: 'The dating app where you play before you chat.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="antialiased">{children}</body>
    </html>
  )
}
