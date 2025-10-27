import { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className='min-h-screen bg-background flex items-center justify-center'>
      {children}
    </div>
  );
}
