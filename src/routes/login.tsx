import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar no painel — Barbearia 14 de Novembro" },
      {
        name: "description",
        content: "Acesso restrito à equipe da Barbearia 14 de Novembro.",
      },
      { property: "og:title", content: "Entrar no painel" },
      { property: "og:description", content: "Acesso restrito à equipe da barbearia." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app", replace: true });
    });
  }, [navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("E-mail ou senha inválidos.");
      return;
    }
    navigate({ to: "/app", replace: true });
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { full_name: name },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Conta criada. Faça login para entrar no painel.");
  }

  return (
    <div className="surface-grain flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Site
      </Link>
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6">
        <h1 className="text-3xl leading-none">
          Painel <span className="text-primary">14 de Novembro</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Acesso restrito à equipe.</p>

        <Tabs defaultValue="login" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Criar acesso</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  className="h-12"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  className="h-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              <Button type="submit" className="h-12 w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
                Entrar
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  className="h-12"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-novo">E-mail</Label>
                <Input
                  id="email-novo"
                  type="email"
                  className="h-12"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha-nova">Senha</Label>
                <Input
                  id="senha-nova"
                  type="password"
                  className="h-12"
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
              <Button type="submit" className="h-12 w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
                Criar acesso
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
