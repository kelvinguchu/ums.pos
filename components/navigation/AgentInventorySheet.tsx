"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import AgentInventory from "@/components/agents/AgentInventory";

interface AgentInventorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string | null;
  agentName: string;
}

export function AgentInventorySheet({
  open,
  onOpenChange,
  agentId,
  agentName,
}: AgentInventorySheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='min-w-[40vw]'>
        <SheetHeader>
          <SheetTitle className='text-[#000080] text-center'>
            Agent Inventory - {agentName}
          </SheetTitle>
        </SheetHeader>
        {agentId && <AgentInventory agentId={agentId} />}
      </SheetContent>
    </Sheet>
  );
}
