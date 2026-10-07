import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { WEEKDAY_LABELS } from "@/lib/format";
import { useBarbers } from "@/lib/panel-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/app/barbeiros")({
  component: Barbeiros,
});

function Barbeiros() {
  const barbers = useBarbers();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const hours = useQuery({
    queryKey: ["working-hours"],
    queryFn: async () => {
      const { data, error } = await supabase.from("working_hours").select("*").order("weekday");
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("barbers")
        .insert({ name: name.trim(), phone: phone.trim() })
        .select("id")
        .single();
      if (error) throw error;
      const rows = Array.from({ length: 7 }, (_, weekday) => ({
        barber_id: data.id,
        weekday,
        start_time: "09:00",
        end_time: "19:00",
        active: weekday >= 2,
      }));
      const { error: whError } = await supabase.from("working_hours").insert(rows);
      if (whError) throw whError;
    },
    onSuccess: () => {
      toast.success("Barbeiro cadastrado.");
      setName("");
      setPhone("");
      queryClient.invalidateQueries({ queryKey: ["barbers"] });
      queryClient.invalidateQueries({ queryKey: ["working-hours"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateHour = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<{
        active: boolean;
        start_time: string;
        end_time: string;
        break_start: string | null;
        break_end: string | null;
      }>;
    }) => {
      const { error } = await supabase.from("working_hours").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["working-hours"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleBarber = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("barbers").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["barbers"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <h1 className="text-3xl">Barbeiros</h1>

      <section className="space-y-3 rounded-lg border border-border bg-card p-4">
        <h2 className="text-2xl">Novo barbeiro</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="b-nome">Nome</Label>
            <Input
              id="b-nome"
              className="h-12"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="b-tel">WhatsApp</Label>
            <Input
              id="b-tel"
              className="h-12"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>
        <Button
          className="h-12"
          disabled={create.isPending || name.trim().length < 2}
          onClick={() => create.mutate()}
        >
          Cadastrar
        </Button>
      </section>

      {barbers.isLoading || hours.isLoading ? (
        <Skeleton className="h-64 rounded-lg" />
      ) : (
        barbers.data?.map((b) => (
          <section key={b.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl">{b.name}</h2>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                Ativo
                <Switch
                  checked={b.active}
                  onCheckedChange={(v) => toggleBarber.mutate({ id: b.id, active: v })}
                  aria-label={`Ativar ${b.name}`}
                />
              </span>
            </div>
            <ul className="mt-3 space-y-2">
              {(hours.data ?? [])
                .filter((h) => h.barber_id === b.id)
                .map((h) => (
                  <li key={h.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="w-20 text-muted-foreground">{WEEKDAY_LABELS[h.weekday]}</span>
                    <input
                      type="time"
                      value={h.start_time.slice(0, 5)}
                      aria-label={`Início ${WEEKDAY_LABELS[h.weekday]}`}
                      onChange={(e) =>
                        updateHour.mutate({ id: h.id, patch: { start_time: e.target.value } })
                      }
                      className="h-10 rounded-md border border-input bg-background px-2"
                    />
                    <input
                      type="time"
                      value={h.end_time.slice(0, 5)}
                      aria-label={`Fim ${WEEKDAY_LABELS[h.weekday]}`}
                      onChange={(e) =>
                        updateHour.mutate({ id: h.id, patch: { end_time: e.target.value } })
                      }
                      className="h-10 rounded-md border border-input bg-background px-2"
                    />
                    <input
                      type="time"
                      value={h.break_start?.slice(0, 5) ?? ""}
                      aria-label={`Início da pausa ${WEEKDAY_LABELS[h.weekday]}`}
                      onChange={(e) =>
                        updateHour.mutate({
                          id: h.id,
                          patch: { break_start: e.target.value || null },
                        })
                      }
                      className="h-10 rounded-md border border-input bg-background px-2"
                    />
                    <input
                      type="time"
                      value={h.break_end?.slice(0, 5) ?? ""}
                      aria-label={`Fim da pausa ${WEEKDAY_LABELS[h.weekday]}`}
                      onChange={(e) =>
                        updateHour.mutate({
                          id: h.id,
                          patch: { break_end: e.target.value || null },
                        })
                      }
                      className="h-10 rounded-md border border-input bg-background px-2"
                    />
                    <Switch
                      checked={h.active}
                      onCheckedChange={(v) => updateHour.mutate({ id: h.id, patch: { active: v } })}
                      aria-label={`Atende ${WEEKDAY_LABELS[h.weekday]}`}
                    />
                  </li>
                ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
