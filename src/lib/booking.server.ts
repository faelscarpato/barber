import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { dispatchWhatsApp } from "@/lib/whatsapp.server";
import {
  formatBRL,
  formatDateBR,
  formatPhone,
  formatTimeBR,
  localDateTimeToUTC,
  normalizePhone,
  todayISODate,
  weekdayOfISODate,
} from "@/lib/format";

import type { BookingContext } from "@/lib/booking.types";
export type { BookingContext };

export async function loadBookingContext(): Promise<BookingContext> {
  const [business, services, barbers, links] = await Promise.all([
    supabaseAdmin.from("business_settings").select("*").limit(1).maybeSingle(),
    supabaseAdmin
      .from("services")
      .select("id, name, description, duration_minutes, price_cents")
      .eq("active", true)
      .order("sort_order"),
    supabaseAdmin
      .from("barbers")
      .select("id, name, photo_url, bio")
      .eq("active", true)
      .order("sort_order"),
    supabaseAdmin.from("barber_services").select("barber_id, service_id"),
  ]);

  const b = business.data;
  return {
    business: {
      name: b?.name ?? "Barbearia 14 de Novembro",
      tagline: b?.tagline ?? "",
      address_line: b?.address_line ?? "",
      city: b?.city ?? "",
      whatsapp_phone: b?.whatsapp_phone ?? "",
      instagram_url: b?.instagram_url ?? null,
      maps_url: b?.maps_url ?? null,
      review_url: b?.review_url ?? null,
      opening_hours_text: b?.opening_hours_text ?? "",
      cancellation_policy: b?.cancellation_policy ?? "",
      max_advance_days: b?.max_advance_days ?? 45,
    },
    services: services.data ?? [],
    barbers: barbers.data ?? [],
    barberServices: links.data ?? [],
  };
}

