import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { runAutomationsNow } from "@/lib/automation.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminWhatsAppConnect } from "@/components/AdminWhatsAppConnect";

export const Route = createFileRoute("/_authenticated/app/configuracoes")({
  component: Configuracoes,
});

type BusinessSettingsRow = {
  id: string;
  name: string;
  tagline: string;
  address_line: string;
  city: string;
  whatsapp_phone: string;
  instagram_url: string | null;
  maps_url: string | null;
  review_url: string | null;
  logo_url: string | null;
  opening_hours_text: string;
  cancellation_policy: string;
  min_lead_minutes: number;
  max_advance_days: number;
  slot_step_minutes: number;
};

type AutomationSettingsRow = {
  id: string;
  provider: string;
  barber_notify_phone: string;
  notify_client_on_create: boolean;
  notify_barber_on_create: boolean;
  reminder_client_enabled: boolean;
  reminder_barber_daily_enabled: boolean;
  reminder_lead_minutes: number;
  daily_agenda_hour: number;
  notify_on_payment: boolean;
  notify_on_cancel: boolean;
};

function Configuracoes() {
  const queryClient = useQueryClient();

  const business = useQuery({
    queryKey: ["business-settings"],
    queryFn: async (): Promise<BusinessSettingsRow> => {
      const { data, error } = await supabase
        .from("business_settings")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data as BusinessSettingsRow;
    },
  });

  const automation = useQuery({
    queryKey: ["automation-settings"],
    queryFn: async (): Promise<AutomationSettingsRow> => {
      const { data, error } = await supabase
        .from("automation_settings")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data as AutomationSettingsRow;
    },
  });

  const templates = useQuery({
    queryKey: ["whatsapp-templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("whatsapp_templates").select("*").order("key");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [biz, setBiz] = useState({
    name: "",
    tagline: "",
    address_line: "",
    city: "",
    whatsapp_phone: "",
    instagram_url: "",
    maps_url: "",
    review_url: "",
    logo_url: "",
    opening_hours_text: "",
    cancellation_policy: "",
    min_lead_minutes: 60,
    max_advance_days: 45,
    slot_step_minutes: 15,
  });

  useEffect(() => {
    if (business.data) {
      setBiz({
        name: business.data.name ?? "",
        tagline: business.data.tagline ?? "",
        address_line: business.data.address_line ?? "",
        city: business.data.city ?? "",
        whatsapp_phone: business.data.whatsapp_phone ?? "",
        instagram_url: business.data.instagram_url ?? "",
        maps_url: business.data.maps_url ?? "",
        review_url: business.data.review_url ?? "",
        logo_url: business.data.logo_url ?? "",
        opening_hours_text: business.data.opening_hours_text ?? "",
        cancellation_policy: business.data.cancellation_policy ?? "",
        min_lead_minutes: business.data.min_lead_minutes ?? 60,
        max_advance_days: business.data.max_advance_days ?? 45,
        slot_step_minutes: business.data.slot_step_minutes ?? 15,
      });
    }
  }, [business.data]);

  const saveBiz = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("business_settings")
        .update(biz)
        .eq("id", business.data!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dados do negócio salvos.");
      queryClient.invalidateQueries({ queryKey: ["business-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveAutomation = useMutation({
    mutationFn: async (
      patch: Partial<
        Pick<
          AutomationSettingsRow,
          | "provider"
          | "barber_notify_phone"
          | "notify_client_on_create"
          | "notify_barber_on_create"
          | "reminder_client_enabled"
          | "reminder_barber_daily_enabled"
          | "reminder_lead_minutes"
          | "daily_agenda_hour"
          | "notify_on_payment"
          | "notify_on_cancel"
        >
      >,
    ) => {
      const { error } = await supabase
        .from("automation_settings")
        .update(patch)
        .eq("id", automation.data!.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automation-settings"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const saveTemplate = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: string }) => {
      const { error } = await supabase.from("whatsapp_templates").update({ body }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Modelo salvo.");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const runNow = useMutation({
    mutationFn: () => runAutomationsNow({ data: undefined }),
    onSuccess: (r) => toast.success(`Ciclo executado: ${JSON.stringify(r)}`),
    onError: (e: Error) => toast.error(e.message),
  });

  if (business.isLoading || automation.isLoading) {
    return <Skeleton className="h-96 rounded-lg" />;
  }

  return (
    <div className="space-y-5">
      <h1 className="text-3xl">Configurações</h1>

      <section className="space-y-3 rounded-lg border border-border bg-card p-4">
        <h2 className="text-2xl">Negócio</h2>

        {(
          [
            ["name", "Nome"],
            ["tagline", "Tagline"],
            ["whatsapp_phone", "WhatsApp"],
            ["address_line", "Endereço"],
            ["city", "Cidade"],
            ["instagram_url", "Instagram"],
            ["maps_url", "Google Maps"],
            ["review_url", "Link de avaliação"],
            ["logo_url", "Logo URL"],
            ["opening_hours_text", "Horário de funcionamento"],
            ["cancellation_policy", "Política de cancelamento"],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="space-y-2">
            <Label htmlFor={`biz-${key}`}>{label}</Label>
            <Input
              id={`biz-${key}`}
              className="h-12"
              value={biz[key]}
              onChange={(e) => setBiz({ ...biz, [key]: e.target.value })}
            />
          </div>
        ))}

        <div className="grid gap-3 md:grid-cols-3">
          {(
            [
              ["min_lead_minutes", "Antecedência mínima"],
              ["max_advance_days", "Dias máximos de agenda"],
              ["slot_step_minutes", "Intervalo entre horários"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`biz-${key}`}>{label}</Label>
              <Input
                id={`biz-${key}`}
                className="h-12"
                inputMode="numeric"
                value={String(biz[key])}
                onChange={(e) => setBiz({ ...biz, [key]: Number(e.target.value) })}
              />
            </div>
          ))}
        </div>

        <Button className="h-12" onClick={() => saveBiz.mutate()} disabled={saveBiz.isPending}>
          Salvar
        </Button>
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-card p-4">
        <h2 className="text-2xl">Automações WhatsApp</h2>

        {/* Integração Nativa via QR Code */}
        <AdminWhatsAppConnect />

        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="provider">Provedor Ativo (Provider)</Label>
            {automation.data?.provider !== "native" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => saveAutomation.mutate({ provider: "native" })}
              >
                Definir como Nativo (Recomendado)
              </Button>
            )}
          </div>
          <Input
            id="provider"
            className="h-12"
            value={automation.data?.provider ?? "native"}
            placeholder="native ou evolution"
            onChange={(e) => saveAutomation.mutate({ provider: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Use <strong>native</strong> para disparos automáticos diretos pelo QR Code conectado acima sem custos adicionais.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="barber-notify-phone">Telefone do barbeiro</Label>
          <Input
            id="barber-notify-phone"
            className="h-12"
            value={automation.data?.barber_notify_phone ?? ""}
            onChange={(e) => saveAutomation.mutate({ barber_notify_phone: e.target.value })}
          />
        </div>

        {(
          [
            ["notify_client_on_create", "Notificar cliente ao criar agendamento"],
            ["notify_barber_on_create", "Notificar barbeiro ao criar agendamento"],
            ["reminder_client_enabled", "Lembrete para o cliente"],
            ["reminder_barber_daily_enabled", "Agenda diária para o barbeiro"],
            ["notify_on_payment", "Notificar pagamento"],
            ["notify_on_cancel", "Notificar cancelamento"],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between gap-3 text-sm">
            <span>{label}</span>
            <Switch
              checked={Boolean(automation.data?.[key])}
              aria-label={label}
              onCheckedChange={(v) => saveAutomation.mutate({ [key]: v } as never)}
            />
          </div>
        ))}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="reminder-lead-minutes">Antecedência do lembrete (minutos)</Label>
            <Input
              id="reminder-lead-minutes"
              className="h-12"
              inputMode="numeric"
              value={String(automation.data?.reminder_lead_minutes ?? 120)}
              onChange={(e) =>
                saveAutomation.mutate({ reminder_lead_minutes: Number(e.target.value) })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="daily-agenda-hour">Hora da agenda diária</Label>
            <Input
              id="daily-agenda-hour"
              className="h-12"
              inputMode="numeric"
              value={String(automation.data?.daily_agenda_hour ?? 8)}
              onChange={(e) => saveAutomation.mutate({ daily_agenda_hour: Number(e.target.value) })}
            />
          </div>
        </div>

        <Button
          variant="secondary"
          className="h-12"
          onClick={() => runNow.mutate()}
          disabled={runNow.isPending}
        >
          Executar ciclo agora
        </Button>
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card p-4">
        <h2 className="text-2xl">Modelos de mensagem</h2>
        {templates.data?.map((t) => (
          <div key={t.id} className="space-y-2">
            <Label htmlFor={`tpl-${t.id}`}>{t.key}</Label>
            <Textarea
              id={`tpl-${t.id}`}
              rows={3}
              defaultValue={t.body}
              onBlur={(e) => {
                if (e.target.value !== t.body) {
                  saveTemplate.mutate({ id: t.id, body: e.target.value });
                }
              }}
            />
          </div>
        ))}
      </section>
    </div>
  );
}
