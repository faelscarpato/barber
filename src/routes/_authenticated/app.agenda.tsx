import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { notifyCancellation } from "@/lib/automation.functions";
import { addDaysISO, formatBRL, formatTimeBR, STATUS_LABELS, todayISODate } from "@/lib/format";
import { useAppointmentsRange } from "@/lib/panel-data";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/app/agenda")({
  component: Agenda,
});

type ApptStatus = "scheduled" | "confirmed" | "completed" | "no_show" | "cancelled";
const NEXT_STATUS: ApptStatus[] = ["scheduled", "confirmed", "completed", "no_show", "cancelled"];

function Agenda() {
  const [date, setDate] = useState(todayISODate());
  const query = useAppointmentsRange(date, date);
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ApptStatus }) => {
      const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
      if (error) throw error;
      if (status === "cancelled") await notifyCancellation({ data: { appointmentId: id } });
    },
    onSuccess: () => {
      toast.success("Status atualizado.");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <h1 className="text-3xl">Agenda</h1>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => setDate(addDaysISO(date, -1))}>
          Anterior
        </Button>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-11 flex-1 rounded-md border border-input bg-card px-3 text-sm"
          aria-label="Data da agenda"
        />
        <Button variant="outline" onClick={() => setDate(addDaysISO(date, 1))}>
          Próximo
        </Button>
      </div>

      {query.isLoading ? (
        <Skeleton className="h-40 rounded-lg" />
      ) : (query.data?.length ?? 0) === 0 ? (
        <p className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Nenhum agendamento nesta data.
        </p>
      ) : (
        <ul className="space-y-3">
          {query.data?.map((a) => (
            <li key={a.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-2xl leading-none text-primary">
                    {formatTimeBR(a.starts_at)}
                  </p>
                  <p className="mt-1 font-semibold">{a.clients?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {a.services?.name} · {formatBRL(a.price_cents)}
                  </p>
                  {a.notes && <p className="mt-1 text-sm text-muted-foreground">{a.notes}</p>}
                </div>
                <span className="rounded-md border border-border px-2 py-1 text-xs">
                  {STATUS_LABELS[a.status]}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {NEXT_STATUS.filter((s) => s !== a.status).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant="secondary"
                    disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate({ id: a.id, status: s })}
                  >
                    {STATUS_LABELS[s]}
                  </Button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
