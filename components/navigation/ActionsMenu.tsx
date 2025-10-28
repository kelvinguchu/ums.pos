import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { ActionItem } from "./ActionItem";
import { ActionTitle } from "./hooks/useActionDialogs";

// Import action components
import AddMeterForm from "@/components/addmeter/AddMeterForm";
import SellMeters from "@/components/sellmeter/SellMeters";
import CreateUser from "@/components/users/CreateUser";
import AssignMetersToAgent from "@/components/agents/AssignMetersToAgent";
import CreateAgentDialog from "@/components/agents/CreateAgentDialog";
import ReturnSoldMeters from "@/components/returns/ReturnSoldMeters";

interface ActionComponent {
  component: React.ComponentType<any>;
}

const actionComponents: Record<string, ActionComponent> = {
  sellmeters: { component: SellMeters },
  returnsoldmeters: { component: ReturnSoldMeters },
  assignmeterstoagent: { component: AssignMetersToAgent },
  createuser: { component: CreateUser },
  createagent: { component: CreateAgentDialog },
  addmeters: { component: AddMeterForm },
};

interface ActionItemConfig {
  title: string;
  icon: any;
  adminOnly?: boolean;
  requiresAuth?: boolean;
}

interface ActionsMenuProps {
  items: ActionItemConfig[];
  actionStateMap: Record<
    ActionTitle,
    {
      isOpen: boolean;
      setIsOpen: (value: boolean) => void;
      isDialog?: boolean;
    }
  >;
  user: any;
  currentUserData: { id: string; name: string };
}

export function ActionsMenu({
  items,
  actionStateMap,
  user,
  currentUserData,
}: Readonly<ActionsMenuProps>) {
  return (
    <SidebarGroup className='mt-2'>
      <SidebarGroupLabel className='px-2 text-sm font-medium text-gray-500 uppercase tracking-wider'>
        Actions
      </SidebarGroupLabel>
      <SidebarGroupContent className='mt-2 space-y-1'>
        <SidebarMenu>
          {items.map((item) => {
            const actionKey = item.title.toLowerCase().replaceAll(/\s+/g, "");
            const Component = actionComponents[actionKey]?.component;
            const state = actionStateMap[item.title as ActionTitle];

            if (!Component || !state) return null;

            return (
              <ActionItem
                key={item.title}
                title={item.title}
                icon={item.icon}
                Component={Component}
                isOpen={state.isOpen}
                isDialog={state.isDialog}
                user={user}
                currentUserData={currentUserData}
                onOpenChange={state.setIsOpen}
              />
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
