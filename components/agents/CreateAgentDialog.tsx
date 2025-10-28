"use client";

import { useState } from "react";
import {
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createAgent } from "@/lib/actions/agents";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { KENYA_COUNTIES, type KenyaCounty } from "@/lib/constants/locationData";

interface CreateAgentDialogProps {
  onClose: () => void;
  onAgentCreated: () => void;
}

export default function CreateAgentDialog({
  onClose,
  onAgentCreated,
}: Readonly<CreateAgentDialogProps>) {
  const [formData, setFormData] = useState({
    name: "",
    phone_number: "",
    location: "",
    county: "Nairobi" as KenyaCounty,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [openCombobox, setOpenCombobox] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate phone number format
      const phoneRegex = /^\+?[0-9]{10,15}$/;
      if (!phoneRegex.test(formData.phone_number)) {
        throw new Error("Invalid phone number format");
      }

      await createAgent(formData);

      toast.success("Agent created successfully");

      onAgentCreated();
      onClose();
      setFormData({
        name: "",
        phone_number: "",
        location: "",
        county: "Nairobi",
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to create agent");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='max-w-[500px] max-h-[90vh] overflow-y-auto'>
      <DialogHeader>
        <DialogTitle>Create New Agent</DialogTitle>
        <DialogDescription>
          Fill in the details below to create a new agent.
        </DialogDescription>
      </DialogHeader>
      <div className='py-4 px-2'>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='name'>Name</Label>
            <Input
              id='name'
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder='Agent Name'
              required
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='phone'>Phone Number</Label>
            <Input
              id='phone'
              value={formData.phone_number}
              onChange={(e) =>
                setFormData({ ...formData, phone_number: e.target.value })
              }
              placeholder='+254700000000'
              required
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='location'>Location</Label>
            <Input
              id='location'
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              placeholder='Agent Location'
              required
            />
          </div>
          <div className='space-y-2'>
            <Label>County</Label>
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant='outline'
                  role='combobox'
                  aria-expanded={openCombobox}
                  className='w-full justify-between bg-white border-2 border-gray-200 hover:border-primary transition-colors font-medium'>
                  {formData.county || "Select county..."}
                  <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-full p-0'>
                <Command className='w-full'>
                  <CommandInput
                    placeholder='Search county...'
                    className='h-9 border-none focus:ring-0'
                  />
                  <CommandList className='max-h-[300px] overflow-y-auto'>
                    <CommandEmpty>No county found.</CommandEmpty>
                    <CommandGroup>
                      {KENYA_COUNTIES.map((county) => (
                        <CommandItem
                          key={county}
                          value={county}
                          onSelect={(currentValue) => {
                            setFormData((prev) => ({
                              ...prev,
                              county: currentValue as KenyaCounty,
                            }));
                            setOpenCombobox(false);
                          }}
                          className='hover:bg-primary/10 cursor-pointer font-medium'>
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.county === county
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {county}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={onClose}
              disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={isLoading}
              className='bg-primary hover:bg-[#000066]'>
              {isLoading ? "Creating..." : "Create Agent"}
            </Button>
          </DialogFooter>
        </form>
      </div>
    </div>
  );
}
