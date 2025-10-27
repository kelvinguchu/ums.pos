"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { getMeterBySerial } from "@/lib/actions/meters";
import { assignMetersToAgent, getAgentsList } from "@/lib/actions/agents";
import { X, Check, ChevronsUpDown, Users, Loader2 } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import AgentAssignmentReceipt from "../agents/AgentAssignmentReceipt";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface Agent {
  id: string;
  name: string;
  location: string;
}

interface AssignMetersToAgentProps {
  readonly currentUser: any;
  readonly preSelectedAgent?: {
    readonly id: string;
    readonly name: string;
    readonly location: string;
  };
  readonly isSheetOpen?: boolean;
}

export default function AssignMetersToAgent({
  currentUser,
  preSelectedAgent,
  isSheetOpen = false,
}: Readonly<AssignMetersToAgentProps>) {
  const [serialNumber, setSerialNumber] = useState("");
  const [meters, setMeters] = useState<
    Array<{ id: string; serialNumber: string; type: string }>
  >(() => {
    const cachedMeters = localStorage.getItem("cachedAssignMeters");
    return cachedMeters ? JSON.parse(cachedMeters) : [];
  });
  const [selectedAgent, setSelectedAgent] = useState<string>(
    preSelectedAgent?.id || ""
  );
  const [agents, setAgents] = useState<Agent[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | React.ReactNode>(
    "Select an agent and scan meters"
  );
  const [isSubmitted, setIsSubmitted] = useState(false);
  const serialInputRef = useRef<HTMLInputElement>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);

  useEffect(() => {
    if (preSelectedAgent) {
      setAgents([preSelectedAgent]);
      setSelectedAgent(preSelectedAgent.id);
    }
  }, [preSelectedAgent]);

  const handleOpenCombobox = async (open: boolean) => {
    setOpenCombobox(open);

    // Only load agents when opening the dropdown and if not already loaded
    if (open && agents.length === 0 && !preSelectedAgent) {
      setIsLoadingAgents(true);
      try {
        const agentsList = await getAgentsList();
        setAgents(agentsList.filter((agent) => agent.is_active));
      } catch (error) {
        console.error("Error loading agents:", error);
        toast.error("Failed to load agents");
      } finally {
        setIsLoadingAgents(false);
      }
    }
  };

  useEffect(() => {
    if (serialInputRef.current) {
      serialInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (serialInputRef.current && selectedAgent) {
      serialInputRef.current.focus();
    }
  }, [meters, selectedAgent]);

  useEffect(() => {
    if (!isAssigning && serialInputRef.current && selectedAgent) {
      serialInputRef.current.focus();
    }
  }, [isAssigning, selectedAgent]);

  useEffect(() => {
    const focusTimer = setTimeout(() => {
      if (serialInputRef.current && selectedAgent) {
        serialInputRef.current.focus();
      }
    }, 100);

    return () => clearTimeout(focusTimer);
  }, [selectedAgent, isSheetOpen]);

  const handleSerialNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSerialNumber(e.target.value);
  };

  useEffect(() => {
    const checkSerialNumber = async () => {
      if (!selectedAgent) {
        setErrorMessage("Please select an agent first");
        return;
      }

      if (!serialNumber.trim()) {
        setErrorMessage("Input Serial Number");
        return;
      }

      const existingIndex = meters.findIndex(
        (m) => m.serialNumber.toLowerCase() === serialNumber.toLowerCase()
      );

      if (existingIndex !== -1) {
        setErrorMessage("Serial Number Already in the Table");
        return;
      }

      try {
        const meter = await getMeterBySerial(serialNumber);
        if (!meter) {
          setErrorMessage("Meter not found");
          return;
        }

        setMeters([
          {
            id: meter.id,
            serialNumber: meter.serial_number,
            type: meter.type,
          },
          ...meters,
        ]);
        setSerialNumber("");
        setErrorMessage("");

        toast.success("Meter added to the list");
      } catch (error) {
        console.error("Error retrieving meter:", error);
        setErrorMessage("Failed to retrieve meter. Please try again.");
      }
    };

    const timeoutId = setTimeout(checkSerialNumber, 300);
    return () => clearTimeout(timeoutId);
  }, [serialNumber, meters, selectedAgent, toast]);

  const handleRemoveMeter = (index: number) => {
    setMeters(meters.filter((_, i) => i !== index));
  };

  useEffect(() => {
    localStorage.setItem("cachedAssignMeters", JSON.stringify(meters));
  }, [meters]);

  const handleAssignMeters = async () => {
    if (!selectedAgent) {
      setErrorMessage("Please select an agent");
      return;
    }

    if (meters.length === 0) {
      setErrorMessage("No meters to assign");
      return;
    }

    setIsAssigning(true);
    try {
      const selectedAgentDetails = agents.find((a) => a.id === selectedAgent);
      if (!selectedAgentDetails) {
        throw new Error("Agent not found");
      }

      await assignMetersToAgent({
        agentId: selectedAgent,
        meters: meters.map((meter) => ({
          meter_id: meter.id,
          serial_number: meter.serialNumber,
          type: meter.type,
        })),
        assignedBy: currentUser.id,
      });

      // Store assignment details for receipt
      const receiptDetails = {
        meters,
        agentName: selectedAgentDetails.name,
        agentLocation: selectedAgentDetails.location,
        assignedBy: currentUser.name,
      };

      localStorage.setItem(
        "lastAssignmentDetails",
        JSON.stringify(receiptDetails)
      );

      // Clear the cached meters
      localStorage.removeItem("cachedAssignMeters");
      setMeters([]);
      setSelectedAgent("");
      setIsSubmitted(true);

      toast.success("Meters assigned successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to assign meters");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleDownloadReceipt = async () => {
    try {
      const assignmentDetails = JSON.parse(
        localStorage.getItem("lastAssignmentDetails") || "{}"
      );

      const blob = await pdf(
        <AgentAssignmentReceipt {...assignmentDetails} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `agent-assignment-${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      localStorage.removeItem("lastAssignmentDetails");
      setIsSubmitted(false);

      toast.success("Receipt downloaded successfully!");
    } catch (error) {
      console.error("Error downloading receipt:", error);
      toast.error("Failed to download receipt");
    }
  };

  return (
    <div className='bg-white rounded-lg p-6'>
      <div className='flex flex-col min-h-[600px]'>
        <div className='flex-1'>
          <div className='space-y-4 mb-6'>
            {preSelectedAgent ? null : (
              <Popover
                open={openCombobox}
                onOpenChange={handleOpenCombobox}
                modal={false}>
                <PopoverTrigger asChild>
                  <Button
                    variant='outline'
                    aria-label='Select agent'
                    className='w-full justify-between'>
                    {selectedAgent
                      ? agents.find((a) => a.id === selectedAgent)?.name
                      : "Select Agent"}
                    <ChevronsUpDown className='ml-2 h-4 w-4 opacity-50' />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className='w-[var(--radix-popover-trigger-width)] p-0'
                  align='start'>
                  <Command
                    filter={(value, search) => {
                      if (value.toLowerCase().includes(search.toLowerCase()))
                        return 1;
                      return 0;
                    }}
                    className='overflow-hidden'>
                    <CommandInput
                      placeholder='Search agent...'
                      className='h-9'
                    />
                    <CommandList>
                      {isLoadingAgents ? (
                        <div className='p-4 text-sm text-center text-muted-foreground'>
                          <Loader2 className='h-4 w-4 animate-spin mx-auto mb-2' />
                          Loading agents...
                        </div>
                      ) : (
                        <>
                          <CommandEmpty>No agent found.</CommandEmpty>
                          <CommandGroup>
                            {agents.map((agent) => (
                              <CommandItem
                                key={agent.id}
                                value={`${agent.name} ${agent.location}`}
                                onSelect={() => {
                                  setSelectedAgent(agent.id);
                                  setOpenCombobox(false);
                                  if (serialInputRef.current) {
                                    serialInputRef.current.focus();
                                  }
                                }}>
                                <Users className='mr-2 h-4 w-4' />
                                <span>{agent.name}</span>
                                <span className='ml-2 text-xs text-muted-foreground'>
                                  {agent.location}
                                </span>
                                <Check
                                  className={cn(
                                    "ml-auto h-4 w-4",
                                    selectedAgent === agent.id
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}

            <Input
              ref={serialInputRef}
              type='text'
              placeholder='Serial Number'
              value={serialNumber.toUpperCase()}
              onChange={handleSerialNumberChange}
              disabled={!selectedAgent}
              className='w-full'
            />
            {errorMessage && <p className='text-red-500'>{errorMessage}</p>}
          </div>

          {isSubmitted && meters.length === 0 && (
            <div className='mb-6 relative'>
              <Button
                onClick={handleDownloadReceipt}
                className='w-full bg-[#2ECC40] hover:bg-[#28a035] text-white'>
                Download Assignment Receipt
              </Button>
              <Button
                onClick={() => setIsSubmitted(false)}
                variant='ghost'
                size='icon'
                className='absolute -right-2 -top-2 h-6 w-6 rounded-full bg-gray-200 hover:bg-gray-300'
                aria-label='Dismiss'>
                <X className='h-4 w-4' />
              </Button>
            </div>
          )}

          {meters.length > 0 && (
            <>
              <Button
                onClick={handleAssignMeters}
                className='w-full bg-[#000080] hover:bg-[#000066] text-white mb-6'
                disabled={isAssigning}>
                {isAssigning ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Assigning Meters...
                  </>
                ) : (
                  (() => {
                    const meterText = meters.length > 1 ? "Meters" : "Meter";
                    const agentName =
                      agents.find((a) => a.id === selectedAgent)?.name ||
                      "Agent";
                    return `Assign ${meters.length} ${meterText} to ${agentName}`;
                  })()
                )}
              </Button>

              <div className='overflow-x-auto'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Serial Number</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className='text-right'>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {meters.map((meter, index) => (
                      <TableRow key={meter.id}>
                        <TableCell className='font-medium'>
                          {meter.serialNumber}
                        </TableCell>
                        <TableCell>{meter.type}</TableCell>
                        <TableCell className='text-right'>
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => handleRemoveMeter(index)}
                            className='h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100'>
                            <X className='h-4 w-4' />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
