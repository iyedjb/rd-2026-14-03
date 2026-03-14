import { useInactiveClients, useUpdateInactiveClient } from "@/hooks/use-inactive-clients";
import { useLocation, useRoute } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInactiveClientSchema, type InsertInactiveClient } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useEffect } from "react";

export default function EditInactiveClient() {
  const [, params] = useRoute("/inactive-clients/:id/edit");
  const [, setLocation] = useLocation();
  const { inactiveClients, isLoading: isLoadingClients } = useInactiveClients();
  const updateInactiveClient = useUpdateInactiveClient();

  const client = inactiveClients.find((c) => c.id === params?.id);

  const form = useForm<InsertInactiveClient>({
    resolver: zodResolver(insertInactiveClientSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      cpf: "",
      phone: "",
      email: "",
      profession: "",
      address: "",
      city: "",
      state: "",
      postal_code: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (client) {
      form.reset({
        first_name: client.first_name,
        last_name: client.last_name,
        cpf: client.cpf,
        phone: client.phone || "",
        email: client.email || "",
        profession: client.profession || "",
        address: client.address || "",
        city: client.city || "",
        state: client.state || "",
        postal_code: client.postal_code || "",
        notes: client.notes || "",
      });
    }
  }, [client, form]);

  const onSubmit = (data: InsertInactiveClient) => {
    if (params?.id) {
      updateInactiveClient.mutate(
        { id: params.id, data },
        {
          onSuccess: () => setLocation("/inactive-clients"),
        }
      );
    }
  };

  if (isLoadingClients) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold">Cliente não encontrado</h2>
        <Button onClick={() => setLocation("/inactive-clients")} className="mt-4">
          Voltar para Lista
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => setLocation("/inactive-clients")}
      >
        <ChevronLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Editar Cliente Inativo</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-first-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sobrenome</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-last-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-cpf" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="textarea-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={updateInactiveClient.isPending}
                data-testid="button-submit"
              >
                {updateInactiveClient.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Salvar Alterações
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
