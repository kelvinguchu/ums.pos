"use client";

import { useState, useEffect } from "react";
import Navbar from "./Navbar";

export function NavbarClient() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Render a placeholder on server-side to prevent hydration mismatch
  if (!isMounted) {
    return (
      <div className='fixed top-0 left-0 right-0 z-50 bg-white shadow-md h-16 flex items-center px-4 w-full'>
        <div className='flex justify-between items-center w-full gap-4'>
          <div className='flex items-center gap-4'>
            <div className='w-9 h-9 bg-gray-200 rounded animate-pulse' />
            <div className='w-[70px] h-[40px] bg-gray-200 rounded animate-pulse' />
          </div>
          <div className='flex-1 max-w-2xl mx-8'>
            <div className='h-9 bg-gray-200 rounded animate-pulse' />
          </div>
          <div className='flex items-center gap-4'>
            <div className='w-9 h-9 bg-gray-200 rounded-full animate-pulse' />
          </div>
        </div>
      </div>
    );
  }

  // Only render the actual Navbar on the client-side
  return <Navbar />;
}