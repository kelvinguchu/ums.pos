import { ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Search } from "lucide-react";

interface SaleToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onDownload: () => void;
}

export function SaleToolbar({
  searchTerm,
  onSearchChange,
  onDownload,
}: SaleToolbarProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSearchChange(event.target.value);
  };

  return (
    <div className='sticky top-0 bg-white/95 backdrop-blur-sm z-10 py-4 border-b'>
      <div className='flex justify-between items-center gap-4'>
        <div className='relative flex-1'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
          <Input
            className='pl-9 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors'
            placeholder='Search serial numbers...'
            value={searchTerm}
            onChange={handleChange}
          />
        </div>
        <Button
          variant='outline'
          size='sm'
          onClick={onDownload}
          className='whitespace-nowrap hover:bg-gray-50 cursor-pointer'>
          <Download className='h-4 w-4 mr-2' />
          Download List
        </Button>
      </div>
    </div>
  );
}
