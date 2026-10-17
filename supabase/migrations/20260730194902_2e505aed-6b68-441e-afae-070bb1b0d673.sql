
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE public.app_role AS ENUM ('admin','barber');
CREATE TYPE public.appointment_status AS ENUM ('scheduled','confirmed','completed','cancelled','no_show');
CREATE TYPE public.payment_status AS ENUM ('pending','partial','paid');
CREATE TYPE public.payment_method AS ENUM ('pix','cash','card');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id);
$$;

-- new user -> profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN (SELECT count(*) FROM public.user_roles) = 0 THEN 'admin'::public.app_role ELSE 'barber'::public.app_role END)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- BUSINESS SETTINGS
CREATE TABLE public.business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tagline TEXT NOT NULL DEFAULT '',
  address_line TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  whatsapp_phone TEXT NOT NULL DEFAULT '',
  instagram_url TEXT,
  maps_url TEXT,
  review_url TEXT,
  logo_url TEXT,
  opening_hours_text TEXT NOT NULL DEFAULT '',
  cancellation_policy TEXT NOT NULL DEFAULT '',
  min_lead_minutes INT NOT NULL DEFAULT 60,
  max_advance_days INT NOT NULL DEFAULT 45,
  slot_step_minutes INT NOT NULL DEFAULT 15,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.business_settings TO anon;
GRANT SELECT, UPDATE ON public.business_settings TO authenticated;
GRANT ALL ON public.business_settings TO service_role;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read business" ON public.business_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "staff update business" ON public.business_settings FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_business_updated BEFORE UPDATE ON public.business_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- BARBERS
CREATE TABLE public.barbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT,
  photo_url TEXT,
  bio TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.barbers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.barbers TO authenticated;
GRANT ALL ON public.barbers TO service_role;
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read barbers" ON public.barbers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "staff write barbers" ON public.barbers FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_barbers_updated BEFORE UPDATE ON public.barbers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SERVICES
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  duration_minutes INT NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 600),
  price_cents INT NOT NULL CHECK (price_cents >= 0),
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read services" ON public.services FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "staff write services" ON public.services FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_services_updated BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- BARBER SERVICES
CREATE TABLE public.barber_services (
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  PRIMARY KEY (barber_id, service_id)
);
GRANT SELECT ON public.barber_services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.barber_services TO authenticated;
GRANT ALL ON public.barber_services TO service_role;
ALTER TABLE public.barber_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read barber_services" ON public.barber_services FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "staff write barber_services" ON public.barber_services FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- WORKING HOURS
CREATE TABLE public.working_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_start TIME,
  break_end TIME,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time),
  UNIQUE (barber_id, weekday)
);
GRANT SELECT ON public.working_hours TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.working_hours TO authenticated;
GRANT ALL ON public.working_hours TO service_role;
ALTER TABLE public.working_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read working_hours" ON public.working_hours FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "staff write working_hours" ON public.working_hours FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_wh_updated BEFORE UPDATE ON public.working_hours FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- BLOCKED DATES
CREATE TABLE public.blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID REFERENCES public.barbers(id) ON DELETE CASCADE,
  block_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_blocked_dates_date ON public.blocked_dates (block_date);
GRANT SELECT ON public.blocked_dates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocked_dates TO authenticated;
GRANT ALL ON public.blocked_dates TO service_role;
ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read blocked_dates" ON public.blocked_dates FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "staff write blocked_dates" ON public.blocked_dates FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- CLIENTS
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_clients_name ON public.clients (lower(name));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read clients" ON public.clients FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff write clients" ON public.clients FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- APPOINTMENTS
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE RESTRICT,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status public.appointment_status NOT NULL DEFAULT 'scheduled',
  price_cents INT NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  paid_cents INT NOT NULL DEFAULT 0 CHECK (paid_cents >= 0),
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  notes TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'online',
  reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
