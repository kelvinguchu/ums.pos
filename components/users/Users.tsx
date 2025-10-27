"use client";

import { useState } from "react";
import { useUsersData } from "./hooks/useUsersData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Edit2,
  Shield,
  UserMinus,
  UserPlus,
  MoreVertical,
  RefreshCw,
  Eye,
  EyeOff,
  Search,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { changePassword } from "@/lib/actions/users";
import { adminChangePassword } from "@/lib/actions/serverActions";
import { useQueryClient } from "@tanstack/react-query";

export default function UsersPage() {
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newName, setNewName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeactivated, setShowDeactivated] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showChangePasswordDialog, setShowChangePasswordDialog] =
    useState(false);
  const [showEditNameDialog, setShowEditNameDialog] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [passwordChangeUserId, setPasswordChangeUserId] = useState<
    string | null
  >(null);
  const [targetUserName, setTargetUserName] = useState<string>("");
  const itemsPerPage = 10;
  const queryClient = useQueryClient();

  const { users, currentUser, isLoading, error, updateUser, refetch } =
    useUsersData(showDeactivated);

  const handleUpdateName = async () => {
    if (!editingUser || !newName.trim()) {
      toast.error("Invalid user or name");
      return;
    }

    try {
      await updateUser({
        userId: editingUser.id,
        updates: { name: newName },
      });

      toast.success("User name updated successfully");
      setEditingUser(null);
      setNewName("");
      setShowEditNameDialog(false);
    } catch (error) {
      toast.error("Failed to update user name");
    }
  };

  const handleChangeRole = async (user: any, newRole: string) => {
    try {
      await updateUser({
        userId: user.id,
        updates: { role: newRole },
      });

      toast.success(`User role updated to ${newRole}`);
    } catch (error) {
      toast.error("Failed to update user role");
    }
  };

  const handleToggleStatus = async (user: any) => {
    try {
      const newStatus = !user.isActive;
      await updateUser({
        userId: user.id,
        updates: { is_active: newStatus },
      });

      toast.success(
        `User ${newStatus ? "activated" : "deactivated"} successfully`
      );
    } catch (error) {
      toast.error("Failed to update user status");
    }
  };

  const openChangePasswordDialog = (userId: string, userName: string) => {
    setPasswordChangeUserId(userId);
    setTargetUserName(userName);
    setNewPassword("");
    setShowChangePasswordDialog(true);
  };

  const handleChangePassword = async () => {
    if (!passwordChangeUserId || !newPassword.trim()) {
      toast.error("Password cannot be empty");
      return;
    }

    try {
      // Use different methods based on whether it's the current user or admin changing someone else's password
      if (passwordChangeUserId === currentUser?.id) {
        await changePassword(passwordChangeUserId, newPassword);
      } else {
        await adminChangePassword(passwordChangeUserId, newPassword);
      }

      toast.success(
        passwordChangeUserId === currentUser?.id
          ? "Password changed successfully. Please sign in again."
          : "User password changed successfully."
      );

      // If changing own password, clear cache and redirect
      if (passwordChangeUserId === currentUser?.id) {
        // Clear any cached data
        queryClient.clear();

        // Redirect to signin page after a short delay
        setTimeout(() => {
          window.location.href = "/signin";
        }, 1500);
      } else {
        // Just invalidate queries if admin changing someone else's password
        queryClient.invalidateQueries({ queryKey: ["users"] });
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to change password");
    } finally {
      setShowChangePasswordDialog(false);
      setNewPassword("");
      setPasswordChangeUserId(null);
    }
  };

  const toggleVisibility = () => setIsVisible((prevState) => !prevState);

  // Filter and pagination logic
  const filteredAndPaginatedUsers = () => {
    let filtered = [...users]; // Create a copy of the users array

    // First, sort the array to put current user at the top
    if (currentUser) {
      filtered.sort((a, b) => {
        if (a.id === currentUser.id) return -1;
        if (b.id === currentUser.id) return 1;
        return 0;
      });
    }

    // Then apply search filter if there's a search term
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.role.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return {
      paginatedUsers: filtered.slice(startIndex, endIndex),
      totalPages: Math.ceil(filtered.length / itemsPerPage),
      totalUsers: filtered.length,
    };
  };

  // Add refresh handler
  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success("Users list refreshed");
    } catch (error) {
      toast.error("Failed to refresh data");
    }
  };

  if (error) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] gap-4'>
        <div className='text-lg text-red-500'>Error: {error.message}</div>
        <Button onClick={() => refetch()} variant='outline'>
          <RefreshCw className='mr-2 h-4 w-4' />
          Retry
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-[60vh]'>
        <Loader2 className='h-8 w-8 animate-spin text-gray-600' />
      </div>
    );
  }

  return (
    <div className='container w-full'>
      {/* Password Change Dialog - Shared for all users */}
      <Dialog
        open={showChangePasswordDialog}
        onOpenChange={setShowChangePasswordDialog}>
        <DialogContent className=''>
          <DialogHeader>
            <DialogTitle>
              {passwordChangeUserId === currentUser?.id
                ? "Change Your Password"
                : `Change Password for ${targetUserName}`}
            </DialogTitle>
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
              className='absolute inset-y-px end-px flex h-full w-9 items-center justify-center rounded-e-lg text-muted-foreground/80 ring-offset-background transition-shadow hover:text-foreground focus-visible:border focus-visible:border-ring focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'
              type='button'
              onClick={toggleVisibility}
              aria-label={isVisible ? "Hide password" : "Show password"}
              aria-pressed={isVisible}
              aria-controls='new-password'>
              {isVisible ? (
                <EyeOff size={16} strokeWidth={2} aria-hidden='true' />
              ) : (
                <Eye size={16} strokeWidth={2} aria-hidden='true' />
              )}
            </button>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button
                variant='outline'
                onClick={() => {
                  setNewPassword("");
                  setPasswordChangeUserId(null);
                }}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={() => {
                handleChangePassword();
              }}>
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <h1 className='text-3xl font-bold mb-6 text-center drop-shadow-lg'>
        Users
      </h1>

      <div className='mb-6 mt-4 space-y-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-2'>
            <Switch
              id='show-deactivated'
              checked={showDeactivated}
              onCheckedChange={setShowDeactivated}
            />
            <Label htmlFor='show-deactivated'>Show deactivated users</Label>
          </div>
          <div className='flex items-center gap-4'>
            {/* Add refresh button */}
            <Button
              variant='outline'
              size='icon'
              onClick={handleRefresh}
              className='hover:bg-gray-100'>
              <RefreshCw className='h-4 w-4' />
            </Button>
            <div className='text-sm text-muted-foreground font-medium'>
              Total: {filteredAndPaginatedUsers().totalUsers} users
            </div>
          </div>
        </div>

        <div className='relative w-full md:w-72'>
          <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='Search users...'
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className='pl-8'
          />
        </div>
      </div>

      <div className='overflow-auto'>
        <div className='min-w-[300px]'>
          {/* Desktop View */}
          <div className='hidden md:block'>
            <Table className='w-full'>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-1/3'>Name</TableHead>
                  <TableHead className='w-1/3'>Role</TableHead>
                  <TableHead className='w-1/3'>Status</TableHead>
                  <TableHead className='w-1/4'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndPaginatedUsers().paginatedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className='font-medium'>
                      <div className='flex items-center gap-2'>
                        {user.name}
                        {user.id === currentUser?.id && (
                          <Badge
                            variant='secondary'
                            className='bg-[#000080] text-white'>
                            You
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant='outline'
                        className={`${
                          user.role === "admin"
                            ? "bg-green-100"
                            : user.role === "accountant"
                              ? "bg-purple-100"
                              : "bg-yellow-100"
                        }`}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant='outline'
                        className={
                          user.isActive ? "bg-green-100" : "bg-red-100"
                        }>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {currentUser &&
                        (user.id === currentUser.id ||
                          currentUser.role === "admin") && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant='ghost' size='sm'>
                                <MoreVertical className='h-4 w-4' />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='end'>
                              {user.id === currentUser.id && (
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    openChangePasswordDialog(
                                      user.id,
                                      user.name
                                    );
                                  }}>
                                  <Edit2 className='mr-2 h-4 w-4' />
                                  Change Password
                                </DropdownMenuItem>
                              )}

                              {currentUser.role === "admin" &&
                                user.id !== currentUser.id && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <Dialog
                                      open={showEditNameDialog}
                                      onOpenChange={setShowEditNameDialog}>
                                      <DialogTrigger asChild>
                                        <DropdownMenuItem
                                          onSelect={(e) => {
                                            e.preventDefault();
                                            setEditingUser(user);
                                            setNewName(user.name);
                                            setShowEditNameDialog(true);
                                          }}>
                                          <Edit2 className='mr-2 h-4 w-4' />
                                          Edit Name
                                        </DropdownMenuItem>
                                      </DialogTrigger>
                                      <DialogContent className=''>
                                        <DialogHeader>
                                          <DialogTitle>
                                            Edit User Name
                                          </DialogTitle>
                                        </DialogHeader>
                                        <Input
                                          value={newName}
                                          onChange={(e) =>
                                            setNewName(e.target.value)
                                          }
                                          placeholder='Enter new name'
                                        />
                                        <DialogFooter>
                                          <DialogClose asChild>
                                            <Button
                                              variant='outline'
                                              onClick={() => {
                                                setEditingUser(null);
                                                setNewName("");
                                                setShowEditNameDialog(false);
                                              }}>
                                              Cancel
                                            </Button>
                                          </DialogClose>
                                          <Button
                                            onClick={() => {
                                              handleUpdateName();
                                              setNewName("");
                                            }}>
                                            Save
                                          </Button>
                                        </DialogFooter>
                                      </DialogContent>
                                    </Dialog>

                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleChangeRole(user, "admin")
                                      }
                                      disabled={user.role === "admin"}>
                                      <Shield className='mr-2 h-4 w-4' />
                                      Set as Admin
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleChangeRole(user, "accountant")
                                      }
                                      disabled={user.role === "accountant"}>
                                      <Shield className='mr-2 h-4 w-4 text-purple-500' />
                                      Set as Accountant
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleChangeRole(user, "user")
                                      }
                                      disabled={user.role === "user"}>
                                      <Shield className='mr-2 h-4 w-4 text-yellow-500' />
                                      Set as User
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      onClick={() => handleToggleStatus(user)}>
                                      {user.isActive ? (
                                        <>
                                          <UserMinus className='mr-2 h-4 w-4' />
                                          Deactivate User
                                        </>
                                      ) : (
                                        <>
                                          <UserPlus className='mr-2 h-4 w-4' />
                                          Activate User
                                        </>
                                      )}
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      onClick={() =>
                                        openChangePasswordDialog(
                                          user.id,
                                          user.name
                                        )
                                      }>
                                      <Edit2 className='mr-2 h-4 w-4 text-blue-500' />
                                      Change Password
                                    </DropdownMenuItem>
                                  </>
                                )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile View */}
          <div className='block md:hidden'>
            <Table className='w-full'>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className='text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndPaginatedUsers().paginatedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className='font-medium'>
                      <div className='flex items-center gap-2'>
                        {user.name}
                        {user.id === currentUser?.id && (
                          <Badge
                            variant='secondary'
                            className='bg-[#000080] text-white'>
                            You
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant='outline'
                        className={`${
                          user.role === "admin"
                            ? "bg-green-100"
                            : user.role === "accountant"
                              ? "bg-purple-100"
                              : "bg-yellow-100"
                        }`}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant='outline'
                        className={
                          user.isActive ? "bg-green-100" : "bg-red-100"
                        }>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {currentUser &&
                        (user.id === currentUser.id ||
                          currentUser.role === "admin") && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant='ghost' size='sm'>
                                <MoreVertical className='h-4 w-4' />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='end'>
                              {user.id === currentUser.id && (
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    openChangePasswordDialog(
                                      user.id,
                                      user.name
                                    );
                                  }}>
                                  <Edit2 className='mr-2 h-4 w-4' />
                                  Change Password
                                </DropdownMenuItem>
                              )}

                              {currentUser.role === "admin" &&
                                user.id !== currentUser.id && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <Dialog
                                      open={showEditNameDialog}
                                      onOpenChange={setShowEditNameDialog}>
                                      <DialogTrigger asChild>
                                        <DropdownMenuItem
                                          onSelect={(e) => {
                                            e.preventDefault();
                                            setEditingUser(user);
                                            setNewName(user.name);
                                            setShowEditNameDialog(true);
                                          }}>
                                          <Edit2 className='mr-2 h-4 w-4' />
                                          Edit Name
                                        </DropdownMenuItem>
                                      </DialogTrigger>
                                      <DialogContent className=''>
                                        <DialogHeader>
                                          <DialogTitle>
                                            Edit User Name
                                          </DialogTitle>
                                        </DialogHeader>
                                        <Input
                                          value={newName}
                                          onChange={(e) =>
                                            setNewName(e.target.value)
                                          }
                                          placeholder='Enter new name'
                                        />
                                        <DialogFooter>
                                          <DialogClose asChild>
                                            <Button
                                              variant='outline'
                                              onClick={() => {
                                                setEditingUser(null);
                                                setNewName("");
                                                setShowEditNameDialog(false);
                                              }}>
                                              Cancel
                                            </Button>
                                          </DialogClose>
                                          <Button
                                            onClick={() => {
                                              handleUpdateName();
                                              setNewName("");
                                            }}>
                                            Save
                                          </Button>
                                        </DialogFooter>
                                      </DialogContent>
                                    </Dialog>

                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleChangeRole(user, "admin")
                                      }
                                      disabled={user.role === "admin"}>
                                      <Shield className='mr-2 h-4 w-4' />
                                      Set as Admin
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleChangeRole(user, "accountant")
                                      }
                                      disabled={user.role === "accountant"}>
                                      <Shield className='mr-2 h-4 w-4 text-purple-500' />
                                      Set as Accountant
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleChangeRole(user, "user")
                                      }
                                      disabled={user.role === "user"}>
                                      <Shield className='mr-2 h-4 w-4 text-yellow-500' />
                                      Set as User
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      onClick={() => handleToggleStatus(user)}>
                                      {user.isActive ? (
                                        <>
                                          <UserMinus className='mr-2 h-4 w-4' />
                                          Deactivate User
                                        </>
                                      ) : (
                                        <>
                                          <UserPlus className='mr-2 h-4 w-4' />
                                          Activate User
                                        </>
                                      )}
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      onClick={() =>
                                        openChangePasswordDialog(
                                          user.id,
                                          user.name
                                        )
                                      }>
                                      <Edit2 className='mr-2 h-4 w-4 text-blue-500' />
                                      Change Password
                                    </DropdownMenuItem>
                                  </>
                                )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {filteredAndPaginatedUsers().totalPages > 1 && (
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

              {Array.from({
                length: filteredAndPaginatedUsers().totalPages,
              }).map((_, i) => {
                const page = i + 1;
                if (
                  page === 1 ||
                  page === filteredAndPaginatedUsers().totalPages ||
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
                    setCurrentPage((prev) =>
                      Math.min(prev + 1, filteredAndPaginatedUsers().totalPages)
                    )
                  }
                  className={cn(
                    currentPage === filteredAndPaginatedUsers().totalPages &&
                      "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
