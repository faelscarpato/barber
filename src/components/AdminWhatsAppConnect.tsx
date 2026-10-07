import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, Loader2, QrCode, AlertCircle, Smartphone, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type WAStatusResponse = {
  status: "DISCONNECTED" | "INITIALIZING" | "QR_READY" | "CONNECTED" | "ERROR";
  qrCodeBase64: string | null;
  errorMessage: string | null;
};

export function AdminWhatsAppConnect() {
  const [data, setData] = useState<WAStatusResponse>({
    status: "DISCONNECTED",
    qrCodeBase64: null,
    errorMessage: null,
  });
  const [loadingAction, setLoadingAction] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/status");
      if (!res.ok) return;
      const json: WAStatusResponse = await res.json();
      setData(json);
    } catch {
      // Ignora erro de rede momentâneo no polling
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Intervalo de polling: mais frequente durante handshaking do QR, mais suave quando conectado
    const intervalMs = data.status === "INITIALIZING" || data.status === "QR_READY" ? 3000 : 6000;
    const timer = setInterval(fetchStatus, intervalMs);
    return () => clearInterval(timer);
  }, [fetchStatus, data.status]);

  const handleStartConnection = async () => {
    setLoadingAction(true);
    try {
      const res = await fetch("/api/whatsapp/status", { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        setData({
          status: json.status,
          qrCodeBase64: json.qrCodeBase64,
          errorMessage: json.errorMessage,
        });
      }
    } catch (err) {
      setData((prev) => ({
        ...prev,
        status: "ERROR",
        errorMessage: err instanceof Error ? err.message : "Falha na comunicação com o servidor",
      }));
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Conexão Nativa WhatsApp</h3>
        </div>
        <div>
          {data.status === "CONNECTED" && (
            <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 px-3 py-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Conectado
            </Badge>
          )}
          {data.status === "INITIALIZING" && (
            <Badge variant="secondary" className="gap-1 px-3 py-1 animate-pulse">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Inicializando
            </Badge>
          )}
          {data.status === "QR_READY" && (
            <Badge variant="outline" className="border-amber-500 text-amber-500 gap-1 px-3 py-1">
              <QrCode className="h-3.5 w-3.5" /> Aguardando Leitura
            </Badge>
          )}
          {data.status === "DISCONNECTED" && (
            <Badge variant="secondary" className="gap-1 px-3 py-1">
              Desconectado
            </Badge>
          )}
          {data.status === "ERROR" && (
            <Badge variant="destructive" className="gap-1 px-3 py-1">
              <AlertCircle className="h-3.5 w-3.5" /> Erro
            </Badge>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Envie confirmações de agendamento e lembretes diretamente pelo seu WhatsApp, sem custos com provedores externos.
      </p>

      {/* Estado: CONECTADO */}
      {data.status === "CONNECTED" && (
        <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4 space-y-2">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-medium">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span>Sessão ativa e sincronizada</span>
          </div>
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            O WhatsApp está pronto para enviar mensagens transacionais automáticas.
          </p>
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartConnection}
              disabled={loadingAction}
              className="text-xs gap-1.5"
            >
              <RefreshCw className={`h-3 w-3 ${loadingAction ? "animate-spin" : ""}`} />
              Reconectar Sessão
            </Button>
          </div>
        </div>
      )}

      {/* Estado: INICIALIZANDO */}
      {data.status === "INITIALIZING" && (
        <div className="flex flex-col items-center justify-center p-6 space-y-3 bg-muted/40 rounded-md border border-dashed border-border">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm font-medium text-foreground">Iniciando motor do WhatsApp...</p>
          <p className="text-xs text-muted-foreground text-center max-w-sm">
            Preparando navegador headless seguro em segundo plano. O QR Code será gerado em instantes.
          </p>
        </div>
      )}

      {/* Estado: QR CODE PRONTO */}
      {data.status === "QR_READY" && data.qrCodeBase64 && (
        <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-muted/30 rounded-md border border-border">
          <div className="p-2 bg-white rounded-lg shadow-sm border border-border/40">
            <img
              src={data.qrCodeBase64}
              alt="QR Code de conexão do WhatsApp"
              className="w-56 h-56 object-contain"
            />
          </div>
          <div className="space-y-3 text-sm flex-1">
            <h4 className="font-semibold text-foreground text-base">Escaneie o QR Code:</h4>
            <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground text-xs md:text-sm">
              <li>Abra o WhatsApp no seu celular</li>
              <li>Acesse o menu (três pontos) ou <strong>Configurações</strong></li>
              <li>Selecione <strong>Aparelhos conectados</strong> e toque em <strong>Conectar um aparelho</strong></li>
              <li>Aponte a câmera para o código ao lado</li>
            </ol>
            <p className="text-xs text-muted-foreground pt-1">
              O status será atualizado automaticamente assim que o WhatsApp confirmar o pareamento.
            </p>
          </div>
        </div>
      )}

      {/* Estado: DESCONECTADO ou ERRO */}
      {(data.status === "DISCONNECTED" || data.status === "ERROR") && (
        <div className="space-y-3">
          {data.status === "ERROR" && data.errorMessage && (
            <div className="flex items-start gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Falha na sessão:</p>
                <p className="text-xs">{data.errorMessage}</p>
              </div>
            </div>
          )}
          <Button
            onClick={handleStartConnection}
            disabled={loadingAction}
            className="w-full sm:w-auto h-11 gap-2"
          >
            {loadingAction ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Iniciando...
              </>
            ) : (
              <>
                <QrCode className="h-4 w-4" />
                Conectar WhatsApp
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
