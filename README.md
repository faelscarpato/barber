# BarberPro Flow — Sistema de Gestão e Agendamento para Barbearias

> **Versão:** 1.0.0 (MVP Consolidado)  
> **Status:** Pronto para Produção  
> **Licença:** MIT (Uso Proprietário / Whitelabel)

---

## 💈 Sobre o Produto
O **BarberPro Flow** é um sistema operacional completo para barbearias independentes e redes de atendimento, focado em agilidade máxima, eliminação de faltas (*no-show*) via WhatsApp e controle de caixa sem complicação.

### Principais Funcionalidades
- 🚀 **Agendamento Rápido sem Senha (< 60s):** O cliente escolhe barbeiro, serviço, dia e horário pelo navegador do celular sem precisar instalar app de loja ou criar conta com senha.
- 🔒 **Motor Anti-Colisão em Banco de Dados:** Constraint nativa do PostgreSQL (`btree_gist` / `no_overlap_per_barber`) que impede matematicamente agendamentos sobrepostos para o mesmo barbeiro.
- 📱 **Automações de WhatsApp Multigateway:** Confirmação instantânea de horário, lembrete automático 1 hora antes do atendimento e resumo matinal da agenda para os profissionais (suporta Evolution API, Z-API e o gateway auto-hospedado **WA-AKG**).
- 💰 **Painel Financeiro & Caixa:** Registro em tempo real de comandas, pagamentos parciais e totais (Pix, Dinheiro, Cartão) e acompanhamento do saldo do dia.
- 📅 **Gestão Operacional:** Bloqueio de folgas, controle de horários de expediente, intervalos de almoço e CRM de clientes com histórico de visitas.

---

## 🛠️ Stack Tecnológica
- **Front-end:** React 19, TypeScript, TanStack Router (File-based), TanStack Query v5.
- **Estilização & UI:** Tailwind CSS v4, espaço de cores OKLCH, Radix UI / shadcn/ui (WCAG 2.2 AA).
- **Servidor & SSR:** TanStack Start, Nitro Engine, Server Functions type-safe.
- **Banco de Dados & Auth:** Supabase (PostgreSQL 15+ com Row Level Security e Triggers).
- **Runtime & Package Manager:** Bun v1.4.2 (compatível com Node.js 20+).

---

## ⚙️ Configuração e Instalação

### 1. Clonar e Instalar Dependências
```bash
bun install
```

### 2. Configurar Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env` e preencha as credenciais do seu Supabase e gateway de mensageria:

```env
# Banco de Dados e Auth (Supabase)
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_PUBLISHABLE_KEY=sua-chave-anon-publica
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role-privada
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-anon-publica

# Automações e Webhook Cron
CRON_SECRET=seu-segredo-de-cron-forte

# WhatsApp (Opção 1: WA-AKG Auto-hospedado)
WA_AKG_BASE_URL=https://zap.seudominio.com
WA_AKG_API_KEY=sua-api-key-wa-akg
WA_AKG_SESSION_ID=barbearia

# WhatsApp (Opção 2: Evolution API ou Z-API)
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE=
ZAPI_BASE_URL=
ZAPI_CLIENT_TOKEN=
```

### 3. Rodar em Desenvolvimento
```bash
bun run dev
```

### 4. Executar Testes Unitários
```bash
bun test
```

### 5. Compilar para Produção
```bash
bun run build
bun run preview
```

---

## 🔐 Segurança e Boas Práticas
- **Zero Tokens Públicos em Ações Administrativas:** Webhooks e rotas protegidas por `CRON_SECRET` e validação estrita de Bearer tokens.
- **LGPD:** Telefones e dados de clientes passam por filtros de mascaramento (`maskPhoneLGPD`) antes de exibições públicas.
- **Totalmente Desacoplado:** Livre de qualquer dependência ou telemetria de plataformas externas de prototipação.
