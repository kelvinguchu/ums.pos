import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { NavbarClient } from "@/components/navigation/NavbarClient";
import { AppSidebar } from "@/components/navigation/AppSidebar";
import { NavigationProgress } from "@/components/navigation/NavigationProgress";
import { PrefetchProvider } from "@/components/providers/PrefetchProvider";

export default function AppLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <PrefetchProvider>
      <SidebarProvider>
        <NavigationProgress />
        <NavbarClient />

        <div className='flex pt-16 w-full h-full px-2'>
          <AppSidebar />
          <SidebarInset>
            <div>{children}</div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </PrefetchProvider>
  );
}
