"use client";

import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Phone, Info, MapPin } from "lucide-react";
import AgentActionsMenu from "./AgentActionsMenu";

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

interface AgentMobileRowProps {
  agent: Agent;
  currentUser: CurrentUser | null | undefined;
  onToggleStatus: (agent: Agent) => Promise<void>;
  onEdit: (agent: Agent) => void;
  onDelete: (agent: Agent) => Promise<void>;
  onSaleClose: () => void;
}

export default function AgentMobileRow({
  agent,
  currentUser,
  onToggleStatus,
  onEdit,
  onDelete,
  onSaleClose,
}: Readonly<AgentMobileRowProps>) {
  return (
    <TableRow className='hover:bg-gray-50'>
      <TableCell>
        <div className='font-medium'>{agent.name}</div>
        <a
          href={`tel:${agent.phone_number}`}
          className='flex items-center gap-1 text-sm text-primary mt-1'>
          <Phone className='h-3 w-3' />
          {agent.phone_number}
        </a>
      </TableCell>
      <TableCell className='text-center'>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' size='sm' className='cursor-pointer'>
              <Info className='h-4 w-4 text-primary' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-56'>
            <div className='p-2'>
              <div className='mb-2'>
                <span className='text-sm font-medium'>Location:</span>
                <div className='flex items-center gap-2 mt-1'>
                  <MapPin className='h-4 w-4 text-[#E46020]' />
                  {agent.location}
                </div>
              </div>
              <div className='mb-2'>
                <span className='text-sm font-medium'>County:</span>
                <div className='mt-1'>
                  <Badge
                    variant='outline'
                    className='bg-gray-100 text-gray-800'>
                    {agent.county}
                  </Badge>
                </div>
              </div>
              <div>
                <span className='text-sm font-medium'>Status:</span>
                <div className='mt-1'>
                  <Badge
                    variant='outline'
                    className={
                      agent.is_active
                        ? "bg-[#2ECC40] text-white"
                        : "bg-gray-500 text-white"
                    }>
                    {agent.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
      <TableCell className='text-right'>
        <AgentActionsMenu
          agent={agent}
          currentUser={currentUser}
          onToggleStatus={onToggleStatus}
          onEdit={onEdit}
          onDelete={onDelete}
          onSaleClose={onSaleClose}
        />
      </TableCell>
    </TableRow>
  );
}
