import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

async function assertStaff(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  if (!data || data.length === 0) throw new Error("Acesso negado");
}

export const notifyPaymentReceived = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({ appointmentId: z.string().uuid(), amountCents: z.number().int().positive() })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { notifyPayment } = await import("@/lib/booking.server");
    await notifyPayment(data.appointmentId, data.amountCents);
    return { ok: true };
  });

export const notifyCancellation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ appointmentId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { notifyAppointmentCancelled } = await import("@/lib/booking.server");
    await notifyAppointmentCancelled(data.appointmentId);
    return { ok: true };
  });

export const notifyNewAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ appointmentId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { notifyAppointmentCreated } = await import("@/lib/booking.server");
    await notifyAppointmentCreated(data.appointmentId);
    return { ok: true };
  });

export const runAutomationsNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { runAutomationCycle } = await import("@/lib/booking.server");
    return runAutomationCycle();
  });

export const sendTestMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({ phone: z.string().min(10), templateKey: z.string().min(3) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { dispatchWhatsApp } = await import("@/lib/whatsapp.server");
    const result = await dispatchWhatsApp({
      templateKey: data.templateKey as never,
      toPhone: data.phone,
      vars: {
        cliente: "Teste",
        barbeiro: "Teste",
        servico: "Corte",
        data: new Date().toLocaleDateString("pt-BR"),
        hora: "10:00",
        valor: "R$ 45,00",
        barbearia: "Barbearia 14 de Novembro",
        endereco: "R. Ivan Maia de Vasconcelos, 350 - Centro, Pedreira-SP",
        duracao: "40",
        telefone: data.phone,
        agenda: "10:00 - Teste (Corte)",
        total: "1",
      },
    });
    return { status: result.status, error: result.error ?? null };
  });
