
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

alter table public.automation_settings
  add column if not exists reminder_barber_enabled boolean not null default true;

alter table public.appointments
  add column if not exists barber_reminder_sent_at timestamptz;

update public.automation_settings set reminder_lead_minutes = 60;

insert into public.whatsapp_templates (key, title, body, enabled)
values (
  'barber_reminder',
  'Lembrete para a barbearia (1h antes)',
  E'⏰ Lembrete: em 1 hora tem atendimento na {{barbearia}}.\n\nCliente: {{cliente}}\nTelefone: {{telefone}}\nServiço: {{servico}} ({{duracao}} min)\nData: {{data}} às {{hora}}\nBarbeiro: {{barbeiro}}\nValor: {{valor}}',
  true
)
on conflict (key) do nothing;

update public.whatsapp_templates
set body = E'⏰ Olá {{cliente}}! Falta 1 hora para o seu atendimento na {{barbearia}}.\n\nServiço: {{servico}}\nBarbeiro: {{barbeiro}}\nData: {{data}} às {{hora}}\nEndereço: {{endereco}}\n\nAté já! 💈'
where key = 'client_reminder';
