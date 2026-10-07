import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import {
  addDaysISO,
  formatBRL,
  formatTimeBR,
  localDateTimeToUTC,
  STATUS_LABELS,
  todayISODate,
} from "@/lib/format";
import { useAppointmentsRange } from "@/lib/panel-data";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Dashboard,
});

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl leading-none text-primary">{value}</p>
    </div>
  );
}

function Dashboard() {
  const today = todayISODate();
  const weekStart = addDaysISO(today, -6);
  const todayQuery = useAppointmentsRange(today, today);
  const weekQuery = useAppointmentsRange(weekStart, today);

  const clientsQuery = useQuery({
    queryKey: ["clients-summary"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const t = todayQuery.data ?? [];
  const w = weekQuery.data ?? [];
  const completed = t.filter((a) => a.status === "completed");
  const revenueToday = t.reduce((sum, a) => sum + a.paid_cents, 0);
  const revenueWeek = w.reduce((sum, a) => sum + a.paid_cents, 0);
  const paidWeek = w.filter((a) => a.paid_cents > 0);
  const ticket = paidWeek.length ? Math.round(revenueWeek / paidWeek.length) : 0;
  const newClients = (clientsQuery.data ?? []).filter(
    (c) => new Date(c.created_at).getTime() >= localDateTimeToUTC(weekStart, "00:00").getTime(),
  ).length;

  const chartData = Array.from({ length: 7 }, (_, i) => {
    const day = addDaysISO(weekStart, i);
    const dayAppts = w.filter(
      (a) =>
        new Date(a.starts_at).getTime() >= localDateTimeToUTC(day, "00:00").getTime() &&
        new Date(a.starts_at).getTime() <= localDateTimeToUTC(day, "23:59").getTime(),
    );
    return {
      dia: day.slice(8) + "/" + day.slice(5, 7),
      agendamentos: dayAppts.length,
      faturamento: dayAppts.reduce((s, a) => s + a.paid_cents, 0) / 100,
    };
  });

  if (todayQuery.isLoading || weekQuery.isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Visão geral</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Kpi label="Hoje" value={String(t.length)} />
        <Kpi label="Confirmados" value={String(t.filter((a) => a.status === "confirmed").length)} />
        <Kpi label="Concluídos" value={String(completed.length)} />
        <Kpi label="Cancelados" value={String(t.filter((a) => a.status === "cancelled").length)} />
        <Kpi label="Faltas" value={String(t.filter((a) => a.status === "no_show").length)} />
        <Kpi label="Faturamento hoje" value={formatBRL(revenueToday)} />
        <Kpi label="Faturamento 7 dias" value={formatBRL(revenueWeek)} />
        <Kpi label="Ticket médio" value={formatBRL(ticket)} />
        <Kpi label="Clientes novos (7d)" value={String(newClients)} />
      </div>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-2xl">Agendamentos por dia</h2>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="dia" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="agendamentos" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card">
        <h2 className="p-4 text-2xl">Agenda de hoje</h2>
        {t.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-muted-foreground">Nenhum agendamento para hoje.</p>
        ) : (
          <ul className="divide-y divide-border">
            {t.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                <span>
                  <span className="font-display text-xl text-primary">
                    {formatTimeBR(a.starts_at)}
                  </span>{" "}
                  <span className="font-semibold">{a.clients?.name}</span>
                  <span className="block text-muted-foreground">{a.services?.name}</span>
                </span>
                <span className="text-right text-xs text-muted-foreground">
                  {STATUS_LABELS[a.status]}
                  <span className="block font-semibold text-foreground">
                    {formatBRL(a.price_cents)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
