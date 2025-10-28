"use client";

import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PhoneCall, MapPin } from "lucide-react";
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

interface AgentTableRowProps {
  readonly agent: Agent;
  readonly currentUser: CurrentUser | null | undefined;
  readonly onToggleStatus: (agent: Agent) => Promise<void>;
  readonly onEdit: (agent: Agent) => void;
  readonly onDelete: (agent: Agent) => Promise<void>;
  readonly onSaleClose: () => void;
}

export default function AgentTableRow({
  agent,
  currentUser,
  onToggleStatus,
  onEdit,
  onDelete,
  onSaleClose,
}: AgentTableRowProps) {
  return (
    <TableRow className='hover:bg-gray-50'>
      <TableCell className='font-medium'>{agent.name}</TableCell>
      <TableCell>
        <div className='flex items-center gap-2'>
          <PhoneCall className='h-4 w-4 text-primary' />
          {agent.phone_number}
        </div>
      </TableCell>
      <TableCell>
        <div className='flex items-center gap-2'>
          <MapPin className='h-4 w-4 text-[#E46020]' />
          {agent.location}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant='outline' className='bg-gray-100 text-gray-800'>
          {agent.county}
        </Badge>
      </TableCell>
      <TableCell className='text-center'>
        <Badge variant='outline' className='bg-blue-100 text-blue-800'>
          {agent.total_meters ?? 0}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge
          variant='outline'
          className={
            agent.is_active
              ? "bg-[#2ECC40] text-white"
              : "bg-gray-500 text-white"
          }>
          {agent.is_active ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell>
        <AgentActionsMenu
          agent={agent}
          currentUser={currentUser}
          onEdit={onEdit}
          onSaleClose={onSaleClose}
          onToggleStatus={onToggleStatus}
          onDelete={onDelete}
        />
      </TableCell>
    </TableRow>
  );
}
