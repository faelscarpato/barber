import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const availabilitySchema = z.object({
  barberId: z.string().uuid(),
  serviceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const createSchema = z.object({
  barberId: z.string().uuid(),
  serviceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  clientName: z.string().trim().min(2).max(80),
  clientPhone: z.string().trim().min(10).max(20),
  notes: z.string().trim().max(400).default(""),
});

export const getBookingContext = createServerFn({ method: "GET" }).handler(async () => {
  const { loadBookingContext } = await import("@/lib/booking.server");
  return loadBookingContext();
});

export const getAvailability = createServerFn({ method: "POST" })
  .validator((data: unknown) => availabilitySchema.parse(data))
  .handler(async ({ data }) => {
    const { computeAvailability } = await import("@/lib/booking.server");
    return computeAvailability(data);
  });

export const createBooking = createServerFn({ method: "POST" })
  .validator((data: unknown) => createSchema.parse(data))
  .handler(async ({ data }) => {
    const { createAppointment } = await import("@/lib/booking.server");
    return createAppointment(data);
  });

export const getBookingSummary = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: appt } = await supabaseAdmin
      .from("appointments")
      .select(
        "id, starts_at, price_cents, status, notes, clients(name, phone), barbers(name), services(name, duration_minutes)",
      )
      .eq("id", data.id)
      .maybeSingle();
    const { data: business } = await supabaseAdmin
      .from("business_settings")
      .select("name, address_line, city, whatsapp_phone, maps_url, cancellation_policy")
      .limit(1)
      .maybeSingle();
    return { appointment: appt, business };
  });
