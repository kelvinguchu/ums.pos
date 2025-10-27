import { Home, ShoppingCart, BarChart2, Users, PlusCircle, DollarSign, Calendar, HandPlatter, ArrowLeftCircle, SmilePlus } from "lucide-react";
import type { UserRole } from "@/lib/utils/rolePermissions";

export interface NavItem {
  title: string;
  url: string;
  icon: any;
  adminOnly?: boolean;
  requiresReportAccess?: boolean;
}

export interface ActionItem {
  title: string;
  icon: any;
  component?: React.ComponentType<any>;
  adminOnly?: boolean;
  requiresAuth?: boolean;
}

export const navigationItems: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Sales", url: "/sales", icon: ShoppingCart },
  { title: "Reports", url: "/reports", icon: BarChart2 },
  {
    title: "Daily Reports",
    url: "/daily-reports",
    icon: Calendar,
    adminOnly: false,
    requiresReportAccess: true,
  },
  { title: "Users", url: "/users", icon: Users },
  { title: "Agents", url: "/agents", icon: HandPlatter },
];

export const actionItems: ActionItem[] = [
  {
    title: "Sell Meters",
    icon: DollarSign,
    component: undefined,
  },
  {
    title: "Return Sold Meters",
    icon: ArrowLeftCircle,
    component: undefined,
    adminOnly: false,
    requiresAuth: true,
  },
  {
    title: "Assign Meters to Agent",
    icon: Users,
    component: undefined,
    adminOnly: false,
    requiresAuth: true,
  },
  {
    title: "Create User",
    icon: SmilePlus,
    component: undefined,
    adminOnly: true,
  },
  {
    title: "Create Agent",
    icon: HandPlatter,
    component: undefined,
    adminOnly: true,
  },
  {
    title: "Add Meters",
    icon: PlusCircle,
    component: undefined,
    adminOnly: true,
  },
];

export function hasNavigationAccess(item: NavItem, userRole: UserRole): boolean {
  if (item.requiresReportAccess) {
    return userRole === "admin" || userRole === "accountant";
  }
  if (item.adminOnly) {
    return userRole === "admin";
  }
  return true;
}

export function hasActionAccess(item: ActionItem, userRole: UserRole): boolean {
  if (item.adminOnly) {
    return userRole === "admin";
  }
  if (item.requiresAuth) {
    return userRole === "admin" || userRole === "accountant";
  }
  return true;
}