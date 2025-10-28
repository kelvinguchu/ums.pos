"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

const DeactivatedPage = () => {
  const router = useRouter();

  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-white'>
      <Image
        src='/logo.png'
        alt='logo'
        width={100}
        height={100}
        className='mb-6'
      />

      <Card className='w-[90%] max-w-[500px] shadow-lg'>
        <CardHeader>
          <CardTitle className='text-center text-2xl font-bold'>
            Account Deactivated
          </CardTitle>
        </CardHeader>
        <CardContent className='text-center space-y-4'>
          <div className='text-4xl mb-4'>🔒</div>
          <p className='text-lg text-gray-700'>
            Oops! Seems like you do not have permission to access this page.
          </p>
          <p className='text-sm text-gray-500'>
            Please contact an administrator to reactivate your account.
          </p>
        </CardContent>
        <CardFooter className='flex justify-center'>
          <Button
            variant='outline'
            onClick={() => router.push("/signin")}
            className='mt-4 cursor-pointer'>
            Back to Sign In
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default DeactivatedPage;
