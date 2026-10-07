import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { normalizePhone } from "@/lib/format";
import { sendAutomatedMessage } from "@/lib/whatsapp-client.server";

export type TemplateKey =
  | "client_created"
  | "barber_created"
  | "client_reminder"
  | "barber_daily"
  | "client_payment"
  | "client_cancelled"
  | "barber_reminder";

export function renderTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) => vars[key] ?? "");
}

type SendResult = { status: string; error?: string };

async function sendViaNative(phone: string, text: string): Promise<SendResult> {
  try {
    const res = await sendAutomatedMessage(phone, text);
    if (!res.success) {
      return {
        status: "failed",
        error: res.error || "Falha no envio pelo motor nativo do WhatsApp",
      };
    }
    return { status: "sent" };
  } catch (err) {
    return {
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function sendViaEvolution(phone: string, text: string): Promise<SendResult> {
  const base = process.env.EVOLUTION_API_URL;
  const key = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE;
  if (!base || !key || !instance) {
    return {
      status: "missing_credentials",
      error: "Credenciais da Evolution API não configuradas",
    };
  }
  const res = await fetch(`${base.replace(/\/$/, "")}/message/sendText/${instance}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key },
    body: JSON.stringify({ number: phone, text, textMessage: { text } }),
  });
  if (!res.ok) {
    return {
      status: "failed",
      error: `Evolution ${res.status}: ${(await res.text()).slice(0, 400)}`,
    };
  }
  return { status: "sent" };
}

async function sendViaZapi(phone: string, text: string): Promise<SendResult> {
  const base = process.env.ZAPI_BASE_URL;
  const token = process.env.ZAPI_CLIENT_TOKEN;
  if (!base) {
    return { status: "missing_credentials", error: "Credenciais da Z-API não configuradas" };
  }
  const res = await fetch(`${base.replace(/\/$/, "")}/send-text`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Client-Token": token } : {}),
    },
    body: JSON.stringify({ phone, message: text }),
  });
  if (!res.ok) {
    return { status: "failed", error: `Z-API ${res.status}: ${(await res.text()).slice(0, 400)}` };
  }
  return { status: "sent" };
}

export async function dispatchWhatsApp(params: {
  templateKey: TemplateKey;
  toPhone: string;
  vars: Record<string, string>;
  appointmentId?: string | null;
}): Promise<SendResult & { body: string }> {
  const { data: template } = await supabaseAdmin
    .from("whatsapp_templates")
    .select("body, enabled")
    .eq("key", params.templateKey)
    .maybeSingle();

  const { data: settings } = await supabaseAdmin
    .from("automation_settings")
    .select("provider")
    .limit(1)
    .maybeSingle();

  // Provider padrão: 'native' se configurado ou se não houver Evolution/Z-API
  const provider = settings?.provider ?? "native";
  const body = renderTemplate(template?.body ?? "", params.vars);
  const phone = normalizePhone(params.toPhone);

  if (!template || !template.enabled) {
    return { status: "disabled", body };
  }
  if (!phone || phone.length < 10) {
    return { status: "failed", error: "Telefone inválido", body };
  }

  let result: SendResult;
  try {
    if (provider === "native") {
      result = await sendViaNative(phone, body);
    } else if (provider === "zapi") {
      result = await sendViaZapi(phone, body);
    } else if (provider === "evolution") {
      result = await sendViaEvolution(phone, body);
    } else {
      // Fallback para native caso desconhecido
      result = await sendViaNative(phone, body);
    }
  } catch (err) {
    result = { status: "failed", error: err instanceof Error ? err.message : String(err) };
  }

  await supabaseAdmin.from("whatsapp_logs").insert({
    appointment_id: params.appointmentId ?? null,
    template_key: params.templateKey,
    to_phone: phone,
    body,
    provider,
    status: result.status,
    error: result.error ?? null,
  });

  return { ...result, body };
}
