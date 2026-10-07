import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const phoneSchema = z.object({
  phone: z.string().trim().min(8, "Telefone inválido"),
});

const cancelSchema = z.object({
  phone: z.string().trim().min(8),
  appointmentId: z.string().uuid("ID do agendamento inválido"),
  reason: z.string().optional(),
});

const rescheduleSchema = z.object({
  phone: z.string().trim().min(8),
  appointmentId: z.string().uuid("ID do agendamento inválido"),
  newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de data inválido (YYYY-MM-DD)"),
  newTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora inválido (HH:mm)"),
});

const availSchema = z.object({
  barberId: z.string().uuid(),
  serviceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const getClientPortal = createServerFn({ method: "POST" })
  .validator((data: unknown) => phoneSchema.parse(data))
  .handler(async ({ data }) => {
    const { getClientPortalData } = await import("@/lib/client-portal.server");
    return getClientPortalData(data.phone);
  });

export const cancelClientAppointmentFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => cancelSchema.parse(data))
  .handler(async ({ data }) => {
    const { cancelClientAppointment } = await import("@/lib/client-portal.server");
    return cancelClientAppointment({
      rawPhone: data.phone,
      appointmentId: data.appointmentId,
      reason: data.reason,
    });
  });

export const rescheduleClientAppointmentFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => rescheduleSchema.parse(data))
  .handler(async ({ data }) => {
    const { rescheduleClientAppointment } = await import("@/lib/client-portal.server");
    return rescheduleClientAppointment({
      rawPhone: data.phone,
      appointmentId: data.appointmentId,
      newDate: data.newDate,
      newTime: data.newTime,
    });
  });

export const getClientRescheduleAvailability = createServerFn({ method: "POST" })
  .validator((data: unknown) => availSchema.parse(data))
  .handler(async ({ data }) => {
    const { computeAvailability } = await import("@/lib/booking.server");
    return computeAvailability(data);
  });
