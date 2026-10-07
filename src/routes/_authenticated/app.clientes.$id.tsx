import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { APPT_SELECT } from "@/lib/panel-data";
import {
  formatBRL,
  formatDateBR,
  formatPhone,
  PAYMENT_STATUS_LABELS,
  STATUS_LABELS,
} from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/app/clientes/$id")({
  component: ClienteDetalhe,
});

function ClienteDetalhe() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  const client = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const appts = useQuery({
    queryKey: ["client-appointments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select(APPT_SELECT)
        .eq("client_id", id)
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (client.data) {
      setName(client.data.name);
      setNotes(client.data.notes);
    }
  }, [client.data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clients").update({ name, notes }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente atualizado.");
      queryClient.invalidateQueries({ queryKey: ["client", id] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const history = appts.data ?? [];
  const totalSpent = history.reduce((s, a) => s + a.paid_cents, 0);
  const visits = history.filter((a) => a.status === "completed").length;
  const last = history.find((a) => a.status === "completed");

  if (client.isLoading) return <Skeleton className="h-64 rounded-lg" />;

  return (
    <div className="space-y-5">
      <h1 className="text-3xl">{client.data?.name}</h1>
      <p className="text-sm text-muted-foreground">{formatPhone(client.data?.phone ?? "")}</p>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Visitas</p>
          <p className="font-display text-2xl text-primary">{visits}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Total gasto</p>
          <p className="font-display text-2xl text-primary">{formatBRL(totalSpent)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Último</p>
          <p className="font-display text-2xl text-primary">
            {last ? formatDateBR(last.starts_at) : "—"}
          </p>
        </div>
      </div>

      <section className="space-y-3 rounded-lg border border-border bg-card p-4">
        <h2 className="text-2xl">Dados</h2>
        <div className="space-y-2">
          <Label htmlFor="nome-cliente">Nome</Label>
          <Input
            id="nome-cliente"
            className="h-12"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="obs-cliente">Observações</Label>
          <Textarea
            id="obs-cliente"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
        <Button className="h-12" onClick={() => save.mutate()} disabled={save.isPending}>
          Salvar
        </Button>
      </section>

      <section className="rounded-lg border border-border bg-card">
        <h2 className="p-4 text-2xl">Histórico</h2>
        {history.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-muted-foreground">Sem atendimentos registrados.</p>
        ) : (
          <ul className="divide-y divide-border">
            {history.map((a) => (
              <li key={a.id} className="flex justify-between gap-3 p-4 text-sm">
                <span>
                  <span className="font-semibold">{a.services?.name}</span>
                  <span className="block text-muted-foreground">{formatDateBR(a.starts_at)}</span>
                </span>
                <span className="text-right text-xs text-muted-foreground">
                  {STATUS_LABELS[a.status]} · {PAYMENT_STATUS_LABELS[a.payment_status]}
                  <span className="block font-semibold text-foreground">
                    {formatBRL(a.paid_cents)} / {formatBRL(a.price_cents)}
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
