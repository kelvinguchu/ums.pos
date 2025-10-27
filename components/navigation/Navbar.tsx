"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useIsMobile } from "@/hooks/use-mobile";
import { NotificationBell } from "@/components/NotificationBell";
import { StockAlert } from "@/components/stock/StockAlert";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { SearchBar } from "./SearchBar";
import { UserProfileMenu } from "./UserProfileMenu";
import { AgentInventorySheet } from "./AgentInventorySheet";
import { Kbd, KbdGroup } from "@/components/ui/kbd";

const Navbar: React.FC = () => {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [selectedAgentName, setSelectedAgentName] = useState<string>("");
  const isMobile = useIsMobile();
  const { userRole, updateAuthState, user } = useAuth();
  const isAdmin = userRole === "admin";

  const handleAgentInventoryOpen = (agentId: string, agentName: string) => {
    setSelectedAgentId(agentId);
    setSelectedAgentName(agentName);
    setIsInventoryOpen(true);
  };

  return (
    <div className='fixed top-0 left-0 right-0 z-50 bg-white shadow-md h-16 flex items-center px-4 w-full'>
      <div className='flex justify-between items-center w-full gap-4'>
        <div className='flex items-center gap-4'>
          <Link href='/' className='flex items-center'>
            <Image
              src='/logo.png'
              alt='UMS POS'
              width={70}
              height={70}
              className='w-[70px] h-[50px] lg:w-[70px] lg:h-[40px]'
            />
          </Link>
          <div className='flex items-center gap-2'>
            <SidebarTrigger className='-ml-1 cursor-pointer' />
            <KbdGroup>
              <Kbd>Ctrl</Kbd>
              <Kbd>B</Kbd>
            </KbdGroup>
          </div>
        </div>

        <SearchBar onAgentInventoryOpen={handleAgentInventoryOpen} />

        <div className='flex items-center gap-4'>
          {!isMobile && (
            <>
              {isAdmin && <StockAlert />}
              <NotificationBell />
              <UserProfileMenu
                user={user}
                userRole={userRole}
                updateAuthState={updateAuthState}
              />
            </>
          )}
        </div>

        <AgentInventorySheet
          open={isInventoryOpen}
          onOpenChange={setIsInventoryOpen}
          agentId={selectedAgentId}
          agentName={selectedAgentName}
        />
      </div>
    </div>
  );
};

export default Navbar;
