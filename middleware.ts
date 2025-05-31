import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // Middleware logic here if needed
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Always allow auth routes, home page, and static assets
        if (
          pathname.startsWith("/auth/") ||
          pathname === "/" ||
          pathname === "/welcome" ||
          pathname.startsWith("/api/auth/") ||
          pathname.startsWith("/_next/") ||
          pathname.startsWith("/static/") ||
          pathname === "/favicon.ico"
        ) {
          return true;
        }
        
        // For database sessions, check if there's a session cookie
        const sessionToken = req.cookies.get("next-auth.session-token")?.value ||
                           req.cookies.get("__Secure-next-auth.session-token")?.value;
        
        return !!sessionToken;
      },
    },
  }
)

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
} 