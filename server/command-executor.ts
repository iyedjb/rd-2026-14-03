import type { Groq } from "groq-sdk";
import type { Destination } from "@shared/schema";

export interface CommandAction {
  type: 'navigate' | 'click_tab' | 'select_destination' | 'click_button' | 'fill_input' | 'submit_form' | 'show_notification' | 'generate_pdf_direct';
  description: string;
  params?: Record<string, any>;
}

export interface CommandResult {
  isCommand: boolean;
  actions?: CommandAction[];
  message: string;
  requiresUserAction?: boolean;
}

async function findMatchingDestination(searchText: string, searchTerms: string[]): Promise<Destination | null> {
  try {
    const storage = await import("./storage").then(m => m.storage);
    const activeDestinations = await storage.getActiveDestinations();
    
    if (!activeDestinations || activeDestinations.length === 0) {
      return null;
    }
    
    const searchLower = searchText.toLowerCase();
    const termsLower = searchTerms.map(t => t.toLowerCase());
    
    let bestMatch: { destination: Destination; score: number } | null = null;
    
    for (const dest of activeDestinations) {
      const destNameLower = dest.name.toLowerCase();
      let score = 0;
      
      if (destNameLower.includes(searchLower)) {
        score += 10;
      }
      
      for (const term of termsLower) {
        if (destNameLower.includes(term)) {
          score += 5;
        }
      }
      
      const termMatches = termsLower.filter(term => destNameLower.includes(term)).length;
      if (termMatches >= Math.min(2, termsLower.length)) {
        score += termMatches * 3;
      }
      
      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { destination: dest, score };
      }
    }
    
    return bestMatch ? bestMatch.destination : null;
  } catch (error) {
    console.error("Error finding matching destination:", error);
    return null;
  }
}

