import { useClients } from "@/hooks/use-clients";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { Link } from "wouter";

export default function ClientDataQualityReport() {
  const { clients = [] } = useClients();

  const isEmpty = (val: any) => !val || (typeof val === 'string' && val.trim() === '');

  const getClientDataQuality = (client: any) => {
    const missingFields: string[] = [];

    // Critical fields
    if (isEmpty(client.cpf)) missingFields.push('CPF');
    if (isEmpty(client.birthdate)) missingFields.push('Data de Nascimento');
    if (isEmpty(client.destination)) missingFields.push('Destino');
    if (isEmpty(client.phone)) missingFields.push('Telefone');

    // Important fields
    if (isEmpty(client.email)) missingFields.push('Email');
    if (isEmpty(client.address)) missingFields.push('Endereço');

    if (missingFields.length === 0) {
      return { status: 'complete', missingFields: [] };
    } else if (missingFields.length <= 2) {
      return { status: 'incomplete', missingFields };
    } else {
      return { status: 'missing', missingFields };
    }
  };

  // Sort clients by number of missing fields (descending)
  const sortedClients = [...clients].sort((a, b) => {
    const aMissing = getClientDataQuality(a).missingFields.length;
    const bMissing = getClientDataQuality(b).missingFields.length;
    return bMissing - aMissing;
  });

  const missingClients = sortedClients.filter(c => getClientDataQuality(c).status === 'missing' || getClientDataQuality(c).status === 'incomplete');
  const incompleteCount = sortedClients.filter(c => getClientDataQuality(c).status === 'incomplete').length;
  const missingCount = sortedClients.filter(c => getClientDataQuality(c).status === 'missing').length;

  const generateTextReport = () => {
    let text = 'RELATÓRIO DETALHADO - DADOS FALTANDO POR CLIENTE\n';
    text += '================================================\n';
    text += `Data: ${new Date().toLocaleDateString('pt-BR')}\n`;
    text += '================================================\n\n';
    text += `TOTAL DE CLIENTES: ${clients.length}\n`;
    text += `✓ Completos (todos os dados): ${clients.length - incompleteCount - missingCount}\n`;
    text += `◐ Incompletos (1-2 campos faltando): ${incompleteCount}\n`;
    text += `✗ Faltando Dados (3+ campos): ${missingCount}\n\n`;
    text += '================================================\n';
    text += `TOTAL DE CLIENTES COM DADOS FALTANDO: ${missingClients.length}\n`;
    text += '================================================\n\n';

    missingClients.forEach((client, idx) => {
      const quality = getClientDataQuality(client);
      text += `${idx + 1}. ${client.first_name} ${client.last_name}\n`;
      text += `   CPF: ${client.cpf || '❌ NÃO PREENCHIDO'}\n`;
      text += `   Telefone: ${client.phone || '❌ NÃO PREENCHIDO'}\n`;
      text += `   Email: ${client.email || '❌ NÃO PREENCHIDO'}\n`;
      text += `   Data Nascimento: ${client.birthdate ? new Date(client.birthdate).toLocaleDateString('pt-BR') : '❌ NÃO PREENCHIDO'}\n`;
      text += `   Endereço: ${client.address || '❌ NÃO PREENCHIDO'}\n`;
      text += `   Destino: ${client.destination || '❌ NÃO PREENCHIDO'}\n`;
      
      if (quality.missingFields.length > 0) {
        text += `\n   ❌ FALTANDO (${quality.missingFields.length}): ${quality.missingFields.join(', ')}\n`;
      }
      text += '\n   ' + '─'.repeat(60) + '\n\n';
    });

    return text;
  };

  const downloadReport = () => {
    const text = generateTextReport();
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', `relatorio_dados_clientes_${new Date().toISOString().split('T')[0]}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/clients">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Relatório Completo de Dados</h1>
              <p className="text-slate-600 dark:text-slate-400">Todos os {missingClients.length} clientes com dados faltando</p>
            </div>
          </div>
          <Button onClick={downloadReport} className="bg-blue-600 hover:bg-blue-700">
            <Download className="h-4 w-4 mr-2" />
            Baixar TXT
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-900 dark:text-white">{clients.length - incompleteCount - missingCount}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Completos</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">{incompleteCount}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Incompletos (1-2)</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">{missingCount}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Faltando (3+)</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Text Report View */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <pre className="bg-slate-900 text-slate-100 p-4 rounded overflow-x-auto text-xs font-mono max-h-96 overflow-y-auto whitespace-pre-wrap">
{generateTextReport()}
            </pre>
          </CardContent>
        </Card>

        {/* Detailed List */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">
              Visualização em Cards ({missingClients.length} clientes)
            </h2>
            <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto">
              {missingClients.map((client, idx) => {
                const quality = getClientDataQuality(client);
                const statusColor = quality.status === 'missing' ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800';

                return (
                  <div key={client.id} className={`border-2 rounded-lg p-4 ${statusColor}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-bold text-slate-900 dark:text-white text-base">
                          {idx + 1}. {client.first_name} {client.last_name}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-mono">
                          CPF: {client.cpf || '❌ NÃO PREENCHIDO'}
                        </div>
                        
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          <div>Telefone: {client.phone ? '✓' : '❌'}</div>
                          <div>Email: {client.email ? '✓' : '❌'}</div>
                          <div>Data Nasc.: {client.birthdate ? '✓' : '❌'}</div>
                          <div>Endereço: {client.address ? '✓' : '❌'}</div>
                          <div>Destino: {client.destination ? '✓' : '❌'}</div>
                        </div>
                        
                        <div className="mt-3">
                          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            ❌ FALTANDO ({quality.missingFields.length}):
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {quality.missingFields.map((field) => (
                              <span
                                key={field}
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  quality.status === 'missing'
                                    ? 'bg-red-300 text-red-900 dark:bg-red-800 dark:text-red-100'
                                    : 'bg-yellow-300 text-yellow-900 dark:bg-yellow-800 dark:text-yellow-100'
                                }`}
                              >
                                {field}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
