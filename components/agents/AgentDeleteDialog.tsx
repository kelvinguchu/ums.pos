"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import AgentDeletionSheet from "./AgentDeletionSheet";

interface Agent {
  id: string;
  name: string;
  phone_number: string;
  location: string;
  is_active: boolean | null;
}

interface CurrentUser {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  is_active?: boolean | null;
}

interface AgentDeleteDialogProps {
  isOpen: boolean;
  isDeletionSheetOpen: boolean;
  agent: Agent | null;
  inventory: any[];
  currentUser: CurrentUser | null | undefined;
  onOpenChange: (open: boolean) => void;
  onDeletionSheetOpenChange: (open: boolean) => void;
  onDelete: (
    scannedMeters?: string[],
    unscannedMeters?: string[]
  ) => Promise<void>;
  isMobile?: boolean;
}

export default function AgentDeleteDialog({
  isOpen,
  isDeletionSheetOpen,
  agent,
  inventory,
  currentUser,
  onOpenChange,
  onDeletionSheetOpenChange,
  onDelete,
  isMobile = false,
}: Readonly<AgentDeleteDialogProps>) {
  return (
    <>
      <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
        <AlertDialogContent
          className={
            isMobile
              ? "w-[95%] sm:w-full sm:max-w-lg"
              : "min-w-[700px] bg-gray-50 border-gray-200 px-2"
          }>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent: {agent?.name}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {inventory.length > 0 ? (
                  <>
                    <p>
                      This agent has {inventory.length} meters in their
                      inventory.
                    </p>
                    <p className='mt-2'>Choose how to proceed:</p>
                  </>
                ) : (
                  <p>
                    Are you sure you want to delete this agent? This action
                    cannot be undone.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter
            className={isMobile ? "flex flex-col sm:flex-row gap-2" : ""}>
            <AlertDialogCancel
              className={isMobile ? "mt-0 cursor-pointer" : "cursor-pointer"}>
              Cancel
            </AlertDialogCancel>
            {inventory.length > 0 ? (
              <>
                <Button
                  variant='destructive'
                  onClick={async () => {
                    onOpenChange(false);
                    await onDelete();
                  }}
                  className={
                    isMobile
                      ? "flex-1 sm:flex-none cursor-pointer"
                      : "cursor-pointer"
                  }>
                  Continue Delete Without Scan
                </Button>
                <Button
                  onClick={() => {
                    onOpenChange(false);
                    onDeletionSheetOpenChange(true);
                  }}
                  className={
                    isMobile
                      ? "bg-primary hover:bg-[#000066] flex-1 sm:flex-none cursor-pointer"
                      : "bg-primary hover:bg-[#000066] cursor-pointer"
                  }>
                  Scan To Delete
                </Button>
              </>
            ) : (
              <AlertDialogAction
                onClick={async () => await onDelete()}
                className='bg-red-600 hover:bg-red-700 cursor-pointer'>
                Delete
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deletion Sheet for scanning meters */}
      <Sheet
        open={isDeletionSheetOpen}
        onOpenChange={onDeletionSheetOpenChange}>
        <SheetContent
          side='right'
          className='w-[90%] sm:min-w-[50vw] bg-gray-50 border-l border-gray-200 px-2'>
          <SheetHeader>
            <SheetTitle>Delete Agent</SheetTitle>
          </SheetHeader>
          <AgentDeletionSheet
            agent={agent}
            inventory={inventory}
            currentUser={currentUser}
            onDelete={onDelete}
            onClose={() => onDeletionSheetOpenChange(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
