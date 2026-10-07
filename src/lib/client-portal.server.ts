import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  formatBRL,
  formatDateBR,
  formatPhone,
  formatTimeBR,
  localDateTimeToUTC,
  normalizePhone,
  todayISODate,
} from "@/lib/format";
import { computeAvailability, notifyAppointmentCancelled } from "@/lib/booking.server";
import { dispatchWhatsApp } from "@/lib/whatsapp.server";

export type ClientAppointmentItem = {
  id: string;
  startsAt: string;
  endsAt: string;
  dateBR: string;
  timeBR: string;
  serviceId: string;
  serviceName: string;
  serviceDuration: number;
  priceCents: number;
  priceFormatted: string;
  barberId: string;
  barberName: string;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  canReschedule: boolean;
  canCancel: boolean;
  hoursUntil: number;
  notes: string;
};

export type ClientPortalData = {
  found: boolean;
  client: {
    id: string;
    name: string;
    phone: string;
    phoneFormatted: string;
  } | null;
  business: {
    name: string;
    whatsappPhone: string;
    cancellationPolicy: string;
  };
  upcoming: ClientAppointmentItem[];
  monthAppointments: ClientAppointmentItem[];
  monthSummary: {
    totalAppointments: number;
    totalSpentCents: number;
    totalSpentFormatted: string;
    monthName: string;
  };
};

/**
 * Retorna o portal do cliente com base no número de telefone.
 * Identifica agendamentos futuros e histórico do mês atual.
 */
export async function getClientPortalData(rawPhone: string): Promise<ClientPortalData> {
  const phone = normalizePhone(rawPhone);

  const { data: business } = await supabaseAdmin
    .from("business_settings")
    .select("name, whatsapp_phone, cancellation_policy")
    .limit(1)
    .maybeSingle();

  const bizInfo = {
    name: business?.name ?? "Barbearia 14 de Novembro",
    whatsappPhone: business?.whatsapp_phone ?? "",
    cancellationPolicy: business?.cancellation_policy ?? "",
  };

  if (!phone || phone.length < 10) {
    return {
      found: false,
      client: null,
      business: bizInfo,
      upcoming: [],
      monthAppointments: [],
      monthSummary: {
        totalAppointments: 0,
        totalSpentCents: 0,
        totalSpentFormatted: "R$ 0,00",
        monthName: "",
      },
    };
  }

  // 1. Busca cliente pelo telefone
  const { data: client } = await supabaseAdmin
    .from("clients")
    .select("id, name, phone")
    .eq("phone", phone)
    .maybeSingle();

  if (!client) {
    return {
      found: false,
      client: null,
      business: bizInfo,
      upcoming: [],
      monthAppointments: [],
      monthSummary: {
        totalAppointments: 0,
        totalSpentCents: 0,
        totalSpentFormatted: "R$ 0,00",
        monthName: "",
      },
    };
  }

  // 2. Busca agendamentos do cliente
  const { data: rawAppointments } = await supabaseAdmin
    .from("appointments")
    .select(
      `
      id,
      starts_at,
      ends_at,
      status,
      price_cents,
      notes,
      service_id,
      barber_id,
      services (id, name, duration_minutes),
      barbers (id, name)
    `,
    )
    .eq("client_id", client.id)
    .order("starts_at", { ascending: false });

  const appts = rawAppointments ?? [];
  const now = new Date();
  const nowTime = now.getTime();

  // Início e fim do mês corrente (fuso local)
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 a 11
  const startOfMonth = new Date(currentYear, currentMonth, 1);
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

  const monthNames = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  const monthName = `${monthNames[currentMonth]} de ${currentYear}`;

  const formattedItems: ClientAppointmentItem[] = appts.map((item) => {
    const startsAtDate = new Date(item.starts_at);
    const diffMs = startsAtDate.getTime() - nowTime;
    const hoursUntil = Math.round(diffMs / (1000 * 60 * 60));

    // Regras estritas:
    // Reagendar: >= 24 horas antes e status 'scheduled'
    const canReschedule = item.status === "scheduled" && diffMs >= 24 * 60 * 60 * 1000;

    // Cancelar: >= 3 horas antes e status 'scheduled'
    const canCancel = item.status === "scheduled" && diffMs >= 3 * 60 * 60 * 1000;

    const serv = Array.isArray(item.services) ? item.services[0] : item.services;
    const barb = Array.isArray(item.barbers) ? item.barbers[0] : item.barbers;

    return {
      id: item.id,
      startsAt: item.starts_at,
      endsAt: item.ends_at,
      dateBR: formatDateBR(item.starts_at),
      timeBR: formatTimeBR(item.starts_at),
      serviceId: item.service_id,
      serviceName: serv?.name ?? "Serviço",
      serviceDuration: serv?.duration_minutes ?? 30,
      priceCents: item.price_cents ?? 0,
      priceFormatted: formatBRL(item.price_cents ?? 0),
      barberId: item.barber_id,
      barberName: barb?.name ?? "Barbeiro",
      status: item.status as ClientAppointmentItem["status"],
      canReschedule,
      canCancel,
      hoursUntil,
      notes: item.notes ?? "",
    };
  });

  // Próximos agendamentos ativos (a partir de 30min atrás até o futuro)
  const upcoming = formattedItems
    .filter((a) => {
      const t = new Date(a.startsAt).getTime();
      return a.status === "scheduled" && t >= nowTime - 30 * 60 * 1000;
    })
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  // Atendimentos do mês corrente
  const monthAppointments = formattedItems
    .filter((a) => {
      const t = new Date(a.startsAt).getTime();
      return t >= startOfMonth.getTime() && t <= endOfMonth.getTime();
    })
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

  // Total gasto em serviços completados ou agendados no mês (exclui cancelados)
  const monthSpentCents = monthAppointments
    .filter((a) => a.status !== "cancelled")
    .reduce((acc, curr) => acc + curr.priceCents, 0);

  return {
    found: true,
    client: {
      id: client.id,
      name: client.name,
      phone: client.phone,
      phoneFormatted: formatPhone(client.phone),
    },
    business: bizInfo,
    upcoming,
    monthAppointments,
    monthSummary: {
      totalAppointments: monthAppointments.length,
      totalSpentCents: monthSpentCents,
      totalSpentFormatted: formatBRL(monthSpentCents),
      monthName,
    },
  };
}

