import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { localDateTimeToUTC, todayISODate } from "@/lib/format";

export const APPT_SELECT =
  "id, starts_at, ends_at, status, price_cents, paid_cents, payment_status, notes, client_id, barber_id, service_id, clients(name, phone), barbers(name), services(name, duration_minutes)";

export function useAppointmentsRange(fromISODate: string, toISODate: string) {
  return useQuery({
    queryKey: ["appointments", fromISODate, toISODate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select(APPT_SELECT)
        .gte("starts_at", localDateTimeToUTC(fromISODate, "00:00").toISOString())
        .lte("starts_at", localDateTimeToUTC(toISODate, "23:59").toISOString())
        .order("starts_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useToday() {
  return todayISODate();
}

export function useServices() {
  return useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBarbers() {
  return useQuery({
    queryKey: ["barbers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("barbers").select("*").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}
