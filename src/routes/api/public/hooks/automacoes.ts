import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/automacoes")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey =
          request.headers.get("apikey") ||
          request.headers.get("authorization")?.replace("Bearer ", "");
        const expected = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!expected || apiKey !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        const { runAutomationCycle } = await import("@/lib/booking.server");
        const result = await runAutomationCycle();
        return Response.json({ ok: true, ...result });
      },
    },
  },
});
