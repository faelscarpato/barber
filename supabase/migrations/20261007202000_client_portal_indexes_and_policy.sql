-- Migração para suporte e otimização do Portal do Cliente (Sessão por Telefone)
-- Pode ser executada no SQL Editor do painel do Supabase

-- 1. Cria índice composto para acelerar a busca dos agendamentos do cliente ordenados por data
CREATE INDEX IF NOT EXISTS idx_appointments_client_starts_desc 
ON public.appointments (client_id, starts_at DESC);

-- 2. Atualiza a política de cancelamento e reagendamento padrão da barbearia
UPDATE public.business_settings 
SET cancellation_policy = 'Reagendamento online permitido com até 24 horas de antecedência. Cancelamento online permitido com até 3 horas de antecedência.'
WHERE cancellation_policy IS NULL OR cancellation_policy = '' OR cancellation_policy LIKE '%Cancelamento%';

-- 3. Documentação das regras no schema
COMMENT ON COLUMN public.appointments.status IS 'Status do agendamento: scheduled (ativo), completed (atendido), cancelled (cancelado pelo cliente ou barbeiro), no_show (não compareceu)';
