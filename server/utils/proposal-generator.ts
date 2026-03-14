import PDFDocument from 'pdfkit';
import { Proposal } from '@shared/schema';

export function generateProposalPDF(proposal: Proposal): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 45,
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
      const margin = 45;
      const contentWidth = pageWidth - (margin * 2);

      // ===== HEADER =====
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#1a1a1a').text('RODA BEM TURISMO', margin, margin, { align: 'center', width: contentWidth });
      doc.fontSize(9).font('Helvetica').fillColor('#555').text('Rua Professor Ricardo de Souza Cruz - Centro - Esmeraldas, MG | CEP 32800-090', margin, doc.y, { align: 'center', width: contentWidth });
      
      doc.moveTo(margin, doc.y + 8).lineTo(pageWidth - margin, doc.y + 8).stroke('#2563eb');
      doc.moveDown(1.2);

      // ===== PROPOSAL TITLE =====
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#000').text('PROPOSTA DE TRABALHO', margin, doc.y, { align: 'center', width: contentWidth });
      doc.fontSize(9).font('Helvetica').fillColor('#666').text(`Proposta #${proposal.id.slice(-8).toUpperCase()}`, margin, doc.y, { align: 'center', width: contentWidth });
      
      doc.moveDown(0.8);

      const today = new Date();
      doc.fontSize(8).font('Helvetica').fillColor('#888');
      doc.text(`Esmeraldas, ${today.getDate()} de ${getMonthName(today.getMonth())} de ${today.getFullYear()}`, margin, doc.y, { align: 'center', width: contentWidth });
      
      doc.moveDown(1.2);

      // ===== CLIENT SECTION =====
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#000').text('PARA:', margin, doc.y);
      doc.fontSize(9).font('Helvetica').fillColor('#1a1a1a');
      doc.text(`${proposal.client_first_name} ${proposal.client_last_name}`, margin, doc.y);
      
      if (proposal.client_email) {
        doc.text(`Email: ${proposal.client_email}`, margin, doc.y);
      }
      if (proposal.client_phone) {
        doc.text(`Telefone: ${proposal.client_phone}`, margin, doc.y);
      }

      doc.moveDown(1);

      // ===== PROFESSIONAL BOX =====
      const boxY = doc.y;
      doc.rect(margin, boxY, contentWidth, 4).fill('#2563eb');
      
      doc.moveDown(0.5);

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#000').text('DETALHES DA PROPOSTA', margin, doc.y);
      doc.moveDown(0.4);

      doc.fontSize(9).font('Helvetica').fillColor('#1a1a1a');
      
      // Two columns
      const col1 = margin;
      const col2 = margin + contentWidth / 2 + 10;
      const colWidth = (contentWidth - 10) / 2;
      
      let currentY = doc.y;

      // Left column
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#555').text('Coordenador:', col1, currentY);
      doc.fontSize(9).font('Helvetica').fillColor('#000').text(proposal.funcionario_name, col1, doc.y);
      doc.fontSize(8).fillColor('#888').text(`${proposal.funcionario_position}`, col1, doc.y);
      doc.fontSize(8).fillColor('#555').text('Email:', col1, doc.y + 8);
      doc.fontSize(9).fillColor('#000').text(proposal.funcionario_email || 'N/A', col1, doc.y);

      // Right column at same height
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#555').text('Salário Proposto:', col2, boxY + 40);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#2563eb').text(`R$ ${proposal.proposed_salary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, col2, doc.y);

      doc.moveDown(2);

      // ===== JOB DETAILS =====
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#000').text('DESCRIÇÃO DO TRABALHO:', margin, doc.y);
      doc.fontSize(9).font('Helvetica').fillColor('#1a1a1a');
      doc.text(proposal.job_description, margin, doc.y, { width: contentWidth, align: 'justify' });

      doc.moveDown(1);

      // ===== CONDITIONS TABLE =====
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#000').text('CONDIÇÕES DE TRABALHO:', margin, doc.y);
      doc.moveDown(0.5);

      const tableY = doc.y;
      const cellHeight = 20;
      const colWidth1 = contentWidth * 0.3;
      const colWidth2 = contentWidth * 0.7;

      // Header
      doc.rect(margin, tableY, colWidth1, cellHeight).fill('#e0e7ff');
      doc.rect(margin + colWidth1, tableY, colWidth2, cellHeight).fill('#e0e7ff');
      
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#000');
      doc.text('Campo', margin + 5, tableY + 5, { width: colWidth1 - 10 });
      doc.text('Informação', margin + colWidth1 + 5, tableY + 5, { width: colWidth2 - 10 });

      // Rows
      let rowY = tableY + cellHeight;
      const rows = [
        { label: 'Local de Trabalho', value: capitalizeLocation(proposal.work_location) },
        { label: 'Dias de Trabalho', value: proposal.work_days },
        { label: 'Horário', value: proposal.work_hours || 'A definir' },
      ];

      rows.forEach((row, idx) => {
        const bgColor = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
        doc.rect(margin, rowY, colWidth1, cellHeight).fill(bgColor);
        doc.rect(margin + colWidth1, rowY, colWidth2, cellHeight).fill(bgColor);
        
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#000');
        doc.text(row.label, margin + 5, rowY + 5, { width: colWidth1 - 10 });
        doc.fontSize(9).font('Helvetica').fillColor('#1a1a1a');
        doc.text(row.value, margin + colWidth1 + 5, rowY + 5, { width: colWidth2 - 10 });
        
        rowY += cellHeight;
      });

      doc.moveDown(4);

      // ===== ADDITIONAL DETAILS =====
      if (proposal.additional_details) {
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#000').text('OBSERVAÇÕES:', margin, doc.y);
        doc.fontSize(9).font('Helvetica').fillColor('#1a1a1a');
        doc.text(proposal.additional_details, margin, doc.y, { width: contentWidth, align: 'justify' });
        doc.moveDown(1);
      }

      // ===== FOOTER SIGNATURE =====
      doc.moveDown(1.5);
      doc.moveTo(margin, doc.y).lineTo(margin + 180, doc.y).stroke('#000');
      doc.fontSize(8).font('Helvetica').fillColor('#000').text('Assinatura Roda Bem Turismo', margin, doc.y + 2);

      // Footer info
      doc.fontSize(7).font('Helvetica').fillColor('#999');
      const footerText = proposal.client_id 
        ? `Cliente registrado no sistema (ID: ${proposal.client_id.slice(-8)}). Proposta válida por 7 dias.`
        : 'Esta é uma proposta comercial válida por 7 dias. Sujeito à aceitação e confirmação.';
      doc.text(footerText, margin, pageHeight - 20, {
        width: contentWidth,
        align: 'center'
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function capitalizeLocation(location: string): string {
  const map: Record<string, string> = {
    'presencial': 'Presencial',
    'remoto': 'Remoto (Home Office)',
    'hibrido': 'Híbrido (Presencial + Remoto)'
  };
  return map[location] || location;
}

function getMonthName(monthIndex: number): string {
  const months = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  return months[monthIndex];
}
