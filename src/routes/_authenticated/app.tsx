import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Scissors,
  Settings,
  UserCog,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppLayout,
});

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

const NAV: NavItem[] = [
  { to: "/app", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { to: "/app/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/app/agendamentos", label: "Agendamentos", icon: ListChecks },
  { to: "/app/clientes", label: "Clientes", icon: Users },
  { to: "/app/pagamentos", label: "Pagamentos", icon: CreditCard },
  { to: "/app/servicos", label: "Serviços", icon: Scissors },
  { to: "/app/barbeiros", label: "Barbeiros", icon: UserCog },
  { to: "/app/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/app/configuracoes", label: "Configurações", icon: Settings },
];

function AppLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="min-h-screen bg-background pb-24 lg:flex lg:pb-0">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-sidebar lg:block">
        <div className="p-5">
          <p className="font-display text-xl leading-none">
            14 <span className="text-primary">de Novembro</span>
          </p>
        </div>
        <nav className="space-y-1 px-3">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to as never}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-primary"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                )}
              >
                <item.icon className="size-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3">
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:text-destructive"
          >
            <LogOut className="size-4" aria-hidden="true" /> Sair
          </button>
        </div>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-border px-5 py-4 lg:hidden">
          <p className="font-display text-lg leading-none">
            14 <span className="text-primary">de Novembro</span>
          </p>
          <button onClick={signOut} aria-label="Sair" className="text-muted-foreground">
            <LogOut className="size-5" aria-hidden="true" />
          </button>
        </header>
        <main className="mx-auto max-w-5xl p-5">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-border bg-sidebar lg:hidden">
        {NAV.slice(0, 5).map((item) => {
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to as never}
              className={cn(
                "flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px]",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-5" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
