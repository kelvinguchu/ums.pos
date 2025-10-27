"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MoreVertical,
  Edit2,
  UserMinus,
  UserPlus,
  ClipboardList,
  DollarSign,
  Trash2,
  PlusCircle,
  ArrowLeftCircle,
} from "lucide-react";
import AgentInventory from "./AgentInventory";
import RecordAgentSale from "./RecordAgentSale";
import AssignMetersToAgent from "./AssignMetersToAgent";
import ReturnMetersFromAgent from "./ReturnMetersFromAgent";

interface Agent {
  id: string;
  name: string;
  phone_number: string;
  location: string;
  county: string;
  is_active: boolean | null;
  total_meters?: number;
}

interface CurrentUser {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  is_active?: boolean | null;
}

interface AgentActionsMenuProps {
  agent: Agent;
  currentUser: CurrentUser | null | undefined;
  onToggleStatus: (agent: Agent) => Promise<void>;
  onEdit: (agent: Agent) => void;
  onDelete: (agent: Agent) => Promise<void>;
  onSaleClose: () => void;
}

export default function AgentActionsMenu({
  agent,
  currentUser,
  onToggleStatus,
  onEdit,
  onDelete,
  onSaleClose,
}: Readonly<AgentActionsMenuProps>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' className='h-8 w-8 p-0'>
          <MoreVertical className='h-4 w-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        {/* View Inventory - Available to all users */}
        <Sheet>
          <SheetTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <ClipboardList className='mr-2 h-4 w-4 text-[#000080]' />
              View Inventory
            </DropdownMenuItem>
          </SheetTrigger>
          <SheetContent className='w-full sm:min-w-[50vw] bg-gray-50 border-l border-gray-200 px-2 overflow-y-auto'>
            <SheetHeader>
              <SheetTitle className='text-center'>
                Agent Inventory - {agent.name}
              </SheetTitle>
            </SheetHeader>
            <div className='mt-4 h-[calc(100vh-120px)] overflow-y-auto'>
              <AgentInventory agentId={agent.id} />
            </div>
          </SheetContent>
        </Sheet>

        {/* Admin-only actions */}
        {currentUser?.role === "admin" && (
          <>
            <DropdownMenuSeparator />

            {/* Edit Agent */}
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                onEdit(agent);
              }}>
              <Edit2 className='mr-2 h-4 w-4 text-[#000080]' />
              Edit Agent
            </DropdownMenuItem>

            {/* Record Sale */}
            <Drawer>
              <DrawerTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <DollarSign className='mr-2 h-4 w-4 text-[#E46020]' />
                  Record Sale
                </DropdownMenuItem>
              </DrawerTrigger>
              <DrawerContent className='bg-gray-50 border-gray-200 px-2'>
                <DrawerHeader>
                  <DrawerTitle>Record Sale - {agent.name}</DrawerTitle>
                </DrawerHeader>
                {currentUser && (
                  <RecordAgentSale
                    agent={agent}
                    currentUser={{
                      id: currentUser.id,
                      email: currentUser.email || "",
                      role: currentUser.role,
                      name: currentUser.name || undefined,
                    }}
                    onClose={onSaleClose}
                  />
                )}
              </DrawerContent>
            </Drawer>

            {/* Assign Meters */}
            <Sheet>
              <SheetTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <PlusCircle className='mr-2 h-4 w-4 text-[#000080]' />
                  Assign Meters
                </DropdownMenuItem>
              </SheetTrigger>
              <SheetContent className='min-w-[50vw] bg-gray-50 border-l border-gray-200 px-2'>
                <SheetHeader>
                  <SheetTitle className='flex items-center justify-center gap-2'>
                    <Badge
                      variant='outline'
                      className='bg-[#000080] text-white px-4 py-2 text-sm'>
                      Assigning Meters to {agent.name}
                    </Badge>
                  </SheetTitle>
                </SheetHeader>
                <AssignMetersToAgent
                  currentUser={currentUser}
                  preSelectedAgent={agent}
                />
              </SheetContent>
            </Sheet>

            {/* Return Meters */}
            <Sheet>
              <SheetTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <ArrowLeftCircle className='mr-2 h-4 w-4 text-[#E46020]' />
                  Return Meters
                </DropdownMenuItem>
              </SheetTrigger>
              <SheetContent className='min-w-[50vw] bg-gray-50 border-l border-gray-200 px-2'>
                <SheetHeader>
                  <SheetTitle className='flex items-center justify-center gap-2'>
                    <Badge
                      variant='outline'
                      className='bg-[#000080] text-white px-4 py-2 text-sm'>
                      Return Meters from {agent.name}
                    </Badge>
                  </SheetTitle>
                </SheetHeader>
                {currentUser && (
                  <ReturnMetersFromAgent
                    agent={agent}
                    currentUser={{
                      id: currentUser.id,
                      name: currentUser.name || undefined,
                    }}
                  />
                )}
              </SheetContent>
            </Sheet>

            {/* Toggle Status */}
            <DropdownMenuItem onClick={() => onToggleStatus(agent)}>
              {agent.is_active ? (
                <>
                  <UserMinus className='mr-2 h-4 w-4 text-red-500' />
                  Deactivate Agent
                </>
              ) : (
                <>
                  <UserPlus className='mr-2 h-4 w-4 text-[#2ECC40]' />
                  Activate Agent
                </>
              )}
            </DropdownMenuItem>

            {/* Delete Agent */}
            <DropdownMenuItem
              className='text-red-600'
              onSelect={(e) => {
                e.preventDefault();
                onDelete(agent);
              }}>
              <Trash2 className='mr-2 h-4 w-4' />
              Delete Agent
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
