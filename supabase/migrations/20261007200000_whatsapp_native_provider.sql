-- Migração para suporte e ativação padrão do motor nativo do WhatsApp via QR Code
-- Pode ser executada diretamente no SQL Editor do painel do Supabase

-- 1. Altera o default da coluna provider em automation_settings para 'native'
ALTER TABLE public.automation_settings 
  ALTER COLUMN provider SET DEFAULT 'native';

-- 2. Atualiza a configuração existente para usar o motor nativo
UPDATE public.automation_settings 
SET provider = 'native'
WHERE provider = 'evolution' OR provider IS NULL;

-- 3. Altera o default em whatsapp_logs para 'native'
ALTER TABLE public.whatsapp_logs 
  ALTER COLUMN provider SET DEFAULT 'native';

-- Mensagem informativa
COMMENT ON COLUMN public.automation_settings.provider IS 'Provedor de disparo: native (whatsapp-web.js), evolution ou zapi';
