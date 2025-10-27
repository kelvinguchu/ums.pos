import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { ActionItemSkeleton } from "./ActionItemSkeleton";

const skeletonActionItems = [
  "Sell Meters",
  "Return Sold Meters",
  "Assign Meters to Agent",
  "Create User",
  "Create Agent",
  "Add Meters",
];

export function ActionsMenuSkeleton() {
  return (
    <SidebarGroup className='mt-2 w-full'>
      <SidebarGroupLabel className='px-2 text-sm font-medium text-gray-500 uppercase tracking-wider'>
        Actions
      </SidebarGroupLabel>
      <SidebarGroupContent className='mt-2 space-y-1 w-full'>
        <SidebarMenu className='w-full'>
          {skeletonActionItems.map((label) => (
            <ActionItemSkeleton key={`action-skeleton-${label}`} />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
