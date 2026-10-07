import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { addDaysISO, formatBRL, todayISODate } from "@/lib/format";
import { useAppointmentsRange } from "@/lib/panel-data";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/app/relatorios")({
  component: Relatorios,
});

function Relatorios() {
  const [from, setFrom] = useState(addDaysISO(todayISODate(), -29));
  const [to, setTo] = useState(todayISODate());
  const query = useAppointmentsRange(from, to);
  const rows = query.data ?? [];

  const revenue = rows.reduce((s, a) => s + a.paid_cents, 0);
  const completed = rows.filter((a) => a.status === "completed");
  const noShows = rows.filter((a) => a.status === "no_show");
  const cancelled = rows.filter((a) => a.status === "cancelled");

  const byService = new Map<string, { count: number; total: number }>();
  for (const a of rows) {
    const key = a.services?.name ?? "—";
    const cur = byService.get(key) ?? { count: 0, total: 0 };
    byService.set(key, { count: cur.count + 1, total: cur.total + a.paid_cents });
  }
  const byBarber = new Map<string, { count: number; total: number }>();
  for (const a of rows) {
    const key = a.barbers?.name ?? "—";
    const cur = byBarber.get(key) ?? { count: 0, total: 0 };
    byBarber.set(key, { count: cur.count + 1, total: cur.total + a.paid_cents });
  }

  const exportCsv = () => {
    const header = "data,cliente,servico,barbeiro,status,valor,pago\n";
    const body = rows
      .map((a) =>
        [
          a.starts_at,
          a.clients?.name ?? "",
          a.services?.name ?? "",
          a.barbers?.name ?? "",
          a.status,
          (a.price_cents / 100).toFixed(2),
          (a.paid_cents / 100).toFixed(2),
        ].join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([header + body], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-${from}-a-${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <h1 className="text-3xl">Relatórios</h1>
      <div className="grid gap-2 sm:grid-cols-3">
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          aria-label="Data inicial"
          className="h-11 rounded-md border border-input bg-card px-3 text-sm"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          aria-label="Data final"
          className="h-11 rounded-md border border-input bg-card px-3 text-sm"
        />
        <button
          onClick={exportCsv}
          className="h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          Exportar CSV
        </button>
      </div>

      {query.isLoading ? (
        <Skeleton className="h-64 rounded-lg" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Faturamento</p>
              <p className="font-display text-2xl text-primary">{formatBRL(revenue)}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Concluídos</p>
              <p className="font-display text-2xl text-primary">{completed.length}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Faltas</p>
              <p className="font-display text-2xl text-primary">{noShows.length}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Cancelados</p>
              <p className="font-display text-2xl text-primary">{cancelled.length}</p>
            </div>
          </div>

          {[
            { title: "Por serviço", map: byService },
            { title: "Por barbeiro", map: byBarber },
          ].map((block) => (
            <section key={block.title} className="rounded-lg border border-border bg-card">
              <h2 className="p-4 text-2xl">{block.title}</h2>
              <ul className="divide-y divide-border">
                {[...block.map.entries()].map(([key, v]) => (
                  <li key={key} className="flex justify-between p-4 text-sm">
                    <span>{key}</span>
                    <span className="text-muted-foreground">
                      {v.count} · {formatBRL(v.total)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
