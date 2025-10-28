"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Eye, EyeOff } from "lucide-react";
import { changePassword } from "@/lib/actions/users";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
  userId,
}: Readonly<ChangePasswordDialogProps>) {
  const [newPassword, setNewPassword] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const queryClient = useQueryClient();

  const toggleVisibility = () => setIsVisible((prev) => !prev);

  const handleChangePassword = async () => {
    if (!newPassword.trim() || !userId) {
      toast.error("Password cannot be empty");
      return;
    }

    try {
      await changePassword(userId, newPassword);
      toast.success("Password changed successfully. Please sign in again.");

      queryClient.clear();

      setTimeout(() => {
        globalThis.window.location.href = "/signin";
      }, 1500);
    } catch (error: any) {
      toast.error(error.message || "Failed to change password");
    } finally {
      onOpenChange(false);
      setNewPassword("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='bg-gray-50 border-gray-200 px-2'>
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
        </DialogHeader>
        <div className='relative'>
          <Input
            id='new-password'
            className='pe-9'
            placeholder='Enter new password'
            type={isVisible ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <button
            className='absolute inset-y-px end-px flex h-full w-9 items-center justify-center rounded-e-lg text-muted-foreground/80 cursor-pointer'
            type='button'
            onClick={toggleVisibility}>
            {isVisible ? (
              <EyeOff size={16} strokeWidth={2} />
            ) : (
              <Eye size={16} strokeWidth={2} />
            )}
          </button>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant='outline' className='cursor-pointer'>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleChangePassword} className='cursor-pointer'>
            Change Password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