/**
 * Cancela um agendamento com validação de antecedência mínima de 3 horas.
 */
export async function cancelClientAppointment(params: {
  rawPhone: string;
  appointmentId: string;
  reason?: string;
}): Promise<{ success: boolean; message: string }> {
  const phone = normalizePhone(params.rawPhone);

  // 1. Busca agendamento e valida se pertence ao cliente do telefone
  const { data: appt, error } = await supabaseAdmin
    .from("appointments")
    .select("id, starts_at, status, clients (phone)")
    .eq("id", params.appointmentId)
    .maybeSingle();

  if (error || !appt) {
    throw new Error("Agendamento não encontrado.");
  }

  const clientPhone = (Array.isArray(appt.clients) ? appt.clients[0]?.phone : appt.clients?.phone) ?? "";
  if (normalizePhone(clientPhone) !== phone) {
    throw new Error("Não autorizado: este agendamento não pertence ao telefone informado.");
  }

  if (appt.status !== "scheduled") {
    throw new Error(`Este agendamento não pode ser cancelado pois está com status '${appt.status}'.`);
  }

  // 2. Valida antecedência mínima de 3 horas (3 * 60 * 60 * 1000 ms)
  const startsAt = new Date(appt.starts_at).getTime();
  const diffMs = startsAt - Date.now();
  const minRequiredMs = 3 * 60 * 60 * 1000;

  if (diffMs < minRequiredMs) {
    throw new Error(
      "Cancelamento online permitido apenas com no mínimo 3 horas de antecedência. Por favor, entre em contato direto pelo WhatsApp da barbearia.",
    );
  }

  // 3. Atualiza status para 'cancelled'
  const { error: updateError } = await supabaseAdmin
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", params.appointmentId);

  if (updateError) {
    throw new Error(`Erro ao cancelar agendamento: ${updateError.message}`);
  }

  // 4. Dispara notificação de cancelamento pelo WhatsApp
  try {
    await notifyAppointmentCancelled(params.appointmentId);
  } catch (err) {
    console.error("[Client Portal] Falha ao disparar notificação WhatsApp de cancelamento:", err);
  }

  return {
    success: true,
    message: "Agendamento cancelado com sucesso. O horário foi liberado.",
  };
}

/**
 * Reagenda um atendimento com validação de antecedência mínima de 24 horas (1 dia).
 */
