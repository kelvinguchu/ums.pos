export type UserRole = 'admin' | 'user' | 'accountant';

interface Permission {
  createUser: boolean;
  createAgent: boolean;
  addMeter: boolean;
  viewReports: boolean;
  manageSales: boolean;
  viewInventory: boolean;
  manageAgents: boolean;
  returnSoldMeters: boolean;
  assignMeters: boolean;
  viewUsers: boolean;
  viewAgents: boolean;
}

export const rolePermissions: Record<UserRole, Permission> = {
  admin: {
    createUser: true,
    createAgent: true,
    addMeter: true,
    viewReports: true,
    manageSales: true,
    viewInventory: true,
    manageAgents: true,
    returnSoldMeters: true,
    assignMeters: true,
    viewUsers: true,
    viewAgents: true,
  },
  accountant: {
    createUser: false,
    createAgent: false,
    addMeter: false,
    viewReports: true,
    manageSales: true,
    viewInventory: true,
    manageAgents: true,
    returnSoldMeters: true,
    assignMeters: true,
    viewUsers: false,
    viewAgents: true,
  },
  user: {
    createUser: false,
    createAgent: false,
    addMeter: false,
    viewReports: false,
    manageSales: true,
    viewInventory: true,
    manageAgents: false,
    returnSoldMeters: false,
    assignMeters: false,
    viewUsers: false,
    viewAgents: true,
  },
};

export const hasPermission = (role: UserRole | null, permission: keyof Permission): boolean => {
  if (!role || !isValidRole(role)) return false;
  return rolePermissions[role]?.[permission] ?? false;
};

export const isValidRole = (role: any): role is UserRole => {
  return role === 'admin' || role === 'user' || role === 'accountant';
}; 