import type { Metadata } from 'next'
import { Lato } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const lato = Lato({ 
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  variable: "--font-lato"
});

export const metadata: Metadata = {
  title: 'Consultorio C427 - Sistema de Gestión',
  description: 'Sistema de gestión avanzada para Consultorio C427',
  icons: {
    icon: '/images/favicon.png',
    shortcut: '/images/icon-192x192.png',
    apple: '/images/apple-touch-icon.png',
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`${lato.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}