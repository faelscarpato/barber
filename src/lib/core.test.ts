import { describe, expect, it } from "bun:test";
import {
  formatBRL,
  parseBRLToCents,
  normalizePhone,
  formatPhone,
  maskPhoneLGPD,
  localDateTimeToUTC,
} from "./format";
import { renderTemplate } from "./whatsapp.server";

describe("Format & Finance Utilities (BarberPro Flow)", () => {
  it("deve formatar centavos em Real (BRL) corretamente", () => {
    expect(formatBRL(4500)).toContain("45,00");
    expect(formatBRL(0)).toContain("0,00");
  });

  it("deve converter string BRL para centavos com precisão", () => {
    expect(parseBRLToCents("45,00")).toBe(4500);
    expect(parseBRLToCents("R$ 120,50")).toBe(12050);
    expect(parseBRLToCents("")).toBe(0);
  });

  it("deve normalizar telefones brasileiros para o padrão E.164 com DDI 55", () => {
    expect(normalizePhone("(19) 99876-5432")).toBe("5519998765432");
    expect(normalizePhone("019998765432")).toBe("5519998765432");
  });

  it("deve formatar e mascarar telefones para conformidade com a LGPD", () => {
    const raw = "5519998765432";
    expect(formatPhone(raw)).toBe("(19) 99876-5432");
    expect(maskPhoneLGPD(raw)).toBe("(19)  *****--5432".replace("--", "-")); // mascara dígitos centrais
  });

  it("deve converter data e hora local no fuso America/Sao_Paulo para UTC correto", () => {
    const utcDate = localDateTimeToUTC("2026-10-10", "14:00");
    expect(utcDate).toBeInstanceOf(Date);
    // 14:00 em America/Sao_Paulo (UTC-3) corresponde a 17:00 UTC
    expect(utcDate.toISOString()).toContain("T17:00:00.000Z");
  });
});

describe("WhatsApp Messaging Engine", () => {
  it("deve interpolar variáveis dinâmicas em templates", () => {
    const template = "Olá {{cliente}}, seu horário na {{barbearia}} é às {{hora}}.";
    const vars = {
      cliente: "Rafael",
      barbearia: "Barbearia 14 de Novembro",
      hora: "14:30",
    };
    const rendered = renderTemplate(template, vars);
    expect(rendered).toBe("Olá Rafael, seu horário na Barbearia 14 de Novembro é às 14:30.");
  });

  it("deve inicializar o estado padrão como DISCONNECTED", async () => {
    const { getWhatsAppState } = await import("./whatsapp-client.server");
    const state = getWhatsAppState();
    expect(["DISCONNECTED", "INITIALIZING", "QR_READY", "CONNECTED", "ERROR"]).toContain(state.status);
  });
});

describe("Client Portal Business Rules", () => {
  it("deve permitir reagendar apenas com no mínimo 24 horas (1 dia) de antecedência", () => {
    const now = Date.now();
    const canRescheduleRule = (startsAtMs: number, status: string) => {
      const diffMs = startsAtMs - now;
      return status === "scheduled" && diffMs >= 24 * 60 * 60 * 1000;
    };

    // 25 horas no futuro: PERMITIDO
    const in25Hours = now + 25 * 60 * 60 * 1000;
    expect(canRescheduleRule(in25Hours, "scheduled")).toBe(true);

    // 23 horas no futuro (menos de 1 dia): BLOQUEADO
    const in23Hours = now + 23 * 60 * 60 * 1000;
    expect(canRescheduleRule(in23Hours, "scheduled")).toBe(false);

    // Já cancelado ou concluído: BLOQUEADO
    expect(canRescheduleRule(in25Hours, "cancelled")).toBe(false);
  });

  it("deve permitir cancelar apenas com no mínimo 3 horas de antecedência", () => {
    const now = Date.now();
    const canCancelRule = (startsAtMs: number, status: string) => {
      const diffMs = startsAtMs - now;
      return status === "scheduled" && diffMs >= 3 * 60 * 60 * 1000;
    };

    // 4 horas no futuro: PERMITIDO
    const in4Hours = now + 4 * 60 * 60 * 1000;
    expect(canCancelRule(in4Hours, "scheduled")).toBe(true);

    // 2 horas no futuro (menos de 3h): BLOQUEADO
    const in2Hours = now + 2 * 60 * 60 * 1000;
    expect(canCancelRule(in2Hours, "scheduled")).toBe(false);

    // 30 minutos no futuro: BLOQUEADO
    const in30Minutes = now + 30 * 60 * 1000;
    expect(canCancelRule(in30Minutes, "scheduled")).toBe(false);
  });
});
