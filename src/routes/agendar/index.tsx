import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getAvailability, getBookingContext, createBooking } from "@/lib/booking.functions";
import type { BookingContext } from "@/lib/booking.types";
import {
  addDaysISO,
  formatBRL,
  formatLongDateBR,
  localDateTimeToUTC,
  todayISODate,
} from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agendar/")({
  head: () => ({
    meta: [
      { title: "Agendar horário — Barbearia 14 de Novembro" },
      {
        name: "description",
        content:
          "Escolha serviço, profissional, data e horário e garanta sua vaga na Barbearia 14 de Novembro, em Pedreira-SP.",
      },
      { property: "og:title", content: "Agendar horário — Barbearia 14 de Novembro" },
      {
        property: "og:description",
        content: "Agendamento online rápido: serviço, dia, horário e pronto.",
      },
    ],
  }),
  loader: () => getBookingContext(),
  errorComponent: () => (
    <div className="flex min-h-screen items-center justify-center p-6 text-center text-muted-foreground">
      Não conseguimos carregar a agenda agora. Atualize a página.
    </div>
  ),
  component: Agendar,
});

function Agendar() {
  const { business, services, barbers, barberServices } = Route.useLoaderData() as BookingContext;
  const navigate = useNavigate();

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [barberId, setBarberId] = useState<string | null>(
    barbers.length === 1 ? barbers[0].id : null,
  );
  const [date, setDate] = useState<string>(todayISODate());
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const service = services.find((s) => s.id === serviceId) ?? null;
  const eligibleBarbers = serviceId
    ? barbers.filter((b) =>
        barberServices.some((bs) => bs.barber_id === b.id && bs.service_id === serviceId),
      )
    : barbers;

  const days = Array.from({ length: Math.min(business.max_advance_days, 21) }, (_, i) =>
    addDaysISO(todayISODate(), i),
  );

  const availability = useQuery({
    queryKey: ["availability", barberId, serviceId, date],
    enabled: Boolean(barberId && serviceId && date),
    queryFn: () => getAvailability({ data: { barberId: barberId!, serviceId: serviceId!, date } }),
  });

  const booking = useMutation({
    mutationFn: () =>
      createBooking({
        data: {
          barberId: barberId!,
          serviceId: serviceId!,
          date,
          time: time!,
          clientName: name.trim(),
          clientPhone: phone.trim(),
          notes: notes.trim(),
        },
      }),
    onSuccess: (result) => {
      navigate({ to: "/agendar/confirmacao", search: { id: result.id } });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Não foi possível concluir o agendamento.");
      availability.refetch();
      setTime(null);
    },
  });

  const canSubmit =
    Boolean(serviceId && barberId && time) &&
    name.trim().length >= 2 &&
    phone.replace(/\D/g, "").length >= 10;

  return (
    <div className="surface-grain min-h-screen pb-24">
      <header className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-5">
        <Link
          to="/"
          aria-label="Voltar para a página inicial"
          className="flex size-10 items-center justify-center rounded-md border border-border"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <span className="font-display text-xl leading-none">Agendar horário</span>
      </header>

      <main className="mx-auto max-w-2xl space-y-8 px-5">
        <section aria-labelledby="passo-servico">
          <h2 id="passo-servico" className="eyebrow">
            1. Serviço
          </h2>
          <div className="mt-3 grid gap-2">
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setServiceId(s.id);
                  setTime(null);
                }}
                aria-pressed={serviceId === s.id}
                className={cn(
                  "flex min-h-14 items-center justify-between gap-4 rounded-md border p-4 text-left transition-colors",
                  serviceId === s.id
                    ? "border-primary bg-elevated"
                    : "border-border bg-card hover:border-primary/50",
                )}
              >
                <span>
                  <span className="block font-semibold">{s.name}</span>
                  <span className="text-xs text-muted-foreground">{s.duration_minutes} min</span>
                </span>
                <span className="font-display text-xl text-primary">
                  {formatBRL(s.price_cents)}
                </span>
              </button>
            ))}
          </div>
        </section>

        {serviceId && eligibleBarbers.length > 1 && (
          <section aria-labelledby="passo-barbeiro">
            <h2 id="passo-barbeiro" className="eyebrow">
              2. Profissional
            </h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {eligibleBarbers.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setBarberId(b.id);
                    setTime(null);
                  }}
                  aria-pressed={barberId === b.id}
                  className={cn(
                    "min-h-14 rounded-md border p-4 text-left font-semibold transition-colors",
                    barberId === b.id
                      ? "border-primary bg-elevated"
                      : "border-border bg-card hover:border-primary/50",
                  )}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {serviceId && barberId && (
          <section aria-labelledby="passo-data">
            <h2 id="passo-data" className="eyebrow">
              {eligibleBarbers.length > 1 ? "3." : "2."} Data
            </h2>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
              {days.map((d) => {
                const [, m, day] = d.split("-");
                const weekday = new Date(`${d}T12:00:00Z`).toLocaleDateString("pt-BR", {
                  weekday: "short",
                });
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDate(d);
                      setTime(null);
                    }}
                    aria-pressed={date === d}
                    className={cn(
                      "flex min-h-16 w-16 shrink-0 flex-col items-center justify-center rounded-md border transition-colors",
                      date === d
                        ? "border-primary bg-elevated"
                        : "border-border bg-card hover:border-primary/50",
                    )}
                  >
                    <span className="text-[11px] uppercase text-muted-foreground">{weekday}</span>
                    <span className="font-display text-2xl leading-none">{day}</span>
                    <span className="text-[11px] text-muted-foreground">{m}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {serviceId && barberId && (
          <section aria-labelledby="passo-hora">
            <h2 id="passo-hora" className="eyebrow">
              {eligibleBarbers.length > 1 ? "4." : "3."} Horário —{" "}
              {formatLongDateBR(localDateTimeToUTC(date, "12:00").toISOString())}
            </h2>
            <div className="mt-3">
              {availability.isLoading ? (
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 rounded-md" />
                  ))}
                </div>
              ) : availability.isError ? (
                <p className="rounded-md border border-destructive/40 bg-card p-4 text-sm text-destructive">
                  Erro ao carregar horários.{" "}
                  <button className="underline" onClick={() => availability.refetch()}>
                    Tentar de novo
                  </button>
                </p>
              ) : availability.data?.closed || (availability.data?.slots.length ?? 0) === 0 ? (
                <p className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
                  {availability.data?.reason ??
                    "Sem horários livres nesta data. Escolha outro dia."}
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {availability.data?.slots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setTime(slot)}
                      aria-pressed={time === slot}
                      className={cn(
                        "min-h-12 rounded-md border text-sm font-semibold transition-colors",
                        time === slot
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card hover:border-primary/50",
                      )}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {time && (
          <section aria-labelledby="passo-dados" className="space-y-4">
            <h2 id="passo-dados" className="eyebrow">
              {eligibleBarbers.length > 1 ? "5." : "4."} Seus dados
            </h2>
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className="h-12"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">WhatsApp</Label>
              <Input
                id="telefone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                placeholder="(19) 99999-9999"
                autoComplete="tel"
                className="h-12"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="obs">Observações (opcional)</Label>
              <Textarea
                id="obs"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="rounded-md border border-border bg-card p-4 text-sm">
              <p className="font-semibold">{service?.name}</p>
              <p className="text-muted-foreground">
                {formatLongDateBR(localDateTimeToUTC(date, "12:00").toISOString())} às {time} ·{" "}
                {service ? formatBRL(service.price_cents) : ""}
              </p>
            </div>

            <Button
              size="lg"
              className="h-14 w-full text-base font-semibold"
              disabled={!canSubmit || booking.isPending}
              onClick={() => booking.mutate()}
            >
              {booking.isPending ? (
                <Loader2 className="mr-2 size-5 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="mr-2 size-5" aria-hidden="true" />
              )}
              Confirmar agendamento
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {business.cancellation_policy}
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
