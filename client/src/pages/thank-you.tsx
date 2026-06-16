import { useParams } from "wouter";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Download, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { FaWhatsapp } from "react-icons/fa";

interface ThankYouData {
  client_name: string;
  destination_name: string;
  whatsapp_group_link: string | null;
}

export default function ThankYou() {
  const { token } = useParams();
  const [countdown, setCountdown] = useState(5);

  const { data: thankYouData } = useQuery<ThankYouData>({
    queryKey: ["/api/thank-you", token],
    queryFn: async () => {
      const response = await fetch(`/api/thank-you/${token}`);
      if (!response.ok) {
        throw new Error("Falha ao buscar os dados de agradecimento");
      }
      return response.json();
    },
    enabled: !!token,
  });

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Use the same client-side generator if possible, but the current PDF route
      // might be doing something else. However, the user wants the EXACT same version.
      // Redirecting to /pdf/:token which uses generateTravelContract
      window.location.href = `/pdf/${token}`;
    }
  }, [countdown, token]);

  const handleDownloadNow = () => {
    window.location.href = `/pdf/${token}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl shadow-2xl border-2 border-green-200 dark:border-green-800">
        <CardContent className="p-12">
          <div className="text-center">
            {/* Ícone de sucesso com animação */}
            <div className="relative inline-block mb-6">
              <CheckCircle className="h-24 w-24 text-green-500 mx-auto animate-bounce" />
              <Sparkles className="h-8 w-8 text-yellow-400 absolute -top-2 -right-2 animate-pulse" />
            </div>

            {/* Mensagem de agradecimento */}
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
              Obrigado por escolher a Roda Bem Turismo!
            </h1>

            <div className="space-y-4 mb-8">
              <p className="text-xl text-gray-700 dark:text-gray-300 font-medium">
                Obrigado por nos escolher como sua empresa 😊
              </p>

              <p className="text-2xl text-green-600 dark:text-green-400 font-semibold italic">
                Seu conforto é a nossa prioridade!
              </p>

              <div className="flex items-center justify-center gap-2 mt-6">
                <div className="w-12 h-1 bg-gradient-to-r from-green-400 to-teal-400 rounded-full"></div>
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <div className="w-12 h-1 bg-gradient-to-r from-teal-400 to-green-400 rounded-full"></div>
              </div>
            </div>

            {/* Detalhes do sucesso */}
            <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg p-6 mb-8">
              <div className="flex items-center justify-center gap-3 mb-3">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                <p className="text-lg font-semibold text-green-800 dark:text-green-200">
                  Seus assentos foram reservados com sucesso!
                </p>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Seu contrato de viagem já está disponível para download
              </p>
            </div>

            {/* Link do grupo do WhatsApp */}
            {thankYouData?.whatsapp_group_link && (
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg p-6 mb-6 text-white">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <FaWhatsapp className="h-8 w-8" />
                  <h2 className="text-xl font-bold">
                    Entre no grupo do WhatsApp!
                  </h2>
                </div>
                <p className="text-center mb-4 text-green-50">
                  Participe do grupo da viagem para{" "}
                  {thankYouData.destination_name} e fique por dentro de todas as
                  novidades!
                </p>
                <Button
                  onClick={() =>
                    window.open(thankYouData.whatsapp_group_link!, "_blank")
                  }
                  size="lg"
                  className="w-full bg-white hover:bg-gray-100 text-green-600 font-semibold text-lg py-6 shadow-lg hover:shadow-xl transition-all"
                  data-testid="button-whatsapp-group"
                >
                  <FaWhatsapp className="h-6 w-6 mr-2" />
                  Entrar no Grupo
                </Button>
              </div>
            )}

            {/* Botões de ação */}
            <div className="space-y-4">
              <Button
                onClick={handleDownloadNow}
                size="lg"
                className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-semibold text-lg py-6 shadow-lg hover:shadow-xl transition-all"
                data-testid="button-download-contract"
              >
                <Download className="h-6 w-6 mr-2" />
                Baixar contrato agora
              </Button>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                Redirecionamento automático em{" "}
                <span className="font-bold text-green-600 dark:text-green-400">
                  {countdown}
                </span>{" "}
                segundos...
              </p>
            </div>

            {/* Mensagem final */}
            <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-400">
                Desejamos uma viagem incrível! 🚌✨
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Em caso de dúvidas, entre em contato conosco
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
