"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { User, LogOut, Edit2 } from "lucide-react";
import { signOut } from "@/lib/actions/users";
import { useQueryClient } from "@tanstack/react-query";
import { ChangePasswordDialog } from "./ChangePasswordDialog";

interface UserProfileMenuProps {
  user: {
    id: string;
    name?: string | null;
    email?: string;
  } | null;
  userRole: string | null | undefined;
  updateAuthState: (state: any) => void;
}

export function UserProfileMenu({
  user,
  userRole,
  updateAuthState,
}: UserProfileMenuProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showChangePasswordDialog, setShowChangePasswordDialog] =
    useState(false);
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    try {
      setIsLoading(true);

      queryClient.clear();

      updateAuthState({
        user: null,
        userRole: undefined,
        isAuthenticated: false,
        isLoading: false,
      });

      await signOut();

      globalThis.window.location.href = "/signin";
    } catch (error) {
      console.error("Logout error:", error);
      globalThis.window.location.href = "/signin";
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleBadgeColor = () => {
    if (userRole === "admin") return "bg-green-100";
    if (userRole === "accountant") return "bg-purple-100";
    return "bg-yellow-100";
  };

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant='ghost'
            className='relative flex items-center gap-2 rounded-full px-3 py-2 bg-gradient-to-r from-[#000080]/10 to-blue-500/10 hover:from-[#000080]/20 hover:to-blue-500/20 transition-all duration-200'
            id='user-profile-button'>
            <User className='h-4 w-4 text-[#000080]' />
            <span className='text-sm font-medium text-[#000080]'>
              {user?.name?.split(" ")[0]}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-80' align='end'>
          <div className='flex flex-col space-y-4 p-2'>
            <div className='flex flex-col space-y-1'>
              <p className='text-sm font-medium'>{user?.name}</p>
              <p className='text-xs text-gray-500'>{user?.email}</p>
              <Badge
                variant='outline'
                className={`${getRoleBadgeColor()} w-fit`}>
                {userRole}
              </Badge>
            </div>

            <Button
              variant='outline'
              className='w-full justify-start'
              onClick={() => setShowChangePasswordDialog(true)}>
              <Edit2 className='mr-2 h-4 w-4' />
              Change Password
            </Button>

            <Button
              variant='outline'
              className='w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50'
              onClick={handleLogout}
              disabled={isLoading}>
              <LogOut className='mr-2 h-4 w-4' />
              Logout
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {user && (
        <ChangePasswordDialog
          open={showChangePasswordDialog}
          onOpenChange={setShowChangePasswordDialog}
          userId={user.id}
        />
      )}
    </>
  );
}
