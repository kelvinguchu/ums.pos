import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { NavbarClient } from "@/components/navigation/NavbarClient";
import { AppSidebar } from "@/components/navigation/AppSidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <NavbarClient />

      <div className="flex pt-16 w-full h-full px-2">
        <AppSidebar />
        <SidebarInset>
          <div >
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}