export async function rescheduleClientAppointment(params: {
  rawPhone: string;
  appointmentId: string;
  newDate: string; // YYYY-MM-DD
  newTime: string; // HH:mm
}): Promise<{ success: boolean; message: string; startsAt: string }> {
  const phone = normalizePhone(params.rawPhone);

  // 1. Busca agendamento e valida propriedade
  const { data: appt, error } = await supabaseAdmin
    .from("appointments")
    .select(
      `
      id,
      starts_at,
      status,
      barber_id,
      service_id,
      clients (name, phone),
      barbers (name),
      services (name, duration_minutes)
    `,
    )
    .eq("id", params.appointmentId)
    .maybeSingle();

  if (error || !appt) {
    throw new Error("Agendamento não encontrado.");
  }

  const clientPhone = (Array.isArray(appt.clients) ? appt.clients[0]?.phone : appt.clients?.phone) ?? "";
  if (normalizePhone(clientPhone) !== phone) {
    throw new Error("Não autorizado: este agendamento não pertence ao telefone informado.");
  }

  if (appt.status !== "scheduled") {
    throw new Error(`Este agendamento não pode ser reagendado pois está com status '${appt.status}'.`);
  }

  // 2. Valida antecedência mínima de 24 horas (1 dia antes)
  const currentStartsAt = new Date(appt.starts_at).getTime();
  const diffMs = currentStartsAt - Date.now();
  const minRequiredMs = 24 * 60 * 60 * 1000;

  if (diffMs < minRequiredMs) {
    throw new Error(
      "Reagendamento online permitido apenas com no mínimo 24 horas de antecedência. Para alterações de última hora, contate a barbearia.",
    );
  }

  // 3. Valida disponibilidade da nova data/horário
  const avail = await computeAvailability({
    barberId: appt.barber_id,
    serviceId: appt.service_id,
    date: params.newDate,
  });

  if (avail.closed) {
    throw new Error(avail.reason || "Barbearia fechada nesta data.");
  }

  if (!avail.slots.includes(params.newTime)) {
    throw new Error("O horário selecionado não está mais disponível. Por favor, escolha outro.");
  }

  // 4. Calcula novos horários UTC
  const serv = Array.isArray(appt.services) ? appt.services[0] : appt.services;
  const durationMinutes = serv?.duration_minutes ?? 30;

  const newStartsAt = localDateTimeToUTC(params.newDate, params.newTime);
  const newEndsAt = new Date(newStartsAt.getTime() + durationMinutes * 60_000);

  // 5. Atualiza o agendamento
  const { error: updateError } = await supabaseAdmin
    .from("appointments")
    .update({
      starts_at: newStartsAt.toISOString(),
      ends_at: newEndsAt.toISOString(),
      status: "scheduled",
    })
    .eq("id", params.appointmentId);

  if (updateError) {
    if (updateError.message.includes("no_overlap_per_barber")) {
      throw new Error("Este novo horário acabou de ser reservado por outro cliente.");
    }
    throw new Error(`Erro ao reagendar: ${updateError.message}`);
  }

  // 6. Notificação pelo WhatsApp do reagendamento
  try {
    const { data: business } = await supabaseAdmin
      .from("business_settings")
      .select("name, address_line, city")
      .limit(1)
      .maybeSingle();

    const clientName = (Array.isArray(appt.clients) ? appt.clients[0]?.name : appt.clients?.name) ?? "Cliente";
    const barberName = (Array.isArray(appt.barbers) ? appt.barbers[0]?.name : appt.barbers?.name) ?? "Barbeiro";
    const serviceName = serv?.name ?? "Serviço";

    const text = `🔄 *Agendamento Reagendado com Sucesso!*\n\nOlá, *${clientName}*! Seu horário na *${business?.name ?? "Barbearia"}* foi alterado.\n\n✂️ *Serviço:* ${serviceName}\n💈 *Barbeiro:* ${barberName}\n📅 *Nova Data:* ${formatDateBR(newStartsAt.toISOString())}\n⏰ *Novo Horário:* ${params.newTime}\n📍 *Local:* ${business?.address_line ?? ""}, ${business?.city ?? ""}\n\nTe esperamos lá! 💈`;

    const { sendAutomatedMessage } = await import("@/lib/whatsapp-client.server");
    await sendAutomatedMessage(phone, text);
  } catch (err) {
    console.error("[Client Portal] Falha ao disparar WhatsApp de reagendamento:", err);
  }

  return {
    success: true,
    message: "Horário reagendado com sucesso!",
    startsAt: newStartsAt.toISOString(),
  };
}
