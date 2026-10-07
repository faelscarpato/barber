import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  addDaysISO,
  formatBRL,
  formatDateBR,
  formatTimeBR,
  PAYMENT_STATUS_LABELS,
  STATUS_LABELS,
  todayISODate,
} from "@/lib/format";
import { useAppointmentsRange } from "@/lib/panel-data";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/app/agendamentos")({
  component: Agendamentos,
});

function Agendamentos() {
  const [from, setFrom] = useState(addDaysISO(todayISODate(), -14));
  const [to, setTo] = useState(addDaysISO(todayISODate(), 14));
  const [status, setStatus] = useState("all");
  const query = useAppointmentsRange(from, to);

  const rows = (query.data ?? []).filter((a) => status === "all" || a.status === status);

  return (
    <div className="space-y-5">
      <h1 className="text-3xl">Agendamentos</h1>
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
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filtrar por status"
          className="h-11 rounded-md border border-input bg-card px-3 text-sm"
        >
          <option value="all">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {query.isLoading ? (
        <Skeleton className="h-48 rounded-lg" />
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Nenhum agendamento neste filtro.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {rows.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 p-4 text-sm">
              <span>
                <span className="font-semibold">{a.clients?.name}</span>
                <span className="block text-muted-foreground">
                  {formatDateBR(a.starts_at)} às {formatTimeBR(a.starts_at)} · {a.services?.name}
                </span>
              </span>
              <span className="text-right text-xs">
                <span className="block">{STATUS_LABELS[a.status]}</span>
                <span className="block text-muted-foreground">
                  {PAYMENT_STATUS_LABELS[a.payment_status]} · {formatBRL(a.price_cents)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
