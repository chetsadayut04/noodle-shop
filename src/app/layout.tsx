import type { Metadata, Viewport } from 'next'
import { Kanit, IBM_Plex_Sans_Thai } from 'next/font/google'
import './globals.css'

const kanit = Kanit({
  subsets: ['thai', 'latin'],
  weight: ['500', '600', '700'],
  variable: '--font-kanit',
})

const plexThai = IBM_Plex_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-thai',
})

export const metadata: Metadata = {
  title: 'ครัวริมคลอง | เมนูก๋วยเตี๋ยว',
  description: 'สั่งก๋วยเตี๋ยว ข้าว และเครื่องดื่มไทยรสเด็ด',
  icons: {
    icon: '/icon.svg',
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  colorScheme: 'light dark',
  themeColor: '#ffffff',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="th" className={`bg-background ${kanit.variable} ${plexThai.variable}`}>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
