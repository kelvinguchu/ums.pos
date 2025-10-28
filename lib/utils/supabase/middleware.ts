import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });
  const pathname = request.nextUrl.pathname;
  const isAuthPage =
    pathname.startsWith("/signin") || pathname.startsWith("/error");
  const isDeactivatedPage = pathname.startsWith("/deactivated");
  const redirectTo = (targetPath: string) => {
    const url = request.nextUrl.clone();
    url.pathname = targetPath;
    return NextResponse.redirect(url);
  };

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({
            request,
          });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: DO NOT REMOVE auth.getUser()

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (isAuthPage || isDeactivatedPage) {
      return supabaseResponse;
    }
    return redirectTo("/signin");
  }

  if (isAuthPage) {
    return supabaseResponse;
  }

  try {
    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("is_active")
      .eq("id", user.id)
      .maybeSingle();

    const shouldTreatAsInactive =
      !!error || !profile || profile.is_active === false;

    if (error) {
      console.error("Error fetching user profile:", error);
    }

    if (shouldTreatAsInactive) {
      return isDeactivatedPage ? supabaseResponse : redirectTo("/deactivated");
    }

    if (isDeactivatedPage) {
      return redirectTo("/dashboard");
    }
  } catch (error) {
    console.error("Error checking user active status:", error);
    if (!isDeactivatedPage) {
      return redirectTo("/deactivated");
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
