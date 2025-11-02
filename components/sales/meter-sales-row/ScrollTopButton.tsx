import { ArrowUp } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ScrollTopButtonProps {
  visible: boolean;
  onClick: () => void;
}

export function ScrollTopButton({ visible, onClick }: ScrollTopButtonProps) {
  if (!visible) {
    return null;
  }

  return (
    <Button
      variant='outline'
      size='icon'
      className='fixed bottom-4 right-4 rounded-full shadow-lg bg-white/90 backdrop-blur-sm hover:bg-gray-50 cursor-pointer'
      onClick={onClick}>
      <ArrowUp className='h-4 w-4' />
    </Button>
  );
}
