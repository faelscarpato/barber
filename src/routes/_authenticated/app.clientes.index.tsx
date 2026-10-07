import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatPhone } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/app/clientes/")({
  component: Clientes,
});

function Clientes() {
  const [term, setTerm] = useState("");

  const query = useQuery({
    queryKey: ["clients", term],
    queryFn: async () => {
      let request = supabase.from("clients").select("*").order("name").limit(200);
      if (term.trim()) {
        const t = `%${term.trim()}%`;
        request = request.or(`name.ilike.${t},phone.ilike.${t}`);
      }
      const { data, error } = await request;
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-5">
      <h1 className="text-3xl">Clientes</h1>
      <Input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Buscar por nome ou telefone"
        className="h-12"
        aria-label="Buscar cliente"
      />
      {query.isLoading ? (
        <Skeleton className="h-48 rounded-lg" />
      ) : (query.data?.length ?? 0) === 0 ? (
        <p className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Nenhum cliente encontrado.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {query.data?.map((c) => (
            <li key={c.id}>
              <Link
                to="/app/clientes/$id"
                params={{ id: c.id }}
                className="flex min-h-14 items-center justify-between p-4 text-sm hover:bg-elevated"
              >
                <span className="font-semibold">{c.name}</span>
                <span className="text-muted-foreground">{formatPhone(c.phone)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
