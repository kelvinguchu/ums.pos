import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const skeletonMenuItems = [
  "Dashboard",
  "Sales",
  "Reports",
  "Daily Reports",
  "Users",
  "Agents",
];

export function NavigationMenuSkeleton() {
  return (
    <SidebarGroup className='w-full'>
      <SidebarGroupLabel className='text-sm font-medium text-gray-500 uppercase tracking-wider'>
        Menu
      </SidebarGroupLabel>
      <SidebarGroupContent className='mt-2 space-y-1 w-full'>
        <SidebarMenu className='w-full'>
          {skeletonMenuItems.map((label) => (
            <SidebarMenuItem key={`skeleton-${label}`} className='w-full'>
              <SidebarMenuButton
                disabled
                className={cn(
                  "w-full px-2 py-2.5 text-sm font-medium transition-colors",
                  "pointer-events-none",
                  "hover:bg-gray-50 hover:text-primary",
                  "focus:bg-gray-50 focus:text-primary focus:outline-none"
                )}>
                <div className='flex w-full items-center gap-3'>
                  <Skeleton className='h-4 w-4 rounded shrink-0' />
                  <Skeleton className='h-4 rounded flex-1 min-w-0' />
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
