import { useState, useRef, useEffect } from "react";
import { Send, X, MessageCircle, Loader2, Zap, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { ChatMessage } from "@shared/schema";
import assistantAvatar from "@assets/image_1763152883725.png";

interface ChatMessageProps {
  message: ChatMessage;
}

function ChatMessageItem({ message }: ChatMessageProps) {
  const isAssistant = message.role === "assistant";
  const isCommand = message.isCommand;

  return (
    <div className={`flex gap-3 ${isAssistant ? "justify-start" : "justify-end"} mb-3`}>
      {isAssistant && (
        <Avatar className="h-8 w-8 flex-shrink-0 rounded-full overflow-hidden flex-shrink-0">
          <AvatarImage src={assistantAvatar} alt="Barbara" className="rounded-full object-cover" />
          <AvatarFallback className="bg-emerald-500 text-white text-xs rounded-full">B</AvatarFallback>
        </Avatar>
      )}
      <div
        className={`max-w-[75%] rounded-3xl px-4 py-2.5 text-sm leading-relaxed ${
          isAssistant
            ? "bg-emerald-50 dark:bg-emerald-950/40 text-gray-800 dark:text-gray-100"
            : "bg-emerald-600 dark:bg-emerald-600 text-white"
        }`}
      >
        {isCommand && (
          <div className="flex items-center gap-2 mb-2 text-emerald-600 dark:text-emerald-400">
            <Zap className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase">Modo Comando</span>
          </div>
        )}
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}

interface AssistantChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AssistantChat({ isOpen, onClose }: AssistantChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Olá! Sou a Barbara, sua consultora de viagens da Roda Bem Turismo! 😊\n\n💡 **Dica**: Use o prefixo `/` para me dar comandos e eu executo para você!\n\nExemplos:\n• `/gera o pdf embarque da gramado`\n• `/adicionar cliente`\n• `/ver parcelas`\n\nComo posso te ajudar?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [executingActions, setExecutingActions] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Function to execute command actions
  const executeCommandActions = async (actions: any[]) => {
    if (!actions || actions.length === 0) return;

    setExecutingActions(true);

    for (const action of actions) {
      // Add progress message
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚡ ${action.description}`,
          timestamp: new Date(),
        },
      ]);

      // Wait a bit for visual effect
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Execute the action
      try {
        switch (action.type) {
          case 'navigate':
            setLocation(action.params.path);
            break;

          case 'click_tab':
            // Wait for page to load
            await new Promise((resolve) => setTimeout(resolve, 500));
            const tabButton = document.querySelector(`[data-testid="tab-bus-${action.params.tab}"]`) as HTMLElement;
            if (tabButton) {
              tabButton.click();
            }
            break;

          case 'select_destination':
            // Wait for tab to load
            await new Promise((resolve) => setTimeout(resolve, 500));
            // Find the select trigger and click it
            const selectTrigger = document.querySelector('[role="combobox"]') as HTMLElement;
            if (selectTrigger) {
              selectTrigger.click();
              // Wait for dropdown to open
              await new Promise((resolve) => setTimeout(resolve, 300));
              // Find the option with the destination name
              const options = Array.from(document.querySelectorAll('[role="option"]'));
              
              // Try to find the destination using fuzzy matching
              let destinationOption = null;
              const destinationLower = action.params.destination.toLowerCase();
              const searchTerms = action.params.destinationSearchTerms || destinationLower.split(' ');
              
              // First, try exact phrase match (without dates)
              destinationOption = options.find(
                (opt) => {
                  const text = opt.textContent?.toLowerCase() || '';
                  return text.includes(destinationLower);
                }
              );
              
              // If not found, try matching all search terms
              if (!destinationOption) {
                destinationOption = options.find(
                  (opt) => {
                    const text = opt.textContent?.toLowerCase() || '';
                    return searchTerms.every((term: string) => text.includes(term.toLowerCase()));
                  }
                );
              }
              
              // If still not found, try partial match with at least 2 terms
              if (!destinationOption && searchTerms.length >= 2) {
                destinationOption = options.find(
                  (opt) => {
                    const text = opt.textContent?.toLowerCase() || '';
                    const matchCount = searchTerms.filter((term: string) => text.includes(term.toLowerCase())).length;
                    return matchCount >= Math.min(2, searchTerms.length);
                  }
                );
              }
              
              if (destinationOption) {
                (destinationOption as HTMLElement).click();
              } else {
                // Show error if destination not found
                setMessages((prev) => [
                  ...prev,
                  {
                    role: "assistant",
                    content: `❌ Não encontrei o destino "${action.params.destination}" na lista. Verifique se o destino está cadastrado.`,
                    timestamp: new Date(),
                  },
                ]);
                setExecutingActions(false);
                return; // Stop execution
              }
            }
            break;

          case 'click_button':
            // Wait for destination to be selected
            await new Promise((resolve) => setTimeout(resolve, 800));
            let buttonSelector = '';
            if (action.params.button === 'generate_embarque_pdf') {
              buttonSelector = '[data-testid="button-generate-embarque-pdf"]';
            } else if (action.params.button === 'generate_motorista_pdf') {
              buttonSelector = '[data-testid="button-generate-motorista-pdf"]';
            } else if (action.params.button === 'generate_hotel_pdf') {
              buttonSelector = '[data-testid="button-generate-hotel-pdf"]';
            }
            
            if (buttonSelector) {
              const button = document.querySelector(buttonSelector) as HTMLElement;
              if (button) {
                button.click();
              }
            }
            break;

          case 'show_notification':
            toast({
              title: action.description,
              variant: action.params.type === 'success' ? 'default' : 'destructive',
            });
            break;

          case 'generate_pdf_direct':
            try {
              const { destinationId, destinationName, pdfType, pdfLabel } = action.params;
              
              const response = await apiRequest("POST", "/api/commands/generate-pdf", {
                destinationId,
                pdfType
              });
              
              const blob = await response.blob();
              
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.style.display = 'none';
              a.href = url;
              
              const contentDisposition = response.headers.get('Content-Disposition');
              let filename = `PDF_${pdfLabel}_${destinationName}.pdf`;
              if (contentDisposition) {
                const filenameStarMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/i);
                if (filenameStarMatch) {
                  try {
                    filename = decodeURIComponent(filenameStarMatch[1]);
                  } catch {
                    filename = filenameStarMatch[1];
                  }
                } else {
                  const filenameMatch = contentDisposition.match(/filename="?([^";\n]+)"?/);
                  if (filenameMatch) {
                    try {
                      filename = decodeURIComponent(filenameMatch[1]);
                    } catch {
                      filename = filenameMatch[1];
                    }
                  }
                }
              }
              
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
              
              setMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content: `✅ PDF de ${pdfLabel} de **${destinationName}** gerado e baixado com sucesso! Verifique sua pasta de downloads.`,
                  timestamp: new Date(),
                },
              ]);
              
              toast({
                title: `✅ PDF baixado!`,
                description: `O PDF de ${pdfLabel} foi baixado para seu computador.`,
              });
            } catch (error) {
              console.error('Error generating PDF:', error);
              setMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content: `❌ Erro ao gerar o PDF. Por favor, tente novamente.`,
                  timestamp: new Date(),
                },
              ]);
              
              toast({
                title: "Erro ao gerar PDF",
                description: "Não foi possível gerar o PDF. Tente novamente.",
                variant: "destructive",
              });
            }
            break;
        }
      } catch (error) {
        console.error('Error executing action:', error);
      }
    }

    setExecutingActions(false);
  };

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/chat", {
        message,
        history: messages.map((m) => ({ role: m.role, content: m.content })),
      });
      return response.json();
    },
    onSuccess: async (data: ChatMessage) => {
      setMessages((prev) => [...prev, data]);
      
      // If this is a command response with actions, execute them
      if (data.isCommand && data.actions && data.actions.length > 0) {
        await executeCommandActions(data.actions);
      }
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Desculpe, estou com dificuldades técnicas no momento. Por favor, tente novamente. 🙏",
          timestamp: new Date(),
        },
      ]);
    },
  });

  const handleSend = () => {
    if (!inputValue.trim() || chatMutation.isPending) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    chatMutation.mutate(userMessage.content);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-20 right-6 z-50 w-[420px] animate-in slide-in-from-bottom-5 duration-300">
      <Card className="shadow-2xl border border-emerald-200/50 dark:border-emerald-800/50 rounded-3xl overflow-hidden bg-white dark:bg-slate-900">
        <CardHeader className="bg-gradient-to-r from-emerald-600 to-emerald-700 dark:from-emerald-700 dark:to-emerald-800 p-4 relative">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 shadow-md rounded-full overflow-hidden border-2 border-white/50">
                <AvatarImage src={assistantAvatar} alt="Barbara" className="rounded-full object-cover" />
                <AvatarFallback className="bg-emerald-500 text-white rounded-full font-bold">B</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-white font-bold text-base">Barbara</h3>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-emerald-300 rounded-full animate-pulse"></div>
                  <p className="text-emerald-100 text-xs font-medium">Online agora</p>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 h-8 w-8"
              data-testid="button-close-chat"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea ref={scrollAreaRef} className="h-[380px] p-4 bg-white dark:bg-slate-900">
            {messages.map((message, index) => (
              <ChatMessageItem key={index} message={message} />
            ))}
            {chatMutation.isPending && (
              <div className="flex gap-3 justify-start mb-3">
                <Avatar className="h-8 w-8 flex-shrink-0 rounded-full overflow-hidden flex-shrink-0">
                  <AvatarImage src={assistantAvatar} alt="Barbara" className="rounded-full object-cover" />
                  <AvatarFallback className="bg-emerald-500 text-white text-xs rounded-full">B</AvatarFallback>
                </Avatar>
                <div className="bg-emerald-50 dark:bg-emerald-950/40 rounded-3xl px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />
                    <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">Digitando...</span>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>

          <div className="p-4 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                placeholder="Digite sua mensagem..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={chatMutation.isPending}
                className="flex-1 rounded-full bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-0 text-sm placeholder:text-gray-500 dark:placeholder:text-gray-400"
                data-testid="input-chat-message"
              />
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || chatMutation.isPending}
                className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 h-10 w-10 flex items-center justify-center"
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface AssistantButtonProps {
  onClick: () => void;
}

export function AssistantButton({ onClick }: AssistantButtonProps) {
  return (
    <button
      onClick={onClick}
      data-testid="button-open-assistant"
      className="fixed bottom-6 right-6 z-40 h-16 w-16 rounded-full shadow-lg hover:shadow-xl transition-shadow duration-300 flex items-center justify-center flex-shrink-0"
    >
      <Avatar className="h-16 w-16 ring-2 ring-emerald-600 border-2 border-white cursor-pointer rounded-full overflow-hidden">
        <AvatarImage src={assistantAvatar} alt="Barbara - Assistente Virtual" className="rounded-full object-cover" />
        <AvatarFallback className="bg-emerald-600 text-white font-bold text-xl rounded-full">B</AvatarFallback>
      </Avatar>
    </button>
  );
}
