"use client";

import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface SidebarSectionProps {
  label: string;
  storageKey: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function SidebarSection({
  label,
  storageKey,
  defaultOpen = false,
  children,
}: SidebarSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) {
      setIsOpen(stored === "true");
    }
  }, [storageKey]);

  function toggle() {
    const next = !isOpen;
    setIsOpen(next);
    localStorage.setItem(storageKey, String(next));
  }

  return (
    <div>
      <button
        onClick={toggle}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        {label}
        <ChevronDown
          className={`h-3 w-3 transition-transform ${isOpen ? "rotate-0" : "-rotate-90"}`}
        />
      </button>
      {isOpen && <div className="space-y-1">{children}</div>}
    </div>
  );
}
