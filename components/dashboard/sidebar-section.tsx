"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

function getInitialState(storageKey: string, defaultOpen: boolean): boolean {
  if (typeof window === "undefined") return defaultOpen;
  const stored = localStorage.getItem(storageKey);
  return stored !== null ? stored === "true" : defaultOpen;
}

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
  const [isOpen, setIsOpen] = useState(() => getInitialState(storageKey, defaultOpen));

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
