"use client";

import type { Session } from "next-auth";
import {
  LayoutDashboard,
  Sparkles,
  BookOpen,
  Layers,
  User,
  Users,
  Settings,
  Shield,
  CreditCard,
  Crown,
  MessageCircleQuestionMark,
  Sun,
} from "lucide-react";
import { SidebarItem } from "./sidebar-item";
import { SidebarSection } from "./sidebar-section";

const ADMIN_PERMISSIONS = [
  "admin:profiles",
  "admin:plans",
  "admin:users",
  "admin:decks",
  "admin:practice_questions",
];

interface SidebarContentProps {
  session: Session;
  onNavigate?: () => void;
}

export function SidebarContent({ session, onNavigate }: SidebarContentProps) {
  const permissions = session.user?.permissions ?? [];
  const isAdmin = ADMIN_PERMISSIONS.some((p) => permissions.includes(p));

  return (
    <div className="flex flex-col gap-1 px-3 py-2 h-full">
      <div className="px-3 py-4 text-lg font-bold text-foreground">
        🃏 The Fool
      </div>

      <nav className="space-y-1">
        <SidebarItem href="/" label="Dashboard" icon={LayoutDashboard} onNavigate={onNavigate} />
        <SidebarItem href="/leituras" label="Leituras" icon={Sparkles} onNavigate={onNavigate} />
        <SidebarItem href="/carta-do-dia" label="Carta do Dia" icon={Sun} onNavigate={onNavigate} />
        <SidebarItem href="/cursos" label="Cursos" icon={BookOpen} onNavigate={onNavigate} />
        <SidebarItem href="/baralhos" label="Baralhos" icon={Layers} onNavigate={onNavigate} />
      </nav>

      <div className="my-2 border-t border-border" />

      <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Conta
      </p>
      <nav className="space-y-1">
        <SidebarItem href="/perfil" label="Meu Perfil" icon={User} onNavigate={onNavigate} />
        <SidebarItem href="/configuracoes" label="Configurações" icon={Settings} onNavigate={onNavigate} />
      </nav>

      {isAdmin && (
        <>
          <div className="my-2 border-t border-border" />
          <SidebarSection label="Admin" storageKey="sidebar-admin-open" defaultOpen={false}>
            <SidebarItem href="/admin/profiles" label="Perfis" icon={Shield} onNavigate={onNavigate} />
            <SidebarItem href="/admin/plans" label="Planos" icon={CreditCard} onNavigate={onNavigate} />
            <SidebarItem href="/admin/decks" label="Baralhos" icon={Layers} onNavigate={onNavigate} />
            <SidebarItem href="/admin/users" label="Usuários" icon={Users} onNavigate={onNavigate} />
            <SidebarItem
              href="/admin/practice-questions"
              label="Perguntas de Treino"
              icon={MessageCircleQuestionMark}
              onNavigate={onNavigate}
            />
          </SidebarSection>
        </>
      )}

      {/* Planos — pinned to bottom */}
      <div className="mt-auto border-t border-border pt-2">
        <nav className="space-y-1">
          <SidebarItem href="/planos" label="Planos" icon={Crown} onNavigate={onNavigate} />
        </nav>
      </div>
    </div>
  );
}
