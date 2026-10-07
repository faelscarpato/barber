import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, parseBRLToCents } from "@/lib/format";
import { useServices } from "@/lib/panel-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/app/servicos")({
  component: Servicos,
});

function Servicos() {
  const services = useServices();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("40");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["services"] });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("services").insert({
        name: name.trim(),
        description: description.trim(),
        duration_minutes: Number(duration),
        price_cents: parseBRLToCents(price),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Serviço criado.");
      setName("");
      setPrice("");
      setDescription("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("services").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <h1 className="text-3xl">Serviços</h1>

      <section className="space-y-3 rounded-lg border border-border bg-card p-4">
        <h2 className="text-2xl">Novo serviço</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="s-nome">Nome</Label>
            <Input
              id="s-nome"
              className="h-12"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-preco">Preço</Label>
            <Input
              id="s-preco"
              className="h-12"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="45,00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-dur">Duração (min)</Label>
            <Input
              id="s-dur"
              className="h-12"
              inputMode="numeric"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-desc">Descrição</Label>
            <Input
              id="s-desc"
              className="h-12"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <Button
          className="h-12"
          disabled={create.isPending || name.trim().length < 2}
          onClick={() => create.mutate()}
        >
          Adicionar serviço
        </Button>
      </section>

      {services.isLoading ? (
        <Skeleton className="h-40 rounded-lg" />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {services.data?.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 p-4">
              <span className="text-sm">
                <span className="font-semibold">{s.name}</span>
                <span className="block text-muted-foreground">
                  {s.duration_minutes} min · {formatBRL(s.price_cents)}
                </span>
              </span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                Ativo
                <Switch
                  checked={s.active}
                  onCheckedChange={(v) => toggle.mutate({ id: s.id, active: v })}
                  aria-label={`Ativar ${s.name}`}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
