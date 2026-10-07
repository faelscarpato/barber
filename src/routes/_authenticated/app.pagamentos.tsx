import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { notifyPaymentReceived } from "@/lib/automation.functions";
import {
  addDaysISO,
  formatBRL,
  formatDateBR,
  parseBRLToCents,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  todayISODate,
} from "@/lib/format";
import { useAppointmentsRange } from "@/lib/panel-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/app/pagamentos")({
  component: Pagamentos,
});

function Pagamentos() {
  const [from, setFrom] = useState(addDaysISO(todayISODate(), -14));
  const [to, setTo] = useState(todayISODate());
  const [filter, setFilter] = useState("all");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [methods, setMethods] = useState<Record<string, string>>({});
  const query = useAppointmentsRange(from, to);
  const queryClient = useQueryClient();

  const pay = useMutation({
    mutationFn: async ({ id, cents, method }: { id: string; cents: number; method: string }) => {
      const { error } = await supabase
        .from("payments")
        .insert({ appointment_id: id, amount_cents: cents, method: method as never });
      if (error) throw error;
      await notifyPaymentReceived({ data: { appointmentId: id, amountCents: cents } });
    },
    onSuccess: () => {
      toast.success("Pagamento registrado.");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (query.data ?? []).filter(
    (a) => a.status !== "cancelled" && (filter === "all" || a.payment_status === filter),
  );

  return (
    <div className="space-y-5">
      <h1 className="text-3xl">Pagamentos</h1>
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
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filtrar por situação de pagamento"
          className="h-11 rounded-md border border-input bg-card px-3 text-sm"
        >
          <option value="all">Todos</option>
          {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => (
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
          Nenhum atendimento neste filtro.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((a) => {
            const remaining = Math.max(a.price_cents - a.paid_cents, 0);
            return (
              <li key={a.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex justify-between gap-3 text-sm">
                  <span>
                    <span className="font-semibold">{a.clients?.name}</span>
                    <span className="block text-muted-foreground">
                      {formatDateBR(a.starts_at)} · {a.services?.name}
                    </span>
                  </span>
                  <span className="text-right text-xs">
                    <span className="block">{PAYMENT_STATUS_LABELS[a.payment_status]}</span>
                    <span className="block text-muted-foreground">
                      Pago {formatBRL(a.paid_cents)} / {formatBRL(a.price_cents)}
                    </span>
                  </span>
                </div>
                {remaining > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Input
                      className="h-11 w-32"
                      placeholder={formatBRL(remaining)}
                      aria-label="Valor recebido"
                      value={amounts[a.id] ?? ""}
                      onChange={(e) => setAmounts({ ...amounts, [a.id]: e.target.value })}
                    />
                    <select
                      className="h-11 rounded-md border border-input bg-background px-3 text-sm"
                      aria-label="Forma de pagamento"
                      value={methods[a.id] ?? "pix"}
                      onChange={(e) => setMethods({ ...methods, [a.id]: e.target.value })}
                    >
                      {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <Button
                      className="h-11"
                      disabled={pay.isPending}
                      onClick={() =>
                        pay.mutate({
                          id: a.id,
                          cents: amounts[a.id] ? parseBRLToCents(amounts[a.id]) : remaining,
                          method: methods[a.id] ?? "pix",
                        })
                      }
                    >
                      Registrar
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
