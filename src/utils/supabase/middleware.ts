import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // guard /staff และ /admin
  if (path.startsWith('/staff') || path.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // admin เท่านั้นเข้า /admin ได้
  if (path.startsWith('/admin')) {
    const role = user?.user_metadata?.role
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/staff', request.url))
    }
  }

  return response
}

export { updateSession as middleware }

export const config = {
  matcher: ['/staff/:path*', '/admin/:path*'],
}