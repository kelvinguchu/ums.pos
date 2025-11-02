"use client";

import { useState, useTransition } from "react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { usePagePrefetch } from "@/hooks/use-page-prefetch";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

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

export function NavigationMenu({
  items,
  currentPath,
}: Readonly<NavigationMenuProps>) {
  const { prefetchPage } = usePagePrefetch();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [clickedUrl, setClickedUrl] = useState<string | null>(null);

  const handleNavigation = (url: string) => {
    // Don't navigate if already on this page
    if (currentPath === url) return;

    // Set the clicked URL for loading state
    setClickedUrl(url);

    // Dispatch custom event for global loading indicator
    globalThis.window.dispatchEvent(new CustomEvent("navigation-start"));

    // Use startTransition for non-blocking navigation
    startTransition(() => {
      router.push(url);
    });
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel className='text-sm font-medium text-gray-500 uppercase tracking-wider'>
        Menu
      </SidebarGroupLabel>
      <SidebarGroupContent className='mt-2 space-y-1'>
        <SidebarMenu>
          {items.map((item) => {
            const isNavigating = clickedUrl === item.url && isPending;
            const isActive = currentPath === item.url;

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  isActive={isActive}
                  tooltip={{
                    children: item.title,
                    hidden: false,
                    side: "right",
                    sideOffset: 8,
                  }}
                  className={cn(
                    "w-full px-2 py-2.5 cursor-pointer text-sm font-medium transition-all duration-150",
                    "hover:bg-gray-50 hover:text-primary",
                    "focus:bg-gray-50 focus:text-primary focus:outline-none",
                    isActive &&
                      "bg-primary text-white font-semibold shadow-sm border-l-4 border-primary",
                    isNavigating &&
                      "bg-primary/10 text-primary opacity-70 cursor-wait"
                  )}
                  onMouseEnter={() => prefetchPage(item.url)}
                  onClick={() => handleNavigation(item.url)}>
                  {isNavigating ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    <item.icon className='h-4 w-4' />
                  )}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
