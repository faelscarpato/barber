export const TZ = "America/Sao_Paulo";

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function parseBRLToCents(value: string): number {
  const clean = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(clean);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Normaliza telefone brasileiro para o formato E.164 sem "+": 55DDDNUMERO */
export function normalizePhone(value: string): string {
  let d = onlyDigits(value);
  if (d.startsWith("0")) d = d.replace(/^0+/, "");
  if (!d.startsWith("55")) d = `55${d}`;
  return d;
}

export function formatPhone(value: string): string {
  const d = onlyDigits(value).replace(/^55/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return value;
}

export function maskPhoneLGPD(value: string): string {
  const formatted = formatPhone(value);
  if (formatted.length >= 14) {
    return `${formatted.slice(0, 5)} *****-${formatted.slice(-4)}`;
  }
  return formatted;
}

export function formatDateTimeBR(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTimeBR(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateBR(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: TZ });
}

export function formatLongDateBR(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    timeZone: TZ,
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

/** Data "YYYY-MM-DD" no fuso da barbearia */
export function todayISODate(base: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(base);
}

export function addDaysISO(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function weekdayOfISODate(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Pedreira-SP: UTC-3 o ano todo (sem horário de verão desde 2019). */
export const SP_OFFSET = "-03:00";

export function localDateTimeToUTC(isoDate: string, time: string): Date {
  return new Date(`${isoDate}T${time.slice(0, 5)}:00${SP_OFFSET}`);
}

export const STATUS_LABELS: Record<string, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Faltou",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  partial: "Parcial",
  paid: "Pago",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: "Pix",
  cash: "Dinheiro",
  card: "Cartão",
};

export const WEEKDAY_LABELS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];
