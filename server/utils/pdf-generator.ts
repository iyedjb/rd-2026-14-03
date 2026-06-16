import PDFDocument from 'pdfkit';
import { Funcionario } from '@shared/schema';

export function generateTerminationPDF(funcionario: Funcionario): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
      });

      const buffers: Buffer[] = [];
      
      doc.on('data', (chunk) => {
        buffers.push(chunk);
      });

      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });

      doc.on('error', (err) => {
        reject(err);
      });

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 40;
      const contentWidth = pageWidth - (margin * 2);

      // ===== HEADER =====
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#000').text('RODA BEM TURISMO', margin, margin, { align: 'center', width: contentWidth });
      doc.fontSize(9).font('Helvetica').fillColor('#333').text('AGÊNCIA DE TURISMO EIRELI', margin, doc.y, { align: 'center', width: contentWidth });
      
      // Horizontal line
      doc.moveTo(margin, doc.y + 5).lineTo(pageWidth - margin, doc.y + 5).stroke('#000');
      doc.moveDown(0.8);

      // Company details header
      doc.fontSize(8).font('Helvetica').fillColor('#000');
      doc.text('Rua Professor Ricardo de Souza Cruz | Centro | Esmeraldas - MG | CEP 32800-090', margin, doc.y, { align: 'center', width: contentWidth });
      doc.text('CNPJ: 27.643.750/0019-0 | Tel: (31) 3245-8000 | Email: contato@rodabemturismo.com', margin, doc.y, { align: 'center', width: contentWidth });
      
      doc.moveDown(1.2);

      // ===== DOCUMENT TITLE =====
      doc.fontSize(14).font('Helvetica-Bold').text('TERMO DE RESCISÃO DE CONTRATO DE TRABALHO', margin, doc.y, { align: 'center', width: contentWidth });
      
      doc.moveDown(1);

      // Date
      const today = new Date();
      doc.fontSize(10).font('Helvetica').text(`Local e Data: Esmeraldas, ${today.getDate()} de ${getMonthName(today.getMonth())} de ${today.getFullYear()}`, margin, doc.y);
      
      doc.moveDown(1.5);

      // ===== INTRODUCTORY CLAUSE =====
      doc.fontSize(10).font('Helvetica-Bold').text('PARTES CONTRATANTES:', margin, doc.y);
      doc.fontSize(9).font('Helvetica');
      
      const intro = `RODA BEM TURISMO, pessoa jurídica de direito privado, sediada à Rua Professor Ricardo de Souza Cruz, no bairro Centro, no município de Esmeraldas - MG, CEP nº 32800-090, inscrita no CNPJ sob o nº 27.643.750/0019-0, nesse ato representada por seu diretor Daniel de Paiva Rezende Oliveira, brasileiro, casado, empresário, portador do RG de nº MG-7.713.081 e inscrito no CPF sob o nº 042.361.466-57, doravante denominada EMPREGADORA;`;
      
      doc.text(intro, margin, doc.y, { width: contentWidth, align: 'justify' });
      doc.moveDown(0.8);

      // E
      doc.fontSize(10).font('Helvetica-Bold').text('E', margin, doc.y);
      doc.moveDown(0.3);

      // Employee info
      doc.fontSize(10).font('Helvetica-Bold').text('FUNCIONÁRIO/EMPREGADO:', margin, doc.y);
      doc.fontSize(9).font('Helvetica');
      doc.text(`${funcionario.first_name} ${funcionario.last_name}, portador do CPF nº ${funcionario.cpf}, doravante denominado EMPREGADO;`, margin, doc.y, { width: contentWidth });
      
      doc.moveDown(1.2);

      // ===== WHEREAS CLAUSES =====
      doc.fontSize(10).font('Helvetica-Bold').text('CONSIDERANDOS:', margin, doc.y);
      doc.fontSize(9).font('Helvetica');
      
      doc.text(`CONSIDERANDO que entre as partes foi estabelecido contrato de trabalho, onde o EMPREGADO exercia a função de ${funcionario.position} no departamento de ${funcionario.department};`, margin, doc.y, { width: contentWidth });
      doc.moveDown(0.3);
      
      doc.text(`CONSIDERANDO que o EMPREGADO foi admitido em ${formatDate(funcionario.hire_date)};`, margin, doc.y, { width: contentWidth });
      doc.moveDown(0.3);
      
      doc.text(`CONSIDERANDO que a EMPREGADORA decide rescindir o contrato de trabalho, conforme direito que lhe assiste sob a legislação vigente;`, margin, doc.y, { width: contentWidth });
      
      doc.moveDown(1);

      // ===== OPERATIVE SECTION =====
      doc.fontSize(10).font('Helvetica-Bold').text('PELO PRESENTE TERMO, AS PARTES ACORDAM:', margin, doc.y);
      doc.fontSize(9).font('Helvetica');
      
      doc.moveDown(0.3);
      doc.text(`1º) A EMPREGADORA declara a rescisão do contrato de trabalho do EMPREGADO, com vigência a partir do presente, tendo este exercido funções de ${funcionario.position}.`, margin, doc.y, { width: contentWidth });
      doc.moveDown(0.4);
      
      doc.text(`2º) O salário mensal do EMPREGADO era de R$ ${(funcionario.salary).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`, margin, doc.y, { width: contentWidth });
      doc.moveDown(0.4);
      
      doc.text(`3º) O motivo da rescisão é: ${funcionario.termination_reason || 'Conforme direito da empregadora'}`, margin, doc.y, { width: contentWidth });
      doc.moveDown(0.4);
      
      doc.text(`4º) A data de desligamento é ${formatDate(new Date())}.`, margin, doc.y, { width: contentWidth });
      doc.moveDown(0.4);
      
      doc.text(`5º) Ambas as partes declaram-se cientes e de acordo com os termos desta rescisão, assumindo todas as responsabilidades legais que lhes competem.`, margin, doc.y, { width: contentWidth });
      doc.moveDown(0.4);
      
      doc.text(`6º) O EMPREGADO reconhece ter recebido todas as informações relativas à rescisão e declara estar ciente de seus direitos trabalhistas conforme a Consolidação das Leis do Trabalho (CLT).`, margin, doc.y, { width: contentWidth });
      
      doc.moveDown(1.2);

      // ===== SIGNATURES =====
      doc.fontSize(10).font('Helvetica-Bold').text('ASSINATURAS:', margin, doc.y);
      doc.moveDown(1);

      // Employer signature
      doc.fontSize(9).font('Helvetica').text('PELA EMPREGADORA:', margin, doc.y);
      const empY = doc.y;
      doc.moveTo(margin, empY + 35).lineTo(margin + 200, empY + 35).stroke('#000');
      doc.fontSize(8).text('_________________________________', margin, empY + 38);
      doc.text('Daniel de Paiva Rezende Oliveira', margin, empY + 45);
      doc.text('Diretor | CPF: 042.361.466-57', margin, doc.y);
      
      doc.moveDown(2.5);

      // Employee signature
      doc.fontSize(9).font('Helvetica').text('PELO EMPREGADO:', margin, doc.y);
      const empeeY = doc.y;
      doc.moveTo(margin, empeeY + 35).lineTo(margin + 200, empeeY + 35).stroke('#000');
      doc.fontSize(8).text('_________________________________', margin, empeeY + 38);
      doc.text(`${funcionario.first_name} ${funcionario.last_name}`, margin, empeeY + 45);
      doc.text(`CPF: ${funcionario.cpf}`, margin, doc.y);

      doc.moveDown(3);

      // ===== FOOTER =====
      doc.fontSize(7).font('Helvetica').fillColor('#999');
      const footer = `Documento gerado eletronicamente pelo Sistema de Gestão Integrada - RODA BEM TURISMO | ${today.toLocaleString('pt-BR')}`;
      doc.text(footer, margin, pageHeight - 20, { width: contentWidth, align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export function generateMonthlyReportPDF(clients: any[], month: number, year: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 30,
        autoFirstPage: true
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const margin = 30;
      const pageWidth = doc.page.width;
      const contentWidth = pageWidth - (margin * 2);

      // Header
      doc.fontSize(16).font('Helvetica-Bold').text('RODA BEM TURISMO', { align: 'center' });
      doc.fontSize(12).font('Helvetica').text(`Relatório Mensal de Clientes - ${getMonthName(month - 1).toUpperCase()} / ${year}`, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(9).fillColor('#666').text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, { align: 'center' });
      doc.fillColor('#000');
      doc.moveDown(0.5);
      doc.moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke();
      doc.moveDown(0.8);

      if (clients.length === 0) {
        doc.fontSize(10).font('Helvetica').text('Nenhum cliente encontrado para este período.', { align: 'center' });
        doc.end();
        return;
      }

      // Column positions for landscape layout
      const col1 = margin;         // Data Criação
      const col2 = margin + 65;    // Cliente
      const col3 = margin + 200;   // Acompanhantes
      const col4 = margin + 420;   // Destino
      const col5 = margin + 540;   // Valor

      const drawTableHeader = (yPos: number) => {
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#333');
        doc.text('Data Criação', col1, yPos, { width: 60 });
        doc.text('Cliente', col2, yPos, { width: 130 });
        doc.text('Acompanhantes', col3, yPos, { width: 210 });
        doc.text('Destino', col4, yPos, { width: 115 });
        doc.text('Valor', col5, yPos, { width: 70, align: 'right' });
        doc.fillColor('#000');
        doc.moveDown(0.4);
        doc.moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke('#ccc');
        doc.moveDown(0.4);
      };

      drawTableHeader(doc.y);

      let totalAmount = 0;

      clients.forEach(client => {
        // Check for page overflow
        if (doc.y > doc.page.height - 80) {
          doc.addPage();
          drawTableHeader(margin + 10);
        }

        doc.fontSize(8).font('Helvetica');
        const startY = doc.y;
        
        // Format creation date
        const createdAt = client.created_at ? new Date(client.created_at).toLocaleDateString('pt-BR') : '-';
        
        const clientName = `${client.first_name || ''} ${client.last_name || ''}`.trim() || '-';
        
        // Extract companion names from companions array
        let companionNames = '-';
        if (client.companions && Array.isArray(client.companions) && client.companions.length > 0) {
          companionNames = client.companions
            .map((c: any) => c.name || c.first_name || '')
            .filter((name: string) => name)
            .join(', ');
          if (!companionNames) companionNames = '-';
        }
        
        const amount = Number(client.travel_price) || 0;
        totalAmount += amount;

        doc.text(createdAt, col1, startY, { width: 60 });
        doc.text(clientName, col2, startY, { width: 130 });
        doc.text(companionNames, col3, startY, { width: 210 });
        doc.text(client.destination || '-', col4, startY, { width: 115 });
        doc.text(`R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, col5, startY, { width: 70, align: 'right' });
        
        doc.moveDown(1.2);
      });

      doc.moveDown(0.5);
      doc.moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text(`Total de Clientes: ${clients.length}`, col1, doc.y);
      doc.text(`TOTAL GERAL: R$ ${totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, col5 - 100, doc.y - 12, { width: 170, align: 'right' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function formatDate(date: Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function getMonthName(monthIndex: number): string {
  const months = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  return months[monthIndex];
}
