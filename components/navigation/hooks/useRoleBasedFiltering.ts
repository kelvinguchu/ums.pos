import { useMemo } from "react";
import { navigationItems, actionItems } from "@/lib/config/navigation";

interface RoleChecks {
  isAdmin: boolean;
  isAccountant: boolean;
  hasReportsAccess: boolean;
}

export function useRoleBasedFiltering(safeUserRole: string | null) {
  // Memoize role checks
  const roleChecks = useMemo<RoleChecks>(() => {
    const isAdmin = safeUserRole === "admin";
    const isAccountant = safeUserRole === "accountant";
    const hasReportsAccess = isAdmin || isAccountant;

    return { isAdmin, isAccountant, hasReportsAccess };
  }, [safeUserRole]);

  // Memoize navigation filtering
  const filteredNavItems = useMemo(
    () =>
      navigationItems.filter((item) => {
        if (!safeUserRole) return false;

        if (item.requiresReportAccess) return roleChecks.hasReportsAccess;
        if (item.adminOnly) return roleChecks.isAdmin;
        if (item.title === "Users") return roleChecks.isAdmin;

        return true;
      }),
    [safeUserRole, roleChecks]
  );

  // Memoize action filtering
  const filteredActionItems = useMemo(
    () =>
      actionItems.filter((item) => {
        if (!safeUserRole) return false;

        if (item.adminOnly) return roleChecks.isAdmin;
        if (item.requiresAuth)
          return roleChecks.isAdmin || roleChecks.isAccountant;

        // Specific item checks
        if (item.title === "Sell Meters") return true;
        if (item.title === "Return Sold Meters")
          return roleChecks.hasReportsAccess;
        if (item.title === "Assign Meters to Agent")
          return roleChecks.hasReportsAccess;
        if (item.title === "Create User") return roleChecks.isAdmin;
        if (item.title === "Create Agent") return roleChecks.isAdmin;
        if (item.title === "Add Meters") return roleChecks.isAdmin;

        return true;
      }),
    [safeUserRole, roleChecks]
  );

  return {
    roleChecks,
    filteredNavItems,
    filteredActionItems,
  };
}
