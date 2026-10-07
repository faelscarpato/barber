import { createFileRoute } from "@tanstack/react-router";
import { getWhatsAppState, initializeWhatsApp } from "@/lib/whatsapp-client.server";

export const Route = createFileRoute("/api/whatsapp/status")({
  server: {
    handlers: {
      GET: async () => {
        const state = getWhatsAppState();
        return Response.json({
          status: state.status,
          qrCodeBase64: state.qrCodeBase64,
          errorMessage: state.errorMessage,
        });
      },
      POST: async () => {
        const state = getWhatsAppState();
        if (state.status === "DISCONNECTED" || state.status === "ERROR") {
          // Inicializa assincronamente em segundo plano
          initializeWhatsApp().catch((err) => {
            console.error("[WhatsApp Server] Erro ao iniciar pelo POST:", err);
          });
        }
        const updated = getWhatsAppState();
        return Response.json({
          ok: true,
          status: updated.status,
          qrCodeBase64: updated.qrCodeBase64,
          errorMessage: updated.errorMessage,
        });
      },
    },
  },
});
