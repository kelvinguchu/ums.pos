"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const Reload = () => {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed bottom-4 right-4 z-50 rounded-full bg-white shadow-md hover:bg-gray-100 transition-all duration-200"
            onClick={handleRefresh}
            aria-label="Refresh page"
          >
            <RefreshCw className="h-5 w-5 text-[#000080]" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Refresh page</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default Reload; 