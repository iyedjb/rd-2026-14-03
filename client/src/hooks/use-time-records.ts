import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TimeRecord } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useTimeRecords() {
  return useQuery<TimeRecord[]>({
    queryKey: ["/api/time-records"],
  });
}

export function useTodayTimeRecord() {
  return useQuery<TimeRecord | null>({
    queryKey: ["/api/time-records/today"],
  });
}

export function useTimeRecordsByUser(userId: string) {
  return useQuery<TimeRecord[]>({
    queryKey: ["/api/time-records/user", userId],
    enabled: !!userId,
  });
}

export function useClockIn() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/time-records/clock-in");
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-records/today"] });
      toast({
        title: "Entrada registrada",
        description: "Seu horário de entrada foi registrado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao registrar entrada",
        description: error.message || "Ocorreu um erro ao registrar sua entrada.",
        variant: "destructive",
      });
    },
  });
}

export function useStartBreak() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/time-records/start-break");
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-records/today"] });
      toast({
        title: "Intervalo iniciado",
        description: "Seu intervalo foi iniciado. Você tem 15 minutos.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao iniciar intervalo",
        description: error.message || "Ocorreu um erro ao iniciar seu intervalo.",
        variant: "destructive",
      });
    },
  });
}

export function useEndBreak() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/time-records/end-break");
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-records/today"] });
      toast({
        title: "Intervalo finalizado",
        description: "Seu intervalo foi finalizado.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao finalizar intervalo",
        description: error.message || "Ocorreu um erro ao finalizar seu intervalo.",
        variant: "destructive",
      });
    },
  });
}

export function useStartLunch() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/time-records/start-lunch");
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-records/today"] });
      toast({
        title: "Almoço iniciado",
        description: "Seu intervalo de almoço foi iniciado. Você tem 1 hora.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao iniciar almoço",
        description: error.message || "Ocorreu um erro ao iniciar seu almoço.",
        variant: "destructive",
      });
    },
  });
}

export function useEndLunch() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/time-records/end-lunch");
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-records/today"] });
      toast({
        title: "Almoço finalizado",
        description: "Seu intervalo de almoço foi finalizado.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao finalizar almoço",
        description: error.message || "Ocorreu um erro ao finalizar seu almoço.",
        variant: "destructive",
      });
    },
  });
}

export function useClockOut() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/time-records/clock-out");
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-records/today"] });
      toast({
        title: "Saída registrada",
        description: "Seu horário de saída foi registrado com sucesso. Até amanhã!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao registrar saída",
        description: error.message || "Ocorreu um erro ao registrar sua saída.",
        variant: "destructive",
      });
    },
  });
}
