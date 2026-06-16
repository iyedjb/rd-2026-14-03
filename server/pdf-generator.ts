import PDFDocument from 'pdfkit';
import type { Destination, Bus } from '@shared/schema';

interface PassengerData {
  client_id: string;
  client_name: string;
  client?: {
    cpf?: string;
    rg?: string;
    birthdate?: Date | string;
    departure_location?: string;
  };
  seat_number?: string;
  is_child?: boolean;
  child_data?: {
    cpf?: string;
    rg?: string;
    birthdate?: Date | string;
    relationship?: string;
  };
  passenger_type?: string;
}

// Calculate age from birthdate - returns age in years
function calculateAge(birthdate: Date | string | undefined): number {
  if (!birthdate) return 99; // If no birthdate, treat as adult
  const birth = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// Check if a companion/child is under 14 (CHD) or 14+ (adult/solteiro)
function isUnder14(member: any): boolean {
  if (!member.is_child) return false;
  const birthdate = member.child_data?.birthdate;
  const age = calculateAge(birthdate);
  return age < 14;
}

function sanitizeTextForPDF(text: string): string {
  return text
    .replace(/[📊👥✈️✅❌⏳📄📅🔧📝📤💰]/g, '')
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[–—]/g, '-')
    .trim();
}

function addHeader(doc: PDFKit.PDFDocument, title: string, destination: any, bus: any | null, yPosition: number = 100) {
  doc.fillColor('#6CC24A').fontSize(18).font('Helvetica-Bold')
    .text('RODA BEM TURISMO', 50, 20);
  
  doc.fillColor('#6CC24A').fontSize(10).font('Helvetica')
    .text('Agência de Viagens e Turismo', 50, 38)
    .text('sua melhor companhia', 50, 48);
  
  doc.strokeColor('#6CC24A').lineWidth(1)
    .moveTo(50, 65)
    .lineTo(545, 65)
    .stroke();
  
  doc.fillColor('#000000').fontSize(20).font('Helvetica-Bold').text(title, 50, 80, { align: 'center' });
  
  doc.fontSize(12).font('Helvetica')
    .text(`Destino: ${destination.name} (${destination.country || 'N/A'})`, 50, yPosition);
  
  if (bus) {
    doc.text(`Ônibus: ${bus.name} - ${bus.type}`, 50, yPosition + 15);
  }
  
  const today = new Date().toLocaleDateString('pt-BR');
  doc.text(`Data: ${today}`, 50, yPosition + (bus ? 30 : 15));
  
  let currentY = yPosition + (bus ? 45 : 30);
  
  if (destination.guias) {
    doc.text(`Guias: ${destination.guias}`, 50, currentY);
    currentY += 15;
  }
  
  if (destination.o_motorista) {
    doc.text(`O Motorista: ${destination.o_motorista}`, 50, currentY);
    currentY += 15;
  }
  
  if (destination.nome_empresa_onibus) {
    doc.text(`Nome da Empresa de Ônibus: ${destination.nome_empresa_onibus}`, 50, currentY);
    currentY += 15;
  }
  
  return currentY;
}

function addFooter(doc: PDFKit.PDFDocument, pageNumber: number) {
  const pageHeight = doc.page.height;
  const footerY = pageHeight - 60;
  
  doc.strokeColor('#6CC24A').lineWidth(0.5).moveTo(50, footerY).lineTo(545, footerY).stroke();
  
  doc.fontSize(8).fillColor('#666666')
    .text('RODA BEM TURISMO | CNPJ: 27.643.750/0019-0 | Tel: (31) 99932-5441', 50, footerY + 10)
    .text('Email: contato@rodabemturismo.com | www.rodabemturismo.com', 50, footerY + 20);
  
  const today = new Date().toLocaleDateString('pt-BR');
  doc.text(`Página ${pageNumber}`, 450, footerY + 10)
    .text(`Gerado em ${today}`, 430, footerY + 20);
  
  doc.fillColor('#000000');
}

