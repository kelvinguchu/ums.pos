import { useState, useMemo } from "react";

export type ActionTitle =
  | "Create User"
  | "Add Meters"
  | "Sell Meters"
  | "Assign Meters to Agent"
  | "Create Agent"
  | "Return Sold Meters";

interface ActionState {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  isDialog?: boolean;
}

export function useActionDialogs() {
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isAddMetersOpen, setIsAddMetersOpen] = useState(false);
  const [isSellMetersOpen, setIsSellMetersOpen] = useState(false);
  const [isAssignMetersOpen, setIsAssignMetersOpen] = useState(false);
  const [isCreateAgentOpen, setIsCreateAgentOpen] = useState(false);
  const [isReturnSoldMetersOpen, setIsReturnSoldMetersOpen] = useState(false);

  const actionStateMap = useMemo<Record<ActionTitle, ActionState>>(
    () => ({
      "Create User": {
        isOpen: isCreateUserOpen,
        setIsOpen: setIsCreateUserOpen,
        isDialog: true,
      },
      "Add Meters": { isOpen: isAddMetersOpen, setIsOpen: setIsAddMetersOpen },
      "Sell Meters": {
        isOpen: isSellMetersOpen,
        setIsOpen: setIsSellMetersOpen,
      },
      "Assign Meters to Agent": {
        isOpen: isAssignMetersOpen,
        setIsOpen: setIsAssignMetersOpen,
      },
      "Create Agent": {
        isOpen: isCreateAgentOpen,
        setIsOpen: setIsCreateAgentOpen,
        isDialog: true,
      },
      "Return Sold Meters": {
        isOpen: isReturnSoldMetersOpen,
        setIsOpen: setIsReturnSoldMetersOpen,
      },
    }),
    [
      isCreateUserOpen,
      isAddMetersOpen,
      isSellMetersOpen,
      isAssignMetersOpen,
      isCreateAgentOpen,
      isReturnSoldMetersOpen,
    ]
  );

  return actionStateMap;
}