export async function parseCommand(command: string, groq: Groq): Promise<CommandResult> {
  const trimmedCommand = command.slice(1).trim();
  
  const systemPrompt = `Você é um assistente que traduz comandos em português para ações específicas no sistema Roda Bem Turismo.

COMANDOS DISPONÍVEIS E SUAS AÇÕES:

1. GERAR PDF DE EMBARQUE
Comando exemplo: "gera o pdf embarque da aparecida do norte 12/12"
IMPORTANTE: Extraia APENAS o nome do destino, removendo datas, meses e números.
Exemplo: "aparecida do norte 12/12" → extrair apenas "aparecida do norte"
Exemplo: "gramado natal luz 15 de dezembro" → extrair apenas "gramado natal luz"
Ações necessárias:
- Navegar para /buses
- Clicar na aba "Ocupação"  
- Selecionar o destino no dropdown
- Clicar no botão "Gerar Embarque PDF"

2. GERAR PDF DO MOTORISTA
Comando exemplo: "gera o pdf motorista da aparecida do norte 12/12"
IMPORTANTE: Extraia APENAS o nome do destino, removendo datas.
Ações necessárias:
- Navegar para /buses
- Clicar na aba "Ocupação"
- Selecionar o destino no dropdown
- Clicar no botão "Gerar Lista Motorista"

3. GERAR PDF DO HOTEL
Comando exemplo: "gera o pdf hotel da aparecida do norte 12/12"
IMPORTANTE: Extraia APENAS o nome do destino, removendo datas.
Ações necessárias:
- Navegar para /buses
- Clicar na aba "Ocupação"
- Selecionar o destino no dropdown
- Clicar no botão "Gerar Lista Hotel"

4. ADICIONAR CLIENTE
Comando exemplo: "adicionar cliente" ou "criar novo cliente"
Ações necessárias:
- Navegar para /clients/new

5. VER PARCELAS
Comando exemplo: "ver parcelas" ou "mostrar parcelas"
Ações necessárias:
- Navegar para /parcelas

6. ABRIR CAIXA
Comando exemplo: "abrir caixa" ou "ver caixa"
Ações necessárias:
- Navegar para /caixa

7. VER RELATÓRIOS
Comando exemplo: "ver relatórios" ou "abrir relatórios"
Ações necessárias:
- Navegar para /reports

Responda SEMPRE em formato JSON com a seguinte estrutura:
{
  "understood": true/false,
  "actionType": "generate_embarque_pdf" | "generate_motorista_pdf" | "generate_hotel_pdf" | "navigate" | "unknown",
  "destination": "nome do destino SEM datas, meses ou números" (se aplicável),
  "destinationSearchTerms": ["termo1", "termo2", "termo3"] (palavras-chave principais do destino para busca),
  "targetPath": "/caminho" (se navegação),
  "confirmationMessage": "mensagem amigável em português confirmando o que será feito"
}

Exemplo:
Comando: "gera o pdf embarque da aparecida do norte 12/12"
Response: {
  "understood": true,
  "actionType": "generate_embarque_pdf",
  "destination": "aparecida do norte",
  "destinationSearchTerms": ["aparecida", "norte"],
  "confirmationMessage": "Vou gerar o PDF de embarque de Aparecida do Norte"
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Comando: ${trimmedCommand}` }
      ],
      temperature: 0.3,
      max_tokens: 512,
      response_format: { type: "json_object" }
    });

    const response = JSON.parse(completion.choices[0]?.message?.content || '{}');

    if (!response.understood) {
      return {
        isCommand: true,
        message: "❌ Não consegui entender esse comando. Tente algo como:\n- /gera o pdf embarque da gramado\n- /adicionar cliente\n- /ver parcelas"
      };
    }

    const actions: CommandAction[] = [];
    let message = "";
    let requiresUserAction = false;

    switch (response.actionType) {
      case 'generate_embarque_pdf':
      case 'generate_motorista_pdf':
      case 'generate_hotel_pdf': {
        const matchedDestination = await findMatchingDestination(
          response.destination,
          response.destinationSearchTerms || []
        );
        
        if (!matchedDestination) {
          const storage = await import("./storage").then(m => m.storage);
          const allDestinations = await storage.getActiveDestinations();
          const destinationList = allDestinations.map(d => `• ${d.name}`).join('\n');
          
          return {
            isCommand: true,
            message: `❌ Não encontrei o destino "${response.destination}" nos destinos ativos.\n\nDestinos disponíveis:\n${destinationList}\n\n💡 Tente novamente com um dos destinos acima.`
          };
        }
        
        const pdfType = response.actionType === 'generate_embarque_pdf' ? 'embarque' 
          : response.actionType === 'generate_motorista_pdf' ? 'motorista' 
          : 'hotel';
        
        const pdfLabel = pdfType === 'embarque' ? 'embarque' 
          : pdfType === 'motorista' ? 'motorista' 
          : 'hotel';
        
        actions.push(
          { 
            type: 'generate_pdf_direct', 
            description: `Gerando e baixando PDF de ${pdfLabel}...`, 
            params: { 
              destinationId: matchedDestination.id,
              destinationName: matchedDestination.name,
              pdfType,
              pdfLabel
            } 
          }
        );
        message = `🚀 Perfeito! Encontrei o destino **${matchedDestination.name}**.\n\nVou gerar e baixar o PDF de ${pdfLabel} automaticamente...`;
        requiresUserAction = true;
        break;
      }

      case 'navigate':
        actions.push(
          { type: 'navigate', description: `Abrindo ${response.targetPath}`, params: { path: response.targetPath } },
          { type: 'show_notification', description: '✅ Página aberta!', params: { type: 'success' } }
        );
        message = `🚀 ${response.confirmationMessage}\n\nAbrindo a página...`;
        requiresUserAction = true;
        break;

      default:
        return {
          isCommand: true,
          message: "❌ Comando não reconhecido. Comandos disponíveis:\n- /gera o pdf embarque da [destino]\n- /gera o pdf motorista da [destino]\n- /gera o pdf hotel da [destino]\n- /adicionar cliente\n- /ver parcelas\n- /abrir caixa"
        };
    }

    return {
      isCommand: true,
      actions,
      message,
      requiresUserAction
    };

  } catch (error) {
    console.error("Error parsing command:", error);
    return {
      isCommand: true,
      message: "❌ Erro ao processar comando. Tente novamente."
    };
  }
}