CREATE INDEX idx_appt_starts ON public.appointments (starts_at);
CREATE INDEX idx_appt_barber_starts ON public.appointments (barber_id, starts_at);
CREATE INDEX idx_appt_client ON public.appointments (client_id);
CREATE INDEX idx_appt_status ON public.appointments (status);
ALTER TABLE public.appointments ADD CONSTRAINT no_overlap_per_barber
  EXCLUDE USING gist (
    barber_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (status <> 'cancelled');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read appointments" ON public.appointments FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff write appointments" ON public.appointments FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_appt_updated BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- STATUS HISTORY
CREATE TABLE public.appointment_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  from_status public.appointment_status,
  to_status public.appointment_status NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ash_appt ON public.appointment_status_history (appointment_id);
GRANT SELECT, INSERT ON public.appointment_status_history TO authenticated;
GRANT ALL ON public.appointment_status_history TO service_role;
ALTER TABLE public.appointment_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read history" ON public.appointment_status_history FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff insert history" ON public.appointment_status_history FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.track_appointment_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.appointment_status_history (appointment_id, from_status, to_status, changed_by)
    VALUES (NEW.id, NULL, NEW.status, auth.uid());
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.appointment_status_history (appointment_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_appt_status AFTER INSERT OR UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.track_appointment_status();

-- PAYMENTS
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  amount_cents INT NOT NULL CHECK (amount_cents > 0),
  method public.payment_method NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_appt ON public.payments (appointment_id);
CREATE INDEX idx_payments_paid_at ON public.payments (paid_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read payments" ON public.payments FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff write payments" ON public.payments FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.sync_appointment_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _appt UUID; _total INT; _price INT;
BEGIN
  _appt := COALESCE(NEW.appointment_id, OLD.appointment_id);
  SELECT COALESCE(SUM(amount_cents),0) INTO _total FROM public.payments WHERE appointment_id = _appt;
  SELECT price_cents INTO _price FROM public.appointments WHERE id = _appt;
  UPDATE public.appointments SET
    paid_cents = _total,
    payment_status = CASE WHEN _total <= 0 THEN 'pending'::public.payment_status
                          WHEN _total >= _price THEN 'paid'::public.payment_status
                          ELSE 'partial'::public.payment_status END
  WHERE id = _appt;
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_payments_sync AFTER INSERT OR UPDATE OR DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.sync_appointment_payment();

-- AUTOMATION SETTINGS
CREATE TABLE public.automation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'evolution',
  barber_notify_phone TEXT NOT NULL DEFAULT '',
  notify_client_on_create BOOLEAN NOT NULL DEFAULT true,
  notify_barber_on_create BOOLEAN NOT NULL DEFAULT true,
  reminder_client_enabled BOOLEAN NOT NULL DEFAULT true,
  reminder_barber_daily_enabled BOOLEAN NOT NULL DEFAULT true,
  reminder_lead_minutes INT NOT NULL DEFAULT 120 CHECK (reminder_lead_minutes BETWEEN 5 AND 1440),
  daily_agenda_hour SMALLINT NOT NULL DEFAULT 8 CHECK (daily_agenda_hour BETWEEN 0 AND 23),
  notify_on_payment BOOLEAN NOT NULL DEFAULT false,
  notify_on_cancel BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.automation_settings TO authenticated;
GRANT ALL ON public.automation_settings TO service_role;
ALTER TABLE public.automation_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read automation" ON public.automation_settings FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff update automation" ON public.automation_settings FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_automation_updated BEFORE UPDATE ON public.automation_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- TEMPLATES
CREATE TABLE public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.whatsapp_templates TO authenticated;
GRANT ALL ON public.whatsapp_templates TO service_role;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read templates" ON public.whatsapp_templates FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff update templates" ON public.whatsapp_templates FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_templates_updated BEFORE UPDATE ON public.whatsapp_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- LOGS
CREATE TABLE public.whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  template_key TEXT NOT NULL,
  to_phone TEXT NOT NULL,
  body TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'evolution',
  status TEXT NOT NULL DEFAULT 'queued',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wl_created ON public.whatsapp_logs (created_at DESC);
CREATE INDEX idx_wl_appt ON public.whatsapp_logs (appointment_id);
GRANT SELECT ON public.whatsapp_logs TO authenticated;
GRANT ALL ON public.whatsapp_logs TO service_role;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read logs" ON public.whatsapp_logs FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- SEED (configuração real do negócio, não dados fictícios de operação)
INSERT INTO public.business_settings (name, tagline, address_line, city, whatsapp_phone, instagram_url, maps_url, review_url, opening_hours_text, cancellation_policy)
VALUES (
  'Barbearia 14 de Novembro',
  'Corte, barba e acabamento com padrão de casa tradicional.',
  'R. Antônio Pedro, 572 - Centro',
  'Pedreira-SP',
  '5519974128819',
  'https://instagram.com/barbearia14denovembro',
  'https://www.google.com/maps/search/R.+Ant%C3%B4nio+Pedro,+572,+Centro,+Pedreira-SP+barbearia+14+de+novembro',
  'https://www.google.com/maps/search/?api=1&query=Barbearia+14+de+Novembro+Pedreira+SP',
  'Terça a sexta: 09h às 19h | Sábado: 08h às 17h',
  'Cancelamentos e remarcações com no mínimo 2 horas de antecedência.'
);

INSERT INTO public.automation_settings (barber_notify_phone) VALUES ('5519999999999');

INSERT INTO public.services (name, description, duration_minutes, price_cents, sort_order) VALUES
  ('Corte', 'Corte na tesoura ou máquina, finalizado com navalha.', 40, 4500, 1),
  ('Barba', 'Toalha quente, navalha e hidratação.', 30, 3500, 2),
  ('Corte + Barba', 'Combo completo de corte e barba.', 70, 7000, 3),
  ('Acabamento', 'Pézinho e contorno.', 20, 2000, 4);

INSERT INTO public.barbers (name, phone, bio, sort_order) VALUES
  ('Barbearia 14 de Novembro', '5519999999999', 'Atendimento da casa.', 1);

INSERT INTO public.barber_services (barber_id, service_id)
SELECT b.id, s.id FROM public.barbers b CROSS JOIN public.services s;

INSERT INTO public.working_hours (barber_id, weekday, start_time, end_time, break_start, break_end, active)
SELECT b.id, d.weekday, d.st, d.et, d.bs, d.be, d.act
FROM public.barbers b
CROSS JOIN (VALUES
  (0, '09:00'::time, '19:00'::time, NULL::time, NULL::time, false),
  (1, '09:00'::time, '19:00'::time, '12:00'::time, '13:00'::time, false),
  (2, '09:00'::time, '19:00'::time, '12:00'::time, '13:00'::time, true),
  (3, '09:00'::time, '19:00'::time, '12:00'::time, '13:00'::time, true),
  (4, '09:00'::time, '19:00'::time, '12:00'::time, '13:00'::time, true),
  (5, '09:00'::time, '19:00'::time, '12:00'::time, '13:00'::time, true),
  (6, '08:00'::time, '17:00'::time, NULL::time, NULL::time, true)
) AS d(weekday, st, et, bs, be, act);

INSERT INTO public.whatsapp_templates (key, title, body) VALUES
  ('client_created', 'Confirmação para o cliente', 'Olá {{cliente}}, seu horário na {{barbearia}} está agendado.

Serviço: {{servico}}
Profissional: {{barbeiro}}
Data: {{data}} às {{hora}}
Endereço: {{endereco}}

Qualquer imprevisto, é só responder por aqui.'),
  ('barber_created', 'Aviso de novo agendamento para o barbeiro', 'Novo agendamento
{{cliente}} - {{telefone}}
{{servico}} ({{duracao}} min)
{{data}} às {{hora}}
Valor: {{valor}}'),
  ('client_reminder', 'Lembrete para o cliente', '{{cliente}}, lembrete do seu horário na {{barbearia}}: {{data}} às {{hora}} ({{servico}}).
Endereço: {{endereco}}'),
  ('barber_daily', 'Agenda do dia para o barbeiro', 'Agenda de {{data}}:

{{agenda}}

Total de atendimentos: {{total}}'),
  ('client_payment', 'Confirmação de pagamento', '{{cliente}}, recebemos seu pagamento de {{valor}} referente ao atendimento de {{data}}. Obrigado!'),
  ('client_cancelled', 'Cancelamento', '{{cliente}}, seu horário de {{data}} às {{hora}} na {{barbearia}} foi cancelado. Para remarcar, é só chamar aqui.');