function minutesToTime(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export async function computeAvailability(input: {
  barberId: string;
  serviceId: string;
  date: string;
}): Promise<{ slots: string[]; closed: boolean; reason?: string }> {
  const [{ data: service }, { data: settings }, { data: hours }, { data: blocks }] =
    await Promise.all([
      supabaseAdmin
        .from("services")
        .select("duration_minutes")
        .eq("id", input.serviceId)
        .maybeSingle(),
      supabaseAdmin
        .from("business_settings")
        .select("slot_step_minutes, min_lead_minutes, max_advance_days")
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("working_hours")
        .select("*")
        .eq("barber_id", input.barberId)
        .eq("weekday", weekdayOfISODate(input.date))
        .maybeSingle(),
      supabaseAdmin
        .from("blocked_dates")
        .select("*")
        .eq("block_date", input.date)
        .or(`barber_id.eq.${input.barberId},barber_id.is.null`),
    ]);

  if (!service) return { slots: [], closed: true, reason: "Serviço indisponível." };
  if (!hours || !hours.active) return { slots: [], closed: true, reason: "Fechado nesta data." };

  const fullDayBlock = (blocks ?? []).some((b) => !b.start_time || !b.end_time);
  if (fullDayBlock) return { slots: [], closed: true, reason: "Agenda bloqueada nesta data." };

  const step = settings?.slot_step_minutes ?? 15;
  const lead = settings?.min_lead_minutes ?? 60;
  const duration = service.duration_minutes;

  const dayStart = localDateTimeToUTC(input.date, "00:00").getTime();
  const openMin = timeToMinutes(hours.start_time);
  const closeMin = timeToMinutes(hours.end_time);

  const { data: appts } = await supabaseAdmin
    .from("appointments")
    .select("starts_at, ends_at")
    .eq("barber_id", input.barberId)
    .neq("status", "cancelled")
    .gte("starts_at", new Date(dayStart - 12 * 3600_000).toISOString())
    .lte("starts_at", new Date(dayStart + 36 * 3600_000).toISOString());

  const busy: [number, number][] = (appts ?? []).map((a) => [
    new Date(a.starts_at).getTime(),
    new Date(a.ends_at).getTime(),
  ]);

  if (hours.break_start && hours.break_end) {
    busy.push([
      localDateTimeToUTC(input.date, hours.break_start).getTime(),
      localDateTimeToUTC(input.date, hours.break_end).getTime(),
    ]);
  }
  for (const b of blocks ?? []) {
    if (b.start_time && b.end_time) {
      busy.push([
        localDateTimeToUTC(input.date, b.start_time).getTime(),
        localDateTimeToUTC(input.date, b.end_time).getTime(),
      ]);
    }
  }

  const earliest = Date.now() + lead * 60_000;
  const slots: string[] = [];

  for (let m = openMin; m + duration <= closeMin; m += step) {
    const startTime = minutesToTime(m);
    const start = localDateTimeToUTC(input.date, startTime).getTime();
    const end = start + duration * 60_000;
    if (start < earliest) continue;
    const overlaps = busy.some(([bs, be]) => start < be && end > bs);
    if (overlaps) continue;
    slots.push(startTime);
  }

  return { slots, closed: false };
}

export type CreateAppointmentInput = {
  barberId: string;
  serviceId: string;
  date: string;
  time: string;
  clientName: string;
  clientPhone: string;
  notes: string;
};

export async function createAppointment(input: CreateAppointmentInput) {
  const availability = await computeAvailability({
    barberId: input.barberId,
    serviceId: input.serviceId,
    date: input.date,
  });
  if (availability.closed || !availability.slots.includes(input.time.slice(0, 5))) {
    throw new Error("Este horário não está mais disponível. Escolha outro.");
  }

  const { data: service } = await supabaseAdmin
    .from("services")
    .select("id, name, duration_minutes, price_cents")
    .eq("id", input.serviceId)
    .maybeSingle();
  const { data: barber } = await supabaseAdmin
    .from("barbers")
    .select("id, name, phone")
    .eq("id", input.barberId)
    .maybeSingle();
  if (!service || !barber) throw new Error("Serviço ou profissional indisponível.");

  const phone = normalizePhone(input.clientPhone);
  const { data: existing } = await supabaseAdmin
    .from("clients")
    .select("id, name")
    .eq("phone", phone)
    .maybeSingle();

  let clientId = existing?.id;
  if (clientId) {
    await supabaseAdmin.from("clients").update({ name: input.clientName }).eq("id", clientId);
  } else {
    const { data: created, error } = await supabaseAdmin
      .from("clients")
      .insert({ name: input.clientName, phone })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    clientId = created.id;
  }

  const startsAt = localDateTimeToUTC(input.date, input.time);
  const endsAt = new Date(startsAt.getTime() + service.duration_minutes * 60_000);

  const { data: appointment, error: apptError } = await supabaseAdmin
    .from("appointments")
    .insert({
      client_id: clientId,
      barber_id: barber.id,
      service_id: service.id,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      price_cents: service.price_cents,
      notes: input.notes,
      source: "online",
    })
    .select("id, starts_at, ends_at")
    .single();

  if (apptError) {
    if (apptError.message.includes("no_overlap_per_barber")) {
      throw new Error("Este horário acabou de ser ocupado. Escolha outro.");
    }
    throw new Error(apptError.message);
  }

  // Disparo resiliente: notificação via WhatsApp não pode abortar o agendamento já persistido
  try {
    await notifyAppointmentCreated(appointment.id);
  } catch (err) {
    console.error("[Booking Server] Falha ao disparar notificação WhatsApp de criação:", err);
  }

  return {
    id: appointment.id,
    startsAt: appointment.starts_at,
    serviceName: service.name,
    barberName: barber.name,
    priceCents: service.price_cents,
    clientName: input.clientName,
  };
}

async function loadAppointmentBundle(appointmentId: string) {
  const { data } = await supabaseAdmin
    .from("appointments")
    .select(
      "id, starts_at, price_cents, paid_cents, notes, clients(name, phone), barbers(name, phone), services(name, duration_minutes)",
    )
    .eq("id", appointmentId)
    .maybeSingle();
  const [{ data: business }, { data: automation }] = await Promise.all([
    supabaseAdmin.from("business_settings").select("*").limit(1).maybeSingle(),
    supabaseAdmin.from("automation_settings").select("*").limit(1).maybeSingle(),
  ]);
  return { appt: data, business, automation };
}

function baseVars(
  appt: NonNullable<Awaited<ReturnType<typeof loadAppointmentBundle>>["appt"]>,
  business: { name?: string; address_line?: string; city?: string } | null,
): Record<string, string> {
  return {
    cliente: appt.clients?.name ?? "",
    telefone: formatPhone(appt.clients?.phone ?? ""),
    barbeiro: appt.barbers?.name ?? "",
    servico: appt.services?.name ?? "",
    duracao: String(appt.services?.duration_minutes ?? ""),
    data: formatDateBR(appt.starts_at),
    hora: formatTimeBR(appt.starts_at),
    valor: formatBRL(appt.price_cents),
    barbearia: business?.name ?? "",
    endereco: `${business?.address_line ?? ""}, ${business?.city ?? ""}`,
  };
}

export async function notifyAppointmentCreated(appointmentId: string) {
  const { appt, business, automation } = await loadAppointmentBundle(appointmentId);
  if (!appt || !automation) return;
  const vars = baseVars(appt, business);

  if (automation.notify_client_on_create && appt.clients?.phone) {
    await dispatchWhatsApp({
      templateKey: "client_created",
      toPhone: appt.clients.phone,
      vars,
      appointmentId,
    });
  }
  const barberPhone = appt.barbers?.phone || automation.barber_notify_phone;
  if (automation.notify_barber_on_create && barberPhone) {
    await dispatchWhatsApp({
      templateKey: "barber_created",
      toPhone: barberPhone,
      vars,
      appointmentId,
    });
  }
}

export async function notifyAppointmentCancelled(appointmentId: string) {
  const { appt, business, automation } = await loadAppointmentBundle(appointmentId);
  if (!appt || !automation?.notify_on_cancel || !appt.clients?.phone) return;
  await dispatchWhatsApp({
    templateKey: "client_cancelled",
    toPhone: appt.clients.phone,
    vars: baseVars(appt, business),
    appointmentId,
  });
}

export async function notifyPayment(appointmentId: string, amountCents: number) {
  const { appt, business, automation } = await loadAppointmentBundle(appointmentId);
  if (!appt || !automation?.notify_on_payment || !appt.clients?.phone) return;
  await dispatchWhatsApp({
    templateKey: "client_payment",
    toPhone: appt.clients.phone,
    vars: { ...baseVars(appt, business), valor: formatBRL(amountCents) },
    appointmentId,
  });
}

/** Executado pelo agendador: lembretes de cliente e agenda do dia do barbeiro. */
export async function runAutomationCycle() {
  const { data: automation } = await supabaseAdmin
    .from("automation_settings")
    .select("*")
    .limit(1)
    .maybeSingle();
  const { data: business } = await supabaseAdmin
    .from("business_settings")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (!automation) return { reminders: 0, dailyAgenda: false };

  let reminders = 0;

  const nowMs = Date.now();
  const leadMinutes = automation.reminder_lead_minutes ?? 60;
  const windowEnd = new Date(nowMs + leadMinutes * 60_000).toISOString();
  const selectCols =
    "id, starts_at, price_cents, paid_cents, notes, clients(name, phone), barbers(name, phone), services(name, duration_minutes)";

  if (automation.reminder_client_enabled) {
    const { data: upcoming } = await supabaseAdmin
      .from("appointments")
      .select(selectCols)
      .in("status", ["scheduled", "confirmed"])
      .is("reminder_sent_at", null)
      .gte("starts_at", new Date(nowMs).toISOString())
      .lte("starts_at", windowEnd);

    for (const appt of upcoming ?? []) {
      if (!appt.clients?.phone) continue;
      await dispatchWhatsApp({
        templateKey: "client_reminder",
        toPhone: appt.clients.phone,
        vars: baseVars(appt, business),
        appointmentId: appt.id,
      });
      await supabaseAdmin
        .from("appointments")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", appt.id);
      reminders += 1;
    }
  }

  // Lembrete para a barbearia/barbeiro 1h antes do atendimento
  if (automation.reminder_barber_enabled) {
    const { data: upcoming } = await supabaseAdmin
      .from("appointments")
      .select(selectCols)
      .in("status", ["scheduled", "confirmed"])
      .is("barber_reminder_sent_at", null)
      .gte("starts_at", new Date(nowMs).toISOString())
      .lte("starts_at", windowEnd);

    for (const appt of upcoming ?? []) {
      const toPhone =
        appt.barbers?.phone || automation.barber_notify_phone || business?.whatsapp_phone;
      if (!toPhone) continue;
      await dispatchWhatsApp({
        templateKey: "barber_reminder",
        toPhone,
        vars: baseVars(appt, business),
        appointmentId: appt.id,
      });
      await supabaseAdmin
        .from("appointments")
        .update({ barber_reminder_sent_at: new Date().toISOString() })
        .eq("id", appt.id);
      reminders += 1;
    }
  }

  let dailyAgenda = false;
  if (automation.reminder_barber_daily_enabled) {
    const today = todayISODate();
    const hourNow = Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        hour12: false,
      }).format(new Date()),
    );
    if (hourNow === automation.daily_agenda_hour) {
      const { data: alreadySent } = await supabaseAdmin
        .from("whatsapp_logs")
        .select("id")
        .eq("template_key", "barber_daily")
        .gte("created_at", new Date(Date.now() - 20 * 3600_000).toISOString())
        .limit(1);
      if (!alreadySent?.length) {
        const dayStart = localDateTimeToUTC(today, "00:00").toISOString();
        const dayEnd = localDateTimeToUTC(today, "23:59").toISOString();
        const { data: list } = await supabaseAdmin
          .from("appointments")
          .select("starts_at, clients(name), services(name)")
          .neq("status", "cancelled")
          .gte("starts_at", dayStart)
          .lte("starts_at", dayEnd)
          .order("starts_at");
        const agenda =
          (list ?? [])
            .map((a) => `${formatTimeBR(a.starts_at)} - ${a.clients?.name} (${a.services?.name})`)
            .join("\n") || "Sem agendamentos.";
        if (automation.barber_notify_phone) {
          await dispatchWhatsApp({
            templateKey: "barber_daily",
            toPhone: automation.barber_notify_phone,
            vars: {
              data: formatDateBR(dayStart),
              agenda,
              total: String(list?.length ?? 0),
              barbearia: business?.name ?? "",
            },
          });
          dailyAgenda = true;
        }
      }
    }
  }

  return { reminders, dailyAgenda };
}