function drawTable(
  doc: PDFKit.PDFDocument,
  headers: string[],
  rows: string[][],
  startY: number,
  columnWidths: number[],
  rowColors?: (string | null)[]
) {
  const tableStartX = 50;
  const rowHeight = 25;
  const headerHeight = 30;
  let pageNumber = 1;
  
  doc.fillColor('#6CC24A').rect(tableStartX, startY, columnWidths.reduce((a, b) => a + b, 0), headerHeight).fill();
  
  doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold');
  let xPos = tableStartX;
  headers.forEach((header, i) => {
    doc.text(header, xPos + 5, startY + 10, { width: columnWidths[i] - 10, align: 'left' });
    xPos += columnWidths[i];
  });
  
  doc.fillColor('#000000').font('Helvetica');
  let currentY = startY + headerHeight;
  
  rows.forEach((row, rowIndex) => {
    if (currentY > doc.page.height - 100) {
      doc.addPage();
      pageNumber++;
      currentY = 50;
      addFooter(doc, pageNumber);
    }
    
    if (rowColors && rowColors[rowIndex]) {
      doc.fillColor(rowColors[rowIndex]!).rect(tableStartX, currentY, columnWidths.reduce((a, b) => a + b, 0), rowHeight).fill();
      doc.fillColor('#000000');
    }
    
    doc.strokeColor('#CCCCCC').lineWidth(0.5)
      .rect(tableStartX, currentY, columnWidths.reduce((a, b) => a + b, 0), rowHeight)
      .stroke();
    
    let xPos = tableStartX;
    row.forEach((cell, colIndex) => {
      doc.strokeColor('#CCCCCC').lineWidth(0.5)
        .moveTo(xPos, currentY)
        .lineTo(xPos, currentY + rowHeight)
        .stroke();
      
      doc.fontSize(9).text(cell || 'N/A', xPos + 5, currentY + 8, { 
        width: columnWidths[colIndex] - 10, 
        align: 'left',
        lineBreak: false,
        ellipsis: true
      });
      xPos += columnWidths[colIndex];
    });
    
    currentY += rowHeight;
  });
  
  return currentY;
}

