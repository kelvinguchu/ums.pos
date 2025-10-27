"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePagePrefetch } from "@/hooks/use-page-prefetch";

interface NavigationItem {
  title: string;
  url: string;
  icon: any;
  requiresReportAccess?: boolean;
  adminOnly?: boolean;
}

interface NavigationMenuProps {
  items: NavigationItem[];
  currentPath: string;
}

export function NavigationMenu({ items, currentPath }: NavigationMenuProps) {
  const { prefetchPage } = usePagePrefetch();

  return (
    <SidebarGroup>
      <SidebarGroupLabel className='text-sm font-medium text-gray-500 uppercase tracking-wider'>
        Menu
      </SidebarGroupLabel>
      <SidebarGroupContent className='mt-2 space-y-1'>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={currentPath === item.url}
                className={cn(
                  "w-full px-2 py-2.5 text-sm font-medium transition-colors",
                  "hover:bg-gray-50 hover:text-[#000080]",
                  "focus:bg-gray-50 focus:text-[#000080] focus:outline-none",
                  currentPath === item.url &&
                    "bg-[#000080]/5 text-[#000080] font-semibold"
                )}
                onMouseEnter={() => prefetchPage(item.url)}>
                <Link href={item.url} className='flex items-center'>
                  <item.icon className='mr-3 h-4 w-4' />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
