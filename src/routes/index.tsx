import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Instagram, MapPin, MessageCircle, Scissors, Star } from "lucide-react";
import heroImage from "@/assets/hero-barbearia.jpg";
import { getBookingContext } from "@/lib/booking.functions";
import type { BookingContext } from "@/lib/booking.types";
import { formatBRL } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Barbearia 14 de Novembro — Barbearia em Pedreira-SP" },
      {
        name: "description",
        content:
          "Corte, barba e acabamento no Centro de Pedreira-SP. Agende seu horário online na Barbearia 14 de Novembro.",
      },
      { property: "og:title", content: "Barbearia 14 de Novembro — Barbearia em Pedreira-SP" },
      {
        property: "og:description",
        content:
          "Corte, barba e acabamento no Centro de Pedreira-SP. Agende seu horário online na Barbearia 14 de Novembro.",
      },
    ],
  }),
  loader: () => getBookingContext(),
  errorComponent: () => (
    <div className="flex min-h-screen items-center justify-center p-6 text-center">
      <p className="text-muted-foreground">
        Não conseguimos carregar as informações agora. Atualize a página.
      </p>
    </div>
  ),
  component: Home,
});

const DIFERENCIAIS = [
  {
    title: "Hora marcada de verdade",
    text: "Agenda controlada horário a horário. Você chega, senta e é atendido.",
  },
  {
    title: "Acabamento na navalha",
    text: "Contorno feito no detalhe, do pézinho à barba, com toalha quente.",
  },
  {
    title: "No Centro de Pedreira",
    text: "Fácil de chegar, fácil de estacionar, atendimento sem enrolação.",
  },
];

function Home() {
  const { business, services, barbers } = Route.useLoaderData() as BookingContext;
  const whatsappLink = `https://wa.me/${business.whatsapp_phone}`;

  return (
    <div className="surface-grain min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Link to="/" className="font-display text-xl leading-none tracking-wider">
          14 <span className="text-primary">de Novembro</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            to="/meus-agendamentos"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary"
          >
            Meus Agendamentos
          </Link>
          <Link
            to="/login"
            className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 transition-colors hover:text-primary"
          >
            Painel
          </Link>
        </div>
      </header>

      <main>
        <section className="relative mx-auto max-w-5xl px-5 pb-14 pt-6">
          <div className="overflow-hidden rounded-lg border border-border">
            <img
              src={heroImage}
              alt="Interior da Barbearia 14 de Novembro com cadeira clássica e luminárias de latão"
              width={1600}
              height={1200}
              className="h-56 w-full object-cover sm:h-80"
            />
          </div>
          <div className="mt-8">
            <p className="eyebrow">{business.city}</p>
            <h1 className="mt-3 text-5xl leading-[0.95] sm:text-7xl">
              Barbearia
              <br />
              <span className="text-primary">14 de Novembro</span>
            </h1>
            <p className="mt-4 max-w-md text-base text-muted-foreground">{business.tagline}</p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-14 text-base font-semibold">
                <Link to="/agendar">Agendar horário</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-14 text-base">
                <a href={whatsappLink} target="_blank" rel="noreferrer">
                  <MessageCircle className="mr-2 size-5" aria-hidden="true" />
                  Falar no WhatsApp
                </a>
              </Button>
            </div>

            <div className="mt-8 grid gap-3 text-sm sm:grid-cols-2">
              <a
                href={business.maps_url ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 rounded-md border border-border bg-card p-4 transition-colors hover:border-primary"
              >
                <MapPin className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  <span className="block font-semibold">{business.address_line}</span>
                  <span className="text-muted-foreground">{business.city} · Como chegar</span>
                </span>
              </a>
              <div className="flex items-start gap-3 rounded-md border border-border bg-card p-4">
                <Clock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  <span className="block font-semibold">Horário de funcionamento</span>
                  <span className="text-muted-foreground">{business.opening_hours_text}</span>
                </span>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-3">
              {business.instagram_url && (
                <Button asChild variant="secondary" className="h-12">
                  <a href={business.instagram_url} target="_blank" rel="noreferrer">
                    <Instagram className="mr-2 size-4" aria-hidden="true" />
                    Instagram
                  </a>
                </Button>
              )}
              {business.review_url && (
                <Button asChild variant="secondary" className="h-12">
                  <a href={business.review_url} target="_blank" rel="noreferrer">
                    <Star className="mr-2 size-4" aria-hidden="true" />
                    Avaliar a barbearia
                  </a>
                </Button>
              )}
            </div>
          </div>
        </section>

        <div className="rule-brass mx-auto h-px max-w-5xl" />

        <section className="mx-auto max-w-5xl px-5 py-14">
          <p className="eyebrow">Serviços</p>
          <h2 className="mt-2 text-3xl sm:text-4xl">O que fazemos na cadeira</h2>
          <ul className="mt-6 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {services.map((service) => (
              <li key={service.id} className="flex items-center justify-between gap-4 p-5">
                <div>
                  <p className="font-display text-2xl leading-none">{service.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{service.description}</p>
                  <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                    {service.duration_minutes} min
                  </p>
                </div>
                <span className="shrink-0 font-display text-2xl text-primary">
                  {formatBRL(service.price_cents)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-5xl px-5 pb-14">
          <p className="eyebrow">Por que aqui</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {DIFERENCIAIS.map((item) => (
              <div key={item.title} className="rounded-lg border border-border bg-card p-5">
                <Scissors className="size-5 text-primary" aria-hidden="true" />
                <h3 className="mt-3 text-2xl leading-none">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        {barbers.length > 1 && (
          <section className="mx-auto max-w-5xl px-5 pb-14">
            <p className="eyebrow">Profissionais</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {barbers.map((barber) => (
                <div key={barber.id} className="rounded-lg border border-border bg-card p-5">
                  <p className="font-display text-2xl leading-none">{barber.name}</p>
                  {barber.bio && <p className="mt-2 text-sm text-muted-foreground">{barber.bio}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mx-auto max-w-5xl px-5 pb-16">
          <div className="rounded-lg border border-primary/40 bg-elevated p-8 text-center">
            <h2 className="text-4xl sm:text-5xl">Sua cadeira está esperando</h2>
            <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
              {business.cancellation_policy}
            </p>
            <Button
              asChild
              size="lg"
              className="mt-6 h-14 w-full text-base font-semibold sm:w-auto"
            >
              <Link to="/agendar">Agendar horário</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-5 py-8 text-sm text-muted-foreground">
          <p className="font-display text-xl text-foreground">{business.name}</p>
          <p className="mt-2">
            {business.address_line} — {business.city}
          </p>
          <p>{business.opening_hours_text}</p>
          <p className="mt-4 text-xs">
            © {new Date().getFullYear()} {business.name}. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
