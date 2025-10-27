"use client";

import { useState } from "react";
import {
  updateAgentStatus,
  deleteAgent,
  getAgentInventory,
} from "@/lib/actions/agents";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import EditAgentDialog from "./EditAgentDialog";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useAgentsData } from "./hooks/useAgentsData";
import { Loader2, Users2 } from "lucide-react";
import AgentHistory from "./AgentHistory";
import AgentsSearchBar from "./AgentsSearchBar";
import AgentTableRow from "./AgentTableRow";
import AgentMobileRow from "./AgentMobileRow";
import AgentDeleteDialog from "./AgentDeleteDialog";

const EmptyState = () => (
  <div className='flex flex-col items-center justify-center p-8 text-gray-500'>
    <div className='relative'>
      <Users2 className='w-12 h-12 mb-4 text-gray-400' />
      <span className='absolute -bottom-1 -right-1 flex h-3 w-3'>
        <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-[#000080] opacity-75'></span>
        <span className='relative inline-flex rounded-full h-3 w-3 bg-[#000080]'></span>
      </span>
    </div>
    <p className='text-sm font-medium'>No agents registered yet</p>
    <p className='text-xs text-gray-400 mt-1'>
      Add agents to start managing your team
    </p>
  </div>
);

interface Agent {
  id: string;
  name: string;
  phone_number: string;
  location: string;
  county: string;
  is_active: boolean | null;
  total_meters: number;
}

interface CurrentUser {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  is_active?: boolean | null;
}

export default function Agents() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletionSheetOpen, setIsDeletionSheetOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [agentInventory, setAgentInventory] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const {
    agentsData: { agents, currentUser },
    isLoading,
    isError,
    error,
    refetch,
  } = useAgentsData();

  const queryClient = useQueryClient();

  // Helper function for search
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Helper function for edit
  const handleEdit = (agent: Agent) => {
    setSelectedAgent(agent);
    setIsEditDialogOpen(true);
  };

  // Helper function for record sale close
  const handleSaleClose = () => {
    setSelectedAgent(null);
  };

  const handleToggleStatus = async (agent: Agent) => {
    try {
      await updateAgentStatus(agent.id, !agent.is_active);

      queryClient.setQueryData(["agents"], (oldData: Agent[] = []) =>
        oldData.map((a) =>
          a.id === agent.id ? { ...a, is_active: !a.is_active } : a
        )
      );

      toast.success(
        `Agent ${agent.is_active ? "deactivated" : "activated"} successfully`
      );
    } catch (error) {
      queryClient.invalidateQueries({ queryKey: ["agents"] });

      toast.error("Failed to update agent status");
    }
  };

  const handleDeleteClick = async (agent: Agent) => {
    try {
      const inventory = await getAgentInventory(agent.id);
      setAgentInventory(inventory || []);
      setAgentToDelete(agent);
      setIsDeleteDialogOpen(true);
    } catch (error) {
      console.error("Error checking agent inventory:", error);
      toast.error("Failed to check agent inventory");
    }
  };

  const handleDeleteAgent = async (
    scannedMeters: string[] = [],
    unscannedMeters: string[] = []
  ) => {
    if (!currentUser) {
      toast.error("User information not available");
      return;
    }

    try {
      await deleteAgent(
        agentToDelete!.id,
        currentUser,
        scannedMeters,
        unscannedMeters
      );

      queryClient.setQueryData(["agents"], (oldData: Agent[] = []) =>
        oldData.filter((a) => a.id !== agentToDelete!.id)
      );

      toast.success("Agent deleted successfully");

      setIsDeleteDialogOpen(false);
      setIsDeletionSheetOpen(false);
      setAgentToDelete(null);
      setAgentInventory([]);
    } catch (error) {
      queryClient.invalidateQueries({ queryKey: ["agents"] });

      console.error("Error deleting agent:", error);
      toast.error("Failed to delete agent");
    }
  };

  const filteredAndPaginatedAgents = () => {
    const filtered = agents.filter(
      (agent) =>
        agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.phone_number.includes(searchTerm) ||
        agent.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.county.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return {
      paginatedAgents: filtered.slice(startIndex, endIndex),
      totalPages: Math.ceil(filtered.length / itemsPerPage),
      totalAgents: filtered.length,
    };
  };

  const { paginatedAgents, totalPages, totalAgents } =
    filteredAndPaginatedAgents();

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success("Agents list refreshed");
    } catch (error) {
      toast.error("Failed to refresh data");
    }
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <Loader2 className='w-6 h-6 animate-spin' />
      </div>
    );
  }

  if (isError) {
    return <div>Error: {error?.message}</div>;
  }

  return (
    <div className='w-full h-full p-4 md:p-6'>
      <div className='rounded-md border p-4 md:p-6'>
        <Tabs defaultValue='agents' className='w-full'>
          <TabsList className='mb-4'>
            <TabsTrigger value='agents'>Agents</TabsTrigger>
            <TabsTrigger value='history'>History</TabsTrigger>
          </TabsList>

          <TabsContent value='agents' className='space-y-4'>
            <AgentsSearchBar
              searchTerm={searchTerm}
              totalAgents={totalAgents}
              onSearchChange={handleSearchChange}
              onRefresh={handleRefresh}
            />

            {/* Desktop View */}
            <div className='hidden md:block'>
              <Table>
                <TableHeader>
                  <TableRow className='bg-gray-50'>
                    <TableHead className='font-semibold'>Name</TableHead>
                    <TableHead className='font-semibold'>Contact</TableHead>
                    <TableHead className='font-semibold'>Location</TableHead>
                    <TableHead className='font-semibold'>County</TableHead>
                    <TableHead className='font-semibold'>Status</TableHead>
                    <TableHead className='font-semibold'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAgents.length > 0 ? (
                    paginatedAgents.map((agent) => (
                      <AgentTableRow
                        key={agent.id}
                        agent={agent}
                        currentUser={currentUser}
                        onEdit={handleEdit}
                        onSaleClose={handleSaleClose}
                        onToggleStatus={handleToggleStatus}
                        onDelete={handleDeleteClick}
                      />
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <EmptyState />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile View */}
            <div className='block md:hidden'>
              <Table>
                <TableHeader>
                  <TableRow className='bg-gray-50'>
                    <TableHead className='font-semibold'>Name</TableHead>
                    <TableHead className='font-semibold text-center'>
                      Details
                    </TableHead>
                    <TableHead className='font-semibold text-right'>
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAgents.length > 0 ? (
                    paginatedAgents.map((agent) => (
                      <AgentMobileRow
                        key={agent.id}
                        agent={agent}
                        currentUser={currentUser}
                        onEdit={handleEdit}
                        onSaleClose={handleSaleClose}
                        onToggleStatus={handleToggleStatus}
                        onDelete={handleDeleteClick}
                      />
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <EmptyState />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Edit Agent Dialog */}
            {selectedAgent && (
              <EditAgentDialog
                isOpen={isEditDialogOpen}
                onClose={() => {
                  setIsEditDialogOpen(false);
                  setSelectedAgent(null);
                }}
                onAgentUpdated={() => {
                  queryClient.invalidateQueries({ queryKey: ["agents"] });
                }}
                agent={selectedAgent}
              />
            )}

            {/* Delete Dialogs - Desktop */}
            <div className='hidden md:block'>
              <AgentDeleteDialog
                isOpen={isDeleteDialogOpen}
                isDeletionSheetOpen={isDeletionSheetOpen}
                agent={agentToDelete}
                inventory={agentInventory}
                currentUser={currentUser}
                onOpenChange={setIsDeleteDialogOpen}
                onDeletionSheetOpenChange={setIsDeletionSheetOpen}
                onDelete={handleDeleteAgent}
                isMobile={false}
              />
            </div>

            {/* Delete Dialogs - Mobile */}
            <div className='block md:hidden'>
              <AgentDeleteDialog
                isOpen={isDeleteDialogOpen}
                isDeletionSheetOpen={isDeletionSheetOpen}
                agent={agentToDelete}
                inventory={agentInventory}
                currentUser={currentUser}
                onOpenChange={setIsDeleteDialogOpen}
                onDeletionSheetOpenChange={setIsDeletionSheetOpen}
                onDelete={handleDeleteAgent}
                isMobile={true}
              />
            </div>

            {/* Pagination */}
            <div className='mt-4 flex justify-center'>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      className={cn(
                        currentPage === 1 && "pointer-events-none opacity-50"
                      )}
                    />
                  </PaginationItem>

                  {Array.from({ length: totalPages }).map((_, i) => {
                    const page = i + 1;
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={page === currentPage}>
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    }
                    if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    return null;
                  })}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      className={cn(
                        currentPage === totalPages &&
                          "pointer-events-none opacity-50"
                      )}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </TabsContent>

          <TabsContent value='history'>
            <AgentHistory />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
