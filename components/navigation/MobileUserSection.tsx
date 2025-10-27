import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { NotificationBell } from "@/components/NotificationBell";
import { cn } from "@/lib/utils";

interface MobileUserSectionProps {
  user: {
    name?: string | null;
    email?: string | null;
  } | null;
  safeUserRole: string | null;
}

// Helper function for role badge colors
const getRoleBadgeClass = (role: string | null): string => {
  if (role === "admin") return "bg-green-100 text-green-700";
  if (role === "accountant") return "bg-purple-100 text-purple-700";
  return "bg-yellow-100 text-yellow-700";
};

export function MobileUserSection({
  user,
  safeUserRole,
}: MobileUserSectionProps) {
  return (
    <>
      <SidebarGroup className='mt-8'>
        <SidebarGroupLabel className='px-2 text-sm font-medium text-gray-500 uppercase tracking-wider'>
          Notifications
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <NotificationBell />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup className='mt-auto'>
        <SidebarGroupContent>
          <div className='p-6 border-t bg-gray-50/50'>
            <div className='flex items-center gap-2'>
              <span className='text-sm font-medium text-gray-900'>
                {user?.name}
              </span>
              <Badge
                variant='outline'
                className={cn("ml-auto", getRoleBadgeClass(safeUserRole))}>
                {safeUserRole || "User"}
              </Badge>
            </div>
            <p className='text-xs text-gray-500 mt-1'>{user?.email}</p>
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  );
}
