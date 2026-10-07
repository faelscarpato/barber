import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  CalendarDays,
  Clock,
  Scissors,
  User,
  AlertCircle,
  CheckCircle2,
  Phone,
  RefreshCw,
  XCircle,
  Calendar,
  MessageCircle,
  LogOut,
  ChevronRight,
  Loader2,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getClientPortal,
  cancelClientAppointmentFn,
  rescheduleClientAppointmentFn,
  getClientRescheduleAvailability,
} from "@/lib/client-portal.functions";
import type { ClientPortalData, ClientAppointmentItem } from "@/lib/client-portal.server";
import { formatPhone, todayISODate } from "@/lib/format";

export const Route = createFileRoute("/meus-agendamentos")({
  head: () => ({
    meta: [
      { title: "Meus Agendamentos — Barbearia 14 de Novembro" },
      {
        name: "description",
        content: "Gerencie seus horários, reagende ou cancele atendimentos na Barbearia 14 de Novembro.",
      },
    ],
  }),
  component: MeusAgendamentosPage,
});

const STORAGE_KEY = "barberpro_client_phone";

function MeusAgendamentosPage() {
  const [phoneInput, setPhoneInput] = useState("");
  const [activePhone, setActivePhone] = useState<string | null>(null);
  const [portalData, setPortalData] = useState<ClientPortalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialChecked, setInitialChecked] = useState(false);

  // Estados de Cancelamento
  const [cancelTarget, setCancelTarget] = useState<ClientAppointmentItem | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Estados de Reagendamento
  const [rescheduleTarget, setRescheduleTarget] = useState<ClientAppointmentItem | null>(null);
  const [newDate, setNewDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  // Modal Informativo de Bloqueio (menos de 24h ou menos de 3h)
  const [infoModal, setInfoModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    whatsappPhone: string;
  }>({
    open: false,
    title: "",
    message: "",
    whatsappPhone: "",
  });

  // Carrega telefone salvo no localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setActivePhone(saved);
      loadData(saved);
    }
    setInitialChecked(true);
  }, []);

  const loadData = async (phone: string) => {
    setLoading(true);
    try {
      const data = await getClientPortal({ data: { phone } });
      setPortalData(data);
      if (data.found && data.client) {
        localStorage.setItem(STORAGE_KEY, data.client.phone);
        setActivePhone(data.client.phone);
      } else {
        toast.error("Nenhum cliente ou agendamento encontrado para este número.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar agendamentos.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput.trim() || phoneInput.replace(/\D/g, "").length < 10) {
      toast.error("Por favor, digite um número de WhatsApp válido com DDD.");
      return;
    }
    loadData(phoneInput);
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setActivePhone(null);
    setPortalData(null);
    setPhoneInput("");
  };

  // Executa cancelamento
  const handleConfirmCancel = async () => {
    if (!cancelTarget || !activePhone) return;
    setCancelling(true);
    try {
      const res = await cancelClientAppointmentFn({
        data: {
          phone: activePhone,
          appointmentId: cancelTarget.id,
        },
      });
      toast.success(res.message);
      setCancelTarget(null);
      await loadData(activePhone);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao cancelar.");
    } finally {
      setCancelling(false);
    }
  };

  // Abrir Reagendamento
  const handleOpenReschedule = (item: ClientAppointmentItem) => {
    setRescheduleTarget(item);
    setNewDate(todayISODate());
    setSelectedSlot(null);
    fetchSlots(item.barberId, item.serviceId, todayISODate());
  };

  const fetchSlots = async (barberId: string, serviceId: string, date: string) => {
    setLoadingSlots(true);
    try {
      const res = await getClientRescheduleAvailability({
        data: { barberId, serviceId, date },
      });
      if (res.closed) {
        setAvailableSlots([]);
        toast.info(res.reason || "Barbearia fechada nesta data.");
      } else {
        setAvailableSlots(res.slots);
      }
    } catch (err) {
      toast.error("Erro ao carregar horários disponíveis.");
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleTarget || !activePhone || !newDate || !selectedSlot) return;
    setRescheduling(true);
    try {
      const res = await rescheduleClientAppointmentFn({
        data: {
          phone: activePhone,
          appointmentId: rescheduleTarget.id,
          newDate,
          newTime: selectedSlot,
        },
      });
      toast.success(res.message);
      setRescheduleTarget(null);
      await loadData(activePhone);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao reagendar.");
    } finally {
      setRescheduling(false);
    }
  };

  if (!initialChecked) {
    return (
      <div className="surface-grain min-h-screen flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // TELA 1: Formulário de acesso por telefone
  if (!portalData || !portalData.found) {
    return (
      <div className="surface-grain min-h-screen flex flex-col justify-between p-4 md:p-8">
        <header className="mx-auto w-full max-w-lg flex items-center justify-between pb-6">
          <Link to="/" className="font-display text-xl leading-none tracking-wider">
            14 <span className="text-primary">de Novembro</span>
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link to="/agendar">Agendar Novo</Link>
          </Button>
        </header>

        <main className="mx-auto w-full max-w-md my-auto">
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-xl space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CalendarDays className="h-7 w-7" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Meus Agendamentos
              </h1>
              <p className="text-sm text-muted-foreground">
                Acesse seus horários marcados, histórico do mês e faça alterações sem precisar de senha.
              </p>
            </div>

            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Seu Telefone / WhatsApp</Label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    className="h-12 pl-11 text-base tracking-wide"
                    placeholder="(19) 99999-9999"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(formatPhone(e.target.value))}
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Informe o mesmo número utilizado ao realizar seu agendamento.
                </p>
              </div>

              <Button type="submit" className="w-full h-12 text-base font-medium" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Buscando horários...
                  </>
                ) : (
                  <>Acessar Meus Horários</>
                )}
              </Button>
            </form>

            <div className="pt-2 text-center">
              <Link to="/agendar" className="text-xs text-primary hover:underline">
                Ainda não tem agendamento? Marque seu horário aqui ➔
              </Link>
            </div>
          </div>
        </main>

        <footer className="mx-auto w-full max-w-lg text-center pt-6 text-xs text-muted-foreground">
          Barbearia 14 de Novembro • Atendimento com Hora Marcada
        </footer>
      </div>
    );
  }

  // TELA 2: Painel do Cliente autenticado
  const { client, business, upcoming, monthAppointments, monthSummary } = portalData;
  const whatsappUrl = `https://wa.me/${business.whatsappPhone}`;

  return (
    <div className="surface-grain min-h-screen pb-12">
      {/* Top Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link to="/" className="font-display text-lg md:text-xl leading-none tracking-wider">
            14 <span className="text-primary">de Novembro</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="h-9 gap-1.5">
              <Link to="/agendar">
                <Scissors className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Novo Agendamento</span>
                <span className="sm:hidden">Agendar</span>
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-xs h-9 text-muted-foreground hover:text-foreground gap-1"
            >
              <LogOut className="h-3.5 w-3.5" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pt-6 space-y-6">
        {/* Banner de Boas-vindas */}
        <div className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <h1 className="text-xl md:text-2xl font-bold text-foreground">
                Olá, {client?.name}
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Conectado pelo WhatsApp <strong>{client?.phoneFormatted}</strong>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => activePhone && loadData(activePhone)}
              disabled={loading}
              className="h-9 gap-1.5 text-xs"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Atualizar
            </Button>
          </div>
        </div>

        {/* Abas: Próximos Atendimentos vs Atendimentos do Mês */}
        <Tabs defaultValue="proximos" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-muted/60 rounded-xl">
            <TabsTrigger value="proximos" className="rounded-lg text-sm font-medium">
              Próximos Horários ({upcoming.length})
            </TabsTrigger>
            <TabsTrigger value="mes" className="rounded-lg text-sm font-medium">
              Atendimentos do Mês ({monthAppointments.length})
            </TabsTrigger>
          </TabsList>

          {/* ABA 1: Próximos Agendamentos */}
          <TabsContent value="proximos" className="space-y-4">
            {upcoming.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <CalendarDays className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-foreground">Nenhum horário marcado</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Você não possui nenhum atendimento futuro agendado no momento.
                  </p>
                </div>
                <Button asChild className="h-11 px-6">
                  <Link to="/agendar">Agendar Agora</Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {upcoming.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-sm space-y-4 transition-all hover:border-border/80"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-foreground">{item.serviceName}</h3>
                          <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                            Confirmado
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                          <User className="h-4 w-4 text-primary" /> Barbeiro: <strong>{item.barberName}</strong>
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="text-xl font-extrabold text-foreground">{item.priceFormatted}</span>
                        <p className="text-xs text-muted-foreground">{item.serviceDuration} minutos</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-muted/40 text-sm">
                      <div className="space-y-0.5">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-primary" /> Data
                        </span>
                        <span className="font-semibold text-foreground">{item.dateBR}</span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-primary" /> Horário
                        </span>
                        <span className="font-semibold text-foreground">{item.timeBR}</span>
                      </div>
                      <div className="col-span-2 sm:col-span-1 space-y-0.5">
                        <span className="text-xs text-muted-foreground">Falta aproximadamente</span>
                        <span className="font-medium text-foreground text-xs block">
                          {item.hoursUntil > 24
                            ? `${Math.floor(item.hoursUntil / 24)} dia(s)`
                            : `${item.hoursUntil} hora(s)`}
                        </span>
                      </div>
                    </div>

                    {/* Ações: Reagendar e Cancelar com Regras Estritas */}
                    <div className="pt-2 flex flex-wrap items-center justify-end gap-2.5 border-t border-border/60">
                      {/* Botão Reagendar */}
                      {item.canReschedule ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10 text-xs font-medium gap-1.5"
                          onClick={() => handleOpenReschedule(item)}
                        >
                          <RefreshCw className="h-3.5 w-3.5" /> Reagendar
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10 text-xs text-muted-foreground border-dashed gap-1.5"
                          onClick={() =>
                            setInfoModal({
                              open: true,
                              title: "Reagendamento Bloqueado",
                              message:
                                "O reagendamento online só é permitido com pelo menos 24 horas de antecedência. Para alterações de última hora, por favor entre em contato direto pelo WhatsApp da barbearia.",
                              whatsappPhone: business.whatsappPhone,
                            })
                          }
                        >
                          <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                          Reagendar (<span className="text-amber-500 font-semibold">&lt; 24h</span>)
                        </Button>
                      )}

                      {/* Botão Cancelar */}
                      {item.canCancel ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-10 text-xs font-medium gap-1.5"
                          onClick={() => setCancelTarget(item)}
                        >
                          <XCircle className="h-3.5 w-3.5" /> Cancelar Horário
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10 text-xs text-muted-foreground border-dashed gap-1.5"
                          onClick={() =>
                            setInfoModal({
                              open: true,
                              title: "Cancelamento Bloqueado",
                              message:
                                "Cancelamentos online só são permitidos com no mínimo 3 horas de antecedência. Por favor, avise o barbeiro diretamente pelo WhatsApp.",
                              whatsappPhone: business.whatsappPhone,
                            })
                          }
                        >
                          <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                          Cancelar (<span className="text-red-500 font-semibold">&lt; 3h</span>)
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ABA 2: Atendimentos do Mês */}
          <TabsContent value="mes" className="space-y-4">
            {/* Card de Resumo Financeiro e Quantidade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Atendimentos em {monthSummary.monthName}
                </span>
                <div className="flex items-center gap-2 text-2xl md:text-3xl font-extrabold text-foreground">
                  <Scissors className="h-6 w-6 text-primary" />
                  {monthSummary.totalAppointments} atendimento(s)
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Total Investido no Mês
                </span>
                <div className="flex items-center gap-2 text-2xl md:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="h-6 w-6" />
                  {monthSummary.totalSpentFormatted}
                </div>
              </div>
            </div>

            {monthAppointments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
                Nenhum atendimento registrado neste mês até o momento.
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="divide-y divide-border">
                  {monthAppointments.map((item) => (
                    <div key={item.id} className="p-4 sm:p-5 flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground text-sm md:text-base">
                            {item.serviceName}
                          </span>
                          {item.status === "completed" && (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-500 text-xs">
                              Concluído
                            </Badge>
                          )}
                          {item.status === "scheduled" && (
                            <Badge variant="default" className="bg-primary text-xs">
                              Agendado
                            </Badge>
                          )}
                          {item.status === "cancelled" && (
                            <Badge variant="secondary" className="text-muted-foreground text-xs line-through">
                              Cancelado
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {item.dateBR} às {item.timeBR} • Barbeiro: {item.barberName}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`font-bold text-sm md:text-base ${
                            item.status === "cancelled"
                              ? "text-muted-foreground line-through"
                              : "text-foreground"
                          }`}
                        >
                          {item.priceFormatted}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* DIALOG DE CONFIRMAÇÃO DE CANCELAMENTO */}
      <AlertDialog open={Boolean(cancelTarget)} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja cancelar seu horário?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Você está prestes a cancelar o serviço <strong>{cancelTarget?.serviceName}</strong> marcado para{" "}
                <strong>
                  {cancelTarget?.dateBR} às {cancelTarget?.timeBR}
                </strong>{" "}
                com o barbeiro <strong>{cancelTarget?.barberName}</strong>.
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                O horário será liberado no sistema e uma confirmação será enviada para o seu WhatsApp.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={cancelling}
              className="bg-destructive hover:bg-destructive/90"
            >
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sim, Cancelar Horário"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MODAL DE REAGENDAMENTO */}
      <Dialog open={Boolean(rescheduleTarget)} onOpenChange={(open) => !open && setRescheduleTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reagendar Horário</DialogTitle>
            <DialogDescription>
              Escolha uma nova data e selecione um horário livre com o barbeiro{" "}
              <strong>{rescheduleTarget?.barberName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="reschedule-date">Nova Data</Label>
              <Input
                id="reschedule-date"
                type="date"
                min={todayISODate()}
                value={newDate}
                onChange={(e) => {
                  setNewDate(e.target.value);
                  setSelectedSlot(null);
                  if (rescheduleTarget && e.target.value) {
                    fetchSlots(rescheduleTarget.barberId, rescheduleTarget.serviceId, e.target.value);
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Horários Disponíveis</Label>
              {loadingSlots ? (
                <div className="p-6 text-center text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Buscando vagas livres...
                </div>
              ) : availableSlots.length === 0 ? (
                <p className="p-4 text-center text-xs text-muted-foreground bg-muted/40 rounded-lg">
                  Nenhum horário disponível para a data selecionada. Tente outro dia.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                  {availableSlots.map((slot) => (
                    <Button
                      key={slot}
                      type="button"
                      variant={selectedSlot === slot ? "default" : "outline"}
                      size="sm"
                      className="text-xs h-9"
                      onClick={() => setSelectedSlot(slot)}
                    >
                      {slot}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setRescheduleTarget(null)} disabled={rescheduling}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmReschedule}
              disabled={!selectedSlot || rescheduling}
              className="gap-1.5"
            >
              {rescheduling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : (
                <>Confirmar Reagendamento</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL INFORMATIVO DE BLOQUEIO (<24h ou <3h) COM BOTÃO WHATSAPP */}
      <Dialog
        open={infoModal.open}
        onOpenChange={(open) => setInfoModal((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-md text-center">
          <DialogHeader className="space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
              <AlertCircle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center">{infoModal.title}</DialogTitle>
            <DialogDescription className="text-center text-sm pt-1">
              {infoModal.message}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="sm:justify-center pt-3 gap-2">
            <Button variant="outline" onClick={() => setInfoModal((prev) => ({ ...prev, open: false }))}>
              Entendi
            </Button>
            {infoModal.whatsappPhone && (
              <Button asChild className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                <a
                  href={`https://wa.me/${infoModal.whatsappPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-4 w-4" /> Falar no WhatsApp
                </a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
