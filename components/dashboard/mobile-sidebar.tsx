"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileSidebarProps {
  children: (onNavigate: () => void) => React.ReactNode;
}

export function MobileSidebar({ children }: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  function close() {
    setIsOpen(false);
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="md:hidden"
        onClick={() => setIsOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={close}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border md:hidden overflow-y-auto">
            <div className="flex justify-end p-2">
              <Button variant="ghost" size="sm" onClick={close} aria-label="Fechar menu">
                <X className="h-5 w-5" />
              </Button>
            </div>
            {children(close)}
          </div>
        </>
      )}
    </>
  );
}
