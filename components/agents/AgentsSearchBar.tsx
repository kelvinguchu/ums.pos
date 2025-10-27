"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw } from "lucide-react";

interface AgentsSearchBarProps {
  searchTerm: string;
  totalAgents: number;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
}

export default function AgentsSearchBar({
  searchTerm,
  totalAgents,
  onSearchChange,
  onRefresh,
}: AgentsSearchBarProps) {
  return (
    <div className='mb-4 mt-2 mx-2 md:mx-5 md:mb-6 md:mt-4 flex items-center justify-between'>
      <div className='relative w-1/2 md:w-72'>
        <Search className='absolute left-2 top-2.5 h-4 w-4 text-[#000080]' />
        <Input
          placeholder='Search agents...'
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className='pl-8 border-[#000] focus:ring-[#000080]'
        />
      </div>
      <div className='flex items-center gap-4'>
        <Button
          variant='outline'
          size='icon'
          onClick={onRefresh}
          className='hover:bg-gray-100'>
          <RefreshCw className='h-4 w-4' />
        </Button>
        <div className='text-sm text-[#000080] font-medium'>
          Total: {totalAgents} agents
        </div>
      </div>
    </div>
  );
}
