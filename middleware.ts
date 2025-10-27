import { updateSession } from "@/lib/utils/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === "/logo.png" ||
    pathname === "/favi.png" ||
    pathname.startsWith("/fonts") ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname === "/custom-sw.js" ||
    pathname.startsWith("/workbox")
  ) {
    return NextResponse.next();
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!api|_next/static|_next/image|favicon.ico.*).*)",
  ],
};
