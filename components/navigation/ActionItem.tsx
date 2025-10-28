import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

interface ActionItemProps {
  title: string;
  icon: any;
  Component: React.ComponentType<any>;
  isOpen: boolean;
  isDialog?: boolean;
  user: any;
  currentUserData: { id: string; name: string };
  onOpenChange: (open: boolean) => void;
}

// Helper function for icon colors
const getIconColorClass = (title: string): string => {
  const colorMap: Record<string, string> = {
    "Sell Meters": "text-blue-600 group-hover:text-blue-700",
    "Return Sold Meters": "text-red-600 group-hover:text-red-700",
    "Assign Meters to Agent": "text-orange-600 group-hover:text-orange-700",
    "Add Meters": "text-green-600 group-hover:text-green-700",
    "Create User": "text-purple-600 group-hover:text-purple-700",
    "Create Agent": "text-yellow-600 group-hover:text-yellow-700",
  };
  return colorMap[title] || "text-gray-600 group-hover:text-gray-700";
};

// Helper function for sheet className
const getSheetClassName = (title: string): string => {
  if (title === "Sell Meters")
    return "w-full min-w-[50vw] max-h-[100vh] p-0 bg-gray-50 border-l border-gray-200 px-2 flex flex-col overflow-hidden";
  if (title === "Add Meters")
    return "min-w-[60vw] max-h-[100vh] bg-gray-50 border-l border-gray-200 p-6 flex flex-col overflow-hidden";
  return "min-w-[70vw] max-h-[100vh] bg-gray-50 border-l border-gray-200 px-2 flex flex-col overflow-hidden";
};

// Helper function to render sheet content
const renderSheetContent = (
  title: string,
  Component: React.ComponentType<any>,
  user: any,
  currentUserData: { id: string; name: string }
) => {
  if (title === "Sell Meters") {
    return <Component currentUser={user} />;
  }

  if (title === "Return Sold Meters") {
    return (
      <>
        <SheetHeader>
          <SheetTitle className='text-left flex items-center gap-2'>
            <span>{title}</span>
            <Badge variant='outline' className='bg-red-100'>
              Return Process
            </Badge>
          </SheetTitle>
        </SheetHeader>
        <Component currentUser={currentUserData} />
      </>
    );
  }

  if (title === "Add Meters") {
    return (
      <>
        <SheetHeader>
          <SheetTitle className='text-left flex items-center gap-2'>
            <Badge variant='outline' className='bg-green-100'>
              {user?.name}
            </Badge>
          </SheetTitle>
        </SheetHeader>
        <Component currentUser={currentUserData} />
      </>
    );
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle className='text-left flex items-center gap-2'>
          <span>{title}</span>
        </SheetTitle>
      </SheetHeader>
      <Component currentUser={currentUserData} />
    </>
  );
};

export function ActionItem({
  title,
  icon: Icon,
  Component,
  isOpen,
  isDialog,
  user,
  currentUserData,
  onOpenChange,
}: Readonly<ActionItemProps>) {
  const TriggerButton = (
    <SidebarMenuButton className='w-full px-2 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50 group cursor-pointer'>
      <Icon className={`mr-3 h-4 w-4 ${getIconColorClass(title)}`} />
      <span>{title}</span>
    </SidebarMenuButton>
  );

  if (isDialog) {
    return (
      <SidebarMenuItem>
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
          <DialogTrigger asChild>{TriggerButton}</DialogTrigger>
          <DialogContent className='bg-gray-50 border-gray-200 px-2'>
            <Component
              onClose={() => onOpenChange(false)}
              onAgentCreated={() => onOpenChange(false)}
            />
          </DialogContent>
        </Dialog>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>{TriggerButton}</SheetTrigger>
        <SheetContent
          className={getSheetClassName(title)}
          side={title === "Sell Meters" ? "right" : undefined}>
          {renderSheetContent(title, Component, user, currentUserData)}
        </SheetContent>
      </Sheet>
    </SidebarMenuItem>
  );
}
