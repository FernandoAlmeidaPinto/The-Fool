"use client";

import { usePathname } from "next/navigation";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/leituras": "Leituras",
  "/cursos": "Cursos",
  "/perfil": "Meu Perfil",
  "/configuracoes": "Configurações",
  "/admin": "Admin",
  "/admin/profiles": "Perfis",
  "/admin/profiles/new": "Novo Perfil",
  "/admin/plans": "Planos",
  "/admin/plans/new": "Novo Plano",
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (/^\/admin\/profiles\/[^/]+\/edit$/.test(pathname)) return "Editar Perfil";
  if (/^\/admin\/plans\/[^/]+\/edit$/.test(pathname)) return "Editar Plano";
  return "Dashboard";
}

export function PageTitle() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  return <h1 className="text-sm font-medium text-muted-foreground">{title}</h1>;
}
