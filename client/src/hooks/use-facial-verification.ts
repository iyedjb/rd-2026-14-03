import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface QRCodeSession {
  session_id: string;
  verification_token: string;
  qr_code: string;
  verification_url: string;
  expires_at: Date;
}

export interface VerificationSession {
  session_id: string;
  user_name: string;
  status: "pending" | "verified" | "failed" | "expired";
  expires_at: Date;
}

export function useGenerateClockOutQR() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (): Promise<QRCodeSession> => {
      const response = await apiRequest("POST", "/api/time-records/generate-clockout-qr");
      const data = await response.json();
      
      console.log("=== RAW API RESPONSE ===");
      console.log("Full response:", data);
      console.log("qr_code exists:", !!data.qr_code);
      console.log("qr_code length:", data.qr_code?.length);
      console.log("qr_code preview:", data.qr_code?.substring(0, 100));
      console.log("expires_at:", data.expires_at);
      console.log("expires_at type:", typeof data.expires_at);
      
      // Convert expires_at string to Date object
      const result = {
        ...data,
        expires_at: new Date(data.expires_at),
      };
      
      console.log("=== PROCESSED RESULT ===");
      console.log("qr_code in result:", !!result.qr_code);
      console.log("expires_at in result:", result.expires_at);
      
      return result;
    },
    onSuccess: () => {
      toast({
        title: "QR Code gerado",
        description: "Escaneie o QR code com seu telefone para completar a saída.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao gerar QR code",
        description: error.message || "Ocorreu um erro ao gerar o QR code.",
        variant: "destructive",
      });
    },
  });
}

export function useVerificationSession(token: string) {
  return useQuery<VerificationSession>({
    queryKey: ["/api/facial-verification/session", token],
    enabled: !!token,
  });
}

export function useVerifyFacialRecognition() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      token: string;
      facial_match_confidence?: number;
      verification_method?: string;
      verification_metadata?: string;
    }) => {
      const response = await apiRequest("POST", "/api/facial-verification/verify", params);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-records/today"] });
      toast({
        title: "Saída registrada",
        description: "Verificação facial concluída com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro na verificação",
        description: error.message || "Falha na verificação facial.",
        variant: "destructive",
      });
    },
  });
}
