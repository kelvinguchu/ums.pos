"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Global navigation progress indicator
 * Shows a loading bar at the top when navigating between pages
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    // Reset navigation state when route changes
    setIsNavigating(false);
  }, [pathname, searchParams]);

  // Listen for route change start
  useEffect(() => {
    const handleRouteChangeStart = () => {
      setIsNavigating(true);
    };

    const handleRouteChangeComplete = () => {
      setIsNavigating(false);
    };

    // For Next.js App Router, we'll use a custom event
    globalThis.window.addEventListener(
      "navigation-start",
      handleRouteChangeStart
    );
    globalThis.window.addEventListener(
      "navigation-complete",
      handleRouteChangeComplete
    );

    return () => {
      globalThis.window.removeEventListener(
        "navigation-start",
        handleRouteChangeStart
      );
      globalThis.window.removeEventListener(
        "navigation-complete",
        handleRouteChangeComplete
      );
    };
  }, []);

  if (!isNavigating) return null;

  return (
    <div className='fixed top-0 left-0 right-0 z-[9999] h-1 bg-gray-100'>
      <div className='h-full bg-gradient-to-r from-primary via-blue-500 to-primary animate-progress-bar shadow-lg' />
    </div>
  );
}