export async function generateEmbarquePDF(
  destination: Destination,
  bus: Bus | null,
  passengers: PassengerData[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      const yStart = addHeader(doc, 'LISTA DE EMBARQUE', destination, bus, 100);
      
      if (passengers.length > 0) {
        const sortedPassengers = [...passengers].sort((a, b) => {
          const nameA = sanitizeTextForPDF(a.client_name || '').toUpperCase();
          const nameB = sanitizeTextForPDF(b.client_name || '').toUpperCase();
          return nameA.localeCompare(nameB, 'pt-BR');
        });
        
        const tableData = sortedPassengers.map((passenger, index) => {
          const rgCpf = [];
          
          const getCpf = () => {
            if ((passenger.is_child || passenger.passenger_type === 'companion') && passenger.child_data) {
              return passenger.child_data.cpf || 'N/A';
            }
            return passenger.client?.cpf || 'N/A';
          };
          
          const getRg = () => {
            if ((passenger.is_child || passenger.passenger_type === 'companion') && passenger.child_data) {
              return passenger.child_data.rg || 'N/A';
            }
            return passenger.client?.rg || 'N/A';
          };
          
          const cpf = getCpf();
          const rg = getRg();
          
          if (rg !== 'N/A') rgCpf.push(`RG: ${rg}`);
          if (cpf !== 'N/A') rgCpf.push(`CPF: ${cpf}`);
          const rgCpfText = rgCpf.length > 0 ? rgCpf.join(', ') : 'N/A';
          
          return [
            (index + 1).toString(),
            sanitizeTextForPDF(passenger.client_name || 'Nome não informado'),
            rgCpfText,
            passenger.seat_number || 'S/N',
            passenger.client?.departure_location || 'N/A',
          ];
        });
        
        drawTable(
          doc,
          ['N°', 'NOME', 'RG/CPF', 'POLT.', 'EMBARQUE'],
          tableData,
          yStart + 20,
          [40, 150, 120, 60, 120]
        );
      } else {
        doc.fontSize(12).fillColor('#999999')
          .text('Nenhum passageiro registrado ainda.', 50, yStart + 40, { align: 'center' });
      }
      
      addFooter(doc, 1);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export async function generateMotoristaPDF(
  destination: Destination,
  bus: Bus | null,
  passengers: PassengerData[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      const yStart = addHeader(doc, 'LISTA DO MOTORISTA', destination, bus, 100);
      
      doc.fontSize(10).fillColor('#666666')
        .text(`Total de passageiros: ${passengers.length}`, 50, yStart);
      
      if (passengers.length > 0) {
        const sortedPassengers = [...passengers].sort((a, b) => {
          const nameA = sanitizeTextForPDF(a.client_name || '');
          const nameB = sanitizeTextForPDF(b.client_name || '');
          return nameA.localeCompare(nameB, 'pt-BR');
        });
        
        const tableData = sortedPassengers.map((passenger, index) => {
          const getCpf = () => {
            if (passenger.is_child && passenger.child_data) {
              return passenger.child_data.cpf || 'N/A';
            }
            return passenger.client?.cpf || 'N/A';
          };
          
          const getRg = () => {
            if (passenger.is_child && passenger.child_data) {
              return passenger.child_data.rg || 'N/A';
            }
            return passenger.client?.rg || 'N/A';
          };
          
          return [
            (index + 1).toString(),
            sanitizeTextForPDF(passenger.client_name || 'Nome não informado'),
            getCpf(),
            getRg(),
          ];
        });
        
        drawTable(
          doc,
          ['#', 'Nome Completo', 'CPF', 'RG'],
          tableData,
          yStart + 20,
          [40, 200, 130, 120]
        );
      } else {
        doc.fontSize(12).fillColor('#999999')
          .text('Nenhum passageiro registrado ainda.', 50, yStart + 40, { align: 'center' });
      }
      
      addFooter(doc, 1);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export async function generateHotelPDF(
  destination: Destination,
  bus: Bus | null,
  passengers: PassengerData[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      const yStart = addHeader(doc, 'LISTA PARA HOTEL', destination, bus, 100);
      
      doc.fontSize(10).fillColor('#666666')
        .text(`Total de hóspedes: ${passengers.length}`, 50, yStart);
      
      if (passengers.length > 0) {
        const familyGroups = new Map<string, PassengerData[]>();
        
        passengers.forEach((passenger) => {
          const clientId = passenger.client_id;
          if (!familyGroups.has(clientId)) {
            familyGroups.set(clientId, []);
          }
          familyGroups.get(clientId)?.push(passenger);
        });
        
        // SPECIAL OVERRIDE: Monte Verde 12/12 - Room overrides
        const destNameNoSpaces = (destination.name || '').toLowerCase().replace(/\s+/g, '');
        if (destNameNoSpaces.includes('monteverde') && destNameNoSpaces.includes('12/12')) {
          console.log('[HOTEL PDF SERVER] Applying Monte Verde 12/12 room overrides...');
          
          const entries = Array.from(familyGroups.entries());
          
          // OVERRIDE 1: CELSO + LUCINEIA = CASAL
          let celsoGroupKey: string | null = null;
          let lucineiaGroupKey: string | null = null;
          
          for (const [key, members] of entries) {
            for (const member of members) {
              const name = (member.client_name || '').toUpperCase();
              if (name.includes('CELSO') && name.includes('CAMPOLINA') && name.includes('LEROY')) {
                celsoGroupKey = key;
              }
              if (name.includes('LUCINEIA') && name.includes('CAMPOLINA')) {
                lucineiaGroupKey = key;
              }
            }
          }
          
          if (celsoGroupKey && lucineiaGroupKey && celsoGroupKey !== lucineiaGroupKey) {
            const lucineiaMembers = familyGroups.get(lucineiaGroupKey) || [];
            const celsoMembers = familyGroups.get(celsoGroupKey) || [];
            
            const lucineiaMembersAsSpouse = lucineiaMembers.map(member => ({
              ...member,
              is_child: true,
              child_data: { 
                cpf: member.client?.cpf, 
                rg: member.client?.rg, 
                birthdate: member.client?.birthdate 
              }
            }));
            
            familyGroups.set(celsoGroupKey, [...celsoMembers, ...lucineiaMembersAsSpouse]);
            familyGroups.delete(lucineiaGroupKey);
            console.log('[HOTEL PDF SERVER] Merged LUCINEIA into CELSO group as CASAL');
          }
          
          // OVERRIDE 2: Add Alice Rezende Oliveira Paiva to Daniel/Rosimeire = CASAL + CHD
          let danielGroupKey: string | null = null;
          
          for (const [key, members] of entries) {
            for (const member of members) {
              const name = (member.client_name || '').toUpperCase();
              if (name.includes('DANIEL') && name.includes('PAIVA')) {
                danielGroupKey = key;
              }
            }
          }
          
          if (danielGroupKey) {
            const danielMembers = familyGroups.get(danielGroupKey) || [];
            const aliceExists = danielMembers.some((m: any) => 
              (m.client_name || '').toUpperCase().includes('ALICE') && 
              (m.client_name || '').toUpperCase().includes('REZENDE')
            );
            
            if (!aliceExists) {
              const aliceChild = {
                client_name: 'Alice Rezende Oliveira Paiva',
                is_child: true,
                child_data: {
                  cpf: 'N/A',
                  rg: 'N/A',
                  birthdate: '2021-09-21',
                },
                client: null,
                client_id: danielGroupKey,
              };
              
              familyGroups.set(danielGroupKey, [...danielMembers, aliceChild as any]);
              console.log('[HOTEL PDF SERVER] Added Alice to Daniel/Rosimeire group');
            }
          }
          
          // OVERRIDE 3: ISIS joins JULIENE/MAGNA
          const entriesUpdated = Array.from(familyGroups.entries());
          let isisGroupKey: string | null = null;
          let julieneGroupKey: string | null = null;
          
          for (const [key, members] of entriesUpdated) {
            for (const member of members) {
              const name = (member.client_name || '').toUpperCase();
              if (name.includes('ISIS') && name.includes('CAMPOLINA') && name.includes('COUTINHO')) {
                isisGroupKey = key;
              }
              if (name.includes('JULIENE') && name.includes('GOMES')) {
                julieneGroupKey = key;
              }
            }
          }
          
          if (isisGroupKey && julieneGroupKey && isisGroupKey !== julieneGroupKey) {
            const isisMembers = familyGroups.get(isisGroupKey) || [];
            const julieneMembers = familyGroups.get(julieneGroupKey) || [];
            
            const isisMembersAsChildren = isisMembers.map(member => ({
              ...member,
              child_data: { 
                cpf: member.client?.cpf, 
                rg: member.client?.rg, 
                birthdate: member.client?.birthdate 
              }
            }));
            
            familyGroups.set(julieneGroupKey, [...julieneMembers, ...isisMembersAsChildren]);
            familyGroups.delete(isisGroupKey);
            console.log('[HOTEL PDF SERVER] Merged ISIS into JULIENE/MAGNA group');
          }
          
          // OVERRIDE 4: Find Mirtes group for custom room type
          let mirtesGroupKey: string | null = null;
          const entriesFinal = Array.from(familyGroups.entries());
          
          for (const [key, members] of entriesFinal) {
            for (const member of members) {
              const name = (member.client_name || '').toUpperCase();
              if (name.includes('MIRTES') && name.includes('EMILIANO')) {
                mirtesGroupKey = key;
              }
            }
          }
          
          // Store custom room type labels
          const customRoomTypes = new Map<string, string>();
          
          if (danielGroupKey) {
            customRoomTypes.set(danielGroupKey, 'Casal + CHD (4anos)');
          }
          if (julieneGroupKey) {
            customRoomTypes.set(julieneGroupKey, 'Dupla + CHD (6 Anos)');
          }
          if (mirtesGroupKey) {
            customRoomTypes.set(mirtesGroupKey, 'Casal + Solteiro');
          }
          
          (familyGroups as any)._customRoomTypes = customRoomTypes;
        }
        
        const customRoomTypes = (familyGroups as any)._customRoomTypes as Map<string, string> | undefined;
        
        const sortedFamiliesWithKeys = Array.from(familyGroups.entries()).sort((a, b) => {
          const parent_a = a[1].find((p: any) => !p.is_child) || a[1][0];
          const parent_b = b[1].find((p: any) => !p.is_child) || b[1][0];
          const nameA = sanitizeTextForPDF(parent_a.client_name || '').toUpperCase();
          const nameB = sanitizeTextForPDF(parent_b.client_name || '').toUpperCase();
          return nameA.localeCompare(nameB, 'pt-BR');
        });
        
        const sortedFamilies = sortedFamiliesWithKeys.map(([key, members]) => ({
          key,
          members
        }));
        
        const getRoomType = (familySize: number, familyMembers: any[]): string => {
          const hasSpouse = familyMembers.some((m: any) => 
            m.is_child && m.child_data?.relationship === 'cônjuge'
          );
          
          // Only count as CHD if they are under 14 years old AND are a child relationship (filho/filha)
          const isChildRelationship = (m: any) => 
            m._isOverrideChild || (m.is_child && (m.child_data?.relationship === 'filho(a)' || m.child_data?.relationship === 'filho' || m.child_data?.relationship === 'filha'));
          
          // Count children under 14 (true CHD)
          const chdCount = familyMembers.filter((m: any) => 
            isChildRelationship(m) && isUnder14(m)
          ).length;
          
          // Count adults (14+) who are children by relationship but adults by age
          const adultChildrenCount = familyMembers.filter((m: any) => 
            isChildRelationship(m) && !isUnder14(m)
          ).length;
          
          // Total adults = main client + spouse (if any) + adult children (14+)
          const mainAdults = familyMembers.filter((m: any) => !m.is_child).length;
          const spouseCount = hasSpouse ? 1 : 0;
          const totalAdults = mainAdults + spouseCount + adultChildrenCount;
          
          if (familySize === 1) return 'SINGLE';
          
          if (familySize === 2) {
            if (hasSpouse && chdCount === 0) return 'CASAL';
            if (chdCount === 1) return 'DUPLO (1 CHD)';
            return 'DUPLO SOLTEIRO';
          }
          
          if (familySize === 3) {
            if (hasSpouse && chdCount === 1) return 'CASAL + CHD';
            if (hasSpouse && chdCount === 0 && adultChildrenCount === 1) return 'CASAL + ADULTO';
            if (hasSpouse && chdCount === 0) return 'TRIPLO CASAL';
            if (chdCount > 0) return `TRIPLO SOLTEIRO + ${chdCount}CHD`;
            return 'TRIPLO SOLTEIRO';
          }
          
          if (familySize === 4) {
            if (hasSpouse && chdCount === 2) return 'CASAL + 2CHD';
            if (hasSpouse && chdCount === 1 && adultChildrenCount === 1) return 'CASAL + CHD + ADULTO';
            if (hasSpouse && chdCount === 1) return 'CASAL + CHD + SOLTEIRO';
            if (hasSpouse && chdCount === 0 && adultChildrenCount === 2) return 'CASAL + 2 ADULTOS';
            if (hasSpouse && chdCount === 0 && adultChildrenCount > 0) return `CASAL + ${adultChildrenCount} ADULTO${adultChildrenCount > 1 ? 'S' : ''}`;
            if (hasSpouse && chdCount === 0) return 'QUADRUPLO CASAL';
            if (chdCount > 0) return `QUADRUPLO SOLTEIRO + ${chdCount}CHD`;
            return 'QUADRUPLO SOLTEIRO';
          }
          
          if (familySize >= 5) {
            if (hasSpouse && chdCount > 0 && adultChildrenCount > 0) return `CASAL + ${chdCount}CHD + ${adultChildrenCount} ADULTO${adultChildrenCount > 1 ? 'S' : ''}`;
            if (hasSpouse && chdCount > 0) return `CASAL + ${chdCount}CHD`;
            if (hasSpouse && adultChildrenCount > 0) return `CASAL + ${adultChildrenCount} ADULTO${adultChildrenCount > 1 ? 'S' : ''}`;
            if (chdCount > 0) return `${totalAdults}x SOLTEIRO + ${chdCount}CHD`;
            return `${familySize}x SOLTEIRO`;
          }
          
          return 'SINGLE';
        };
        
        const highlightColors = [
          '#90EE90', '#FFFF66', '#FF66FF', '#66CCFF', '#FFB266',
          '#CC99FF', '#FFCC66', '#66FFB2', '#FF99CC', '#99CCFF',
        ];
        
        const tableData: string[][] = [];
        const rowColors: (string | null)[] = [];
        let rowIndex = 0;
        
        sortedFamilies.forEach(({ key: familyKey, members: family }, familyIndex) => {
          family.sort((a, b) => {
            if (!a.is_child && b.is_child) return -1;
            if (a.is_child && !b.is_child) return 1;
            return 0;
          });
          
          const shouldApplyColor = family.length > 1;
          const color = shouldApplyColor ? highlightColors[familyIndex % highlightColors.length] : null;
          
          // Get room type for this family
          const customRoomType = customRoomTypes?.get(familyKey);
          const roomType = customRoomType || getRoomType(family.length, family);
          
          family.forEach((passenger, memberIndex) => {
            // DEBUG: Log child data
            if (passenger.is_child) {
              console.log('[HOTEL PDF DEBUG] Child:', passenger.client_name);
              console.log('  is_child:', passenger.is_child);
              console.log('  child_data exists:', !!passenger.child_data);
              console.log('  child_data.cpf:', passenger.child_data?.cpf);
              console.log('  child_data.birthdate:', passenger.child_data?.birthdate);
              console.log('  client.cpf:', passenger.client?.cpf);
            }
            
            const getBirthdate = () => {
              if (passenger.is_child && passenger.child_data) {
                return passenger.child_data.birthdate
                  ? new Date(passenger.child_data.birthdate).toLocaleDateString('pt-BR')
                  : 'N/A';
              }
              return passenger.client?.birthdate
                ? new Date(passenger.client.birthdate).toLocaleDateString('pt-BR')
                : 'N/A';
            };
            
            const getCpf = () => {
              if (passenger.is_child && passenger.child_data) {
                return passenger.child_data.cpf || 'N/A';
              }
              return passenger.client?.cpf || 'N/A';
            };
            
            const getRg = () => {
              if (passenger.is_child && passenger.child_data) {
                return passenger.child_data.rg || 'N/A';
              }
              return passenger.client?.rg || 'N/A';
            };
            
            tableData.push([
              (rowIndex + 1).toString(),
              sanitizeTextForPDF(passenger.client_name || 'Nome não informado'),
              getCpf(),
              getRg(),
              getBirthdate(),
              memberIndex === 0 ? roomType : '',
            ]);
            rowColors.push(color);
            rowIndex++;
          });
        });
        
        drawTable(
          doc,
          ['#', 'Nome Completo', 'CPF', 'RG', 'Nasc.', 'APTOS'],
          tableData,
          yStart + 20,
          [25, 140, 90, 80, 70, 85],
          rowColors
        );
      } else {
        doc.fontSize(12).fillColor('#999999')
          .text('Nenhum passageiro registrado ainda.', 50, yStart + 40, { align: 'center' });
      }
      
      addFooter(doc, 1);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
