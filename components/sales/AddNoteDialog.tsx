"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { addOrUpdateSaleNote } from "@/lib/actions/sales";
import { useAuth } from "@/contexts/AuthContext";

interface AddNoteDialogProps {
  batchId: string;
  existingNote?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddNoteDialog({
  batchId,
  existingNote,
  open,
  onOpenChange,
  onSuccess,
}: Readonly<AddNoteDialogProps>) {
  const { user } = useAuth();
  const [note, setNote] = useState(existingNote || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!note.trim()) {
      toast.error("Please enter a note");
      return;
    }

    if (!user?.id) {
      toast.error("User not authenticated");
      return;
    }

    setIsSubmitting(true);

    try {
      await addOrUpdateSaleNote({
        batchId,
        note: note.trim(),
        userId: user.id,
      });

      toast.success(
        existingNote ? "Note updated successfully" : "Note added successfully"
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error saving note:", error);
      if (error instanceof Error && error.message === "ACCOUNT_DEACTIVATED") {
        toast.error("Your account has been deactivated");
      } else {
        toast.error("Failed to save note");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>{existingNote ? "Update Note" : "Add Note"}</DialogTitle>
          <DialogDescription>
            {existingNote
              ? "Update the note for this sale."
              : "Add a note to this sale for future reference."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className='grid gap-4 py-4'>
            <Textarea
              placeholder='Enter your note here...'
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={5}
              className='resize-none'
            />
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              )}
              {existingNote ? "Update Note" : "Add Note"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
