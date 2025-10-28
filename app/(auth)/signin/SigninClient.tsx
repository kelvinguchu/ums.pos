"use client";

import dynamic from "next/dynamic";
import Loader from "@/components/ui/Loader";

const Signin = dynamic(() => import("@/components/auth/Signin"), {
  ssr: false,
  loading: () => (
    <div className='flex items-center justify-center min-h-screen'>
      <Loader />
    </div>
  ),
});

const SigninClient = () => {
  return <Signin />;
};

export default SigninClient;
