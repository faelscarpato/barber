import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { CalendarCheck, CheckCircle2, Clock, MapPin, MessageCircle } from "lucide-react";
import { getBookingSummary } from "@/lib/booking.functions";
import { formatBRL, formatLongDateBR, formatTimeBR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/agendar/confirmacao")({
  head: () => ({
    meta: [
      { title: "Agendamento confirmado — Barbearia 14 de Novembro" },
      {
        name: "description",
        content: "Detalhes do seu horário na Barbearia 14 de Novembro, em Pedreira-SP.",
      },
      { property: "og:title", content: "Agendamento confirmado" },
      {
        property: "og:description",
        content: "Seu horário está reservado na Barbearia 14 de Novembro.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: z.object({ id: z.string().uuid().optional() }),
  component: Confirmacao,
});

function Confirmacao() {
  const { id } = Route.useSearch();

  const summary = useQuery({
    queryKey: ["booking-summary", id],
    enabled: Boolean(id),
    queryFn: () => getBookingSummary({ data: { id: id! } }),
  });

  const appointment = summary.data?.appointment;
  const business = summary.data?.business;

  const whatsappLink = useMemo(() => {
    if (!appointment || !business?.whatsapp_phone) return null;
    const text = [
      `Olá, ${business.name}! Acabei de agendar pelo site.`,
      "",
      `Cliente: ${appointment.clients?.name ?? ""}`,
      `Telefone: ${appointment.clients?.phone ?? ""}`,
      `Serviço: ${appointment.services?.name ?? ""} (${appointment.services?.duration_minutes ?? ""} min)`,
      `Profissional: ${appointment.barbers?.name ?? ""}`,
      `Data: ${formatLongDateBR(appointment.starts_at)}`,
      `Horário: ${formatTimeBR(appointment.starts_at)}`,
      `Valor: ${formatBRL(appointment.price_cents)}`,
      appointment.notes ? `Observações: ${appointment.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    return `https://wa.me/${business.whatsapp_phone}?text=${encodeURIComponent(text)}`;
  }, [appointment, business]);

  const [autoSent, setAutoSent] = useState(false);

  useEffect(() => {
    if (!whatsappLink || !id) return;
    const key = `wa-sent-${id}`;
    if (sessionStorage.getItem(key)) {
      setAutoSent(true);
      return;
    }
    sessionStorage.setItem(key, "1");
    setAutoSent(true);
    const timer = window.setTimeout(() => {
      const win = window.open(whatsappLink, "_blank", "noopener");
      if (!win) window.location.href = whatsappLink;
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [whatsappLink, id]);

  return (
    <div className="surface-grain flex min-h-screen flex-col items-center px-5 py-12">
      <div className="w-full max-w-md">
        {!id ? (
          <p className="text-center text-muted-foreground">
            Agendamento não encontrado.{" "}
            <Link to="/agendar" className="text-primary underline">
              Agendar horário
            </Link>
          </p>
        ) : summary.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        ) : !appointment ? (
          <p className="text-center text-muted-foreground">
            Não encontramos este agendamento.{" "}
            <Link to="/agendar" className="text-primary underline">
              Tentar de novo
            </Link>
          </p>
        ) : (
          <>
            <div className="text-center">
              <CheckCircle2 className="mx-auto size-12 text-success" aria-hidden="true" />
              <h1 className="mt-4 text-4xl">Horário reservado</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {autoSent
                  ? "Abrindo seu WhatsApp para enviar os dados do agendamento à barbearia…"
                  : "Enviamos a confirmação no seu WhatsApp."}
              </p>
            </div>

            <div className="mt-8 rounded-lg border border-border bg-card p-5">
              <p className="eyebrow">Detalhes</p>
              <dl className="mt-3 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Cliente</dt>
                  <dd className="font-semibold">{appointment.clients?.name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Serviço</dt>
                  <dd className="font-semibold">{appointment.services?.name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Profissional</dt>
                  <dd className="font-semibold">{appointment.barbers?.name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Data</dt>
                  <dd className="font-semibold">{formatLongDateBR(appointment.starts_at)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Horário</dt>
                  <dd className="font-semibold">{formatTimeBR(appointment.starts_at)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Valor</dt>
                  <dd className="font-display text-xl text-primary">
                    {formatBRL(appointment.price_cents)}
                  </dd>
                </div>
              </dl>
            </div>

            {business && (
              <div className="mt-4 space-y-3">
                <Button asChild variant="outline" className="h-12 w-full">
                  <a href={business.maps_url ?? "#"} target="_blank" rel="noreferrer">
                    <MapPin className="mr-2 size-4" aria-hidden="true" />
                    {business.address_line}
                  </a>
                </Button>
                <Button asChild variant="secondary" className="h-12 w-full">
                  <a
                    href={whatsappLink ?? `https://wa.me/${business.whatsapp_phone}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="mr-2 size-4" aria-hidden="true" />
                    Enviar agendamento no WhatsApp
                  </a>
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  {business.cancellation_policy}
                </p>
              </div>
            )}

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button asChild variant="outline" className="h-12 w-full">
                <Link to="/meus-agendamentos">
                  <Clock className="mr-2 size-4" aria-hidden="true" />
                  Meus Agendamentos
                </Link>
              </Button>
              <Button asChild className="h-12 w-full">
                <Link to="/">
                  <CalendarCheck className="mr-2 size-4" aria-hidden="true" />
                  Página Inicial
                </Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
