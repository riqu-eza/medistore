import './globals.css'
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/lib/auth/auth'
import { QueryProvider } from '@/providers/query-provider'
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  return (
     <>
    <html lang="en">
       

      <body>
        <QueryProvider>
        <SessionProvider session={session}>
          {children}
        </SessionProvider>
        </QueryProvider>
      </body>

    </html>
    </>
  )
}