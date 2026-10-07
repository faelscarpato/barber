import qrcode from "qrcode";
import pkg from "whatsapp-web.js";

const { Client, LocalAuth } = pkg;

export type WhatsAppStatus =
  | "DISCONNECTED"
  | "INITIALIZING"
  | "QR_READY"
  | "CONNECTED"
  | "ERROR";

interface WhatsAppGlobalState {
  client: InstanceType<typeof Client> | null;
  status: WhatsAppStatus;
  qrCodeBase64: string | null;
  errorMessage: string | null;
  initPromise: Promise<void> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __WA_GLOBAL_STATE__: WhatsAppGlobalState | undefined;
}

const waState: WhatsAppGlobalState = globalThis.__WA_GLOBAL_STATE__ || {
  client: null,
  status: "DISCONNECTED",
  qrCodeBase64: null,
  errorMessage: null,
  initPromise: null,
};

globalThis.__WA_GLOBAL_STATE__ = waState;

export function getWhatsAppState(): {
  status: WhatsAppStatus;
  qrCodeBase64: string | null;
  errorMessage: string | null;
} {
  return {
    status: waState.status,
    qrCodeBase64: waState.qrCodeBase64,
    errorMessage: waState.errorMessage,
  };
}

export async function initializeWhatsApp(): Promise<void> {
  if (waState.status === "INITIALIZING" || waState.status === "QR_READY") {
    return;
  }
  if (waState.status === "CONNECTED" && waState.client) {
    return;
  }

  waState.status = "INITIALIZING";
  waState.qrCodeBase64 = null;
  waState.errorMessage = null;

  try {
    if (waState.client) {
      try {
        await waState.client.destroy();
      } catch {
        // silencioso ao limpar client anterior
      }
      waState.client = null;
    }

    const client = new Client({
      authStrategy: new LocalAuth({
        dataPath: ".wwebjs_auth",
      }),
      puppeteer: {
        headless: true,
        ...(process.env.PUPPETEER_EXECUTABLE_PATH
          ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH }
          : {}),
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
          "--disable-extensions",
          "--disable-software-rasterizer",
          "--disable-features=site-per-process",
        ],
      },
    });

    waState.client = client;

    client.on("qr", async (qr) => {
      try {
        const qrDataUrl = await qrcode.toDataURL(qr, { margin: 2, width: 280 });
        waState.qrCodeBase64 = qrDataUrl;
        waState.status = "QR_READY";
        console.log("[WhatsApp-Web] QR Code gerado e pronto para leitura.");
      } catch (err) {
        console.error("[WhatsApp-Web] Erro ao converter QR Code:", err);
        waState.status = "ERROR";
        waState.errorMessage = "Falha ao gerar imagem do QR Code";
      }
    });

    client.on("ready", () => {
      waState.status = "CONNECTED";
      waState.qrCodeBase64 = null;
      waState.errorMessage = null;
      console.log("[WhatsApp-Web] Cliente conectado e autenticado com sucesso!");
    });

    client.on("authenticated", () => {
      console.log("[WhatsApp-Web] Sessão autenticada!");
    });

    client.on("auth_failure", (msg) => {
      waState.status = "ERROR";
      waState.errorMessage = `Falha de autenticação: ${msg}`;
      console.error("[WhatsApp-Web] Falha de autenticação:", msg);
    });

    client.on("disconnected", (reason) => {
      waState.status = "DISCONNECTED";
      waState.qrCodeBase64 = null;
      console.warn("[WhatsApp-Web] Cliente desconectado:", reason);
    });

    await client.initialize();
  } catch (err) {
    waState.status = "ERROR";
    const msg = err instanceof Error ? err.message : String(err);
    waState.errorMessage = msg;
    console.error("[WhatsApp-Web] Erro na inicialização:", err);
  }
}

export async function sendAutomatedMessage(
  phone: string,
  text: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (waState.status !== "CONNECTED" || !waState.client) {
      return {
        success: false,
        error: `Motor WhatsApp não está conectado (Status atual: ${waState.status})`,
      };
    }

    // Normaliza para formato E.164 numérico: 55DDDNUMERO
    let clean = phone.replace(/\D/g, "");
    if (clean.startsWith("0")) clean = clean.replace(/^0+/, "");
    if (!clean.startsWith("55")) clean = `55${clean}`;

    const chatId = `${clean}@c.us`;

    await waState.client.sendMessage(chatId, text);
    console.log(`[WhatsApp-Web] Mensagem enviada com sucesso para ${chatId}`);
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[WhatsApp-Web] Erro ao enviar mensagem para ${phone}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}
