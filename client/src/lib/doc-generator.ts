import { Document, Packer, Paragraph, TextRun, AlignmentType, UnderlineType, HeadingLevel } from "docx";
import { saveAs } from "file-saver";

export async function generateTravelAuthorizationDoc(data: {
  parentName: string;
  parentRg: string;
  parentCpf: string;
  parentAddress: string;
  parentAddressNumber: string;
  parentNeighborhood: string;
  parentCity: string;
  minorName: string;
  relationship: string;
  minorBirthdate: string;
  destination: string;
  companionName: string;
  companionRg: string;
}) {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch = 1440 twips
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: "AUTORIZAÇÃO DE VIAGEM NACIONAL PARA MENOR",
                bold: true,
                size: 28, // 14pt
                font: "Arial",
              }),
            ],
          }),
          
          new Paragraph({
            alignment: AlignmentType.BOTH,
            spacing: { line: 360, before: 200, after: 200 },
            children: [
              new TextRun({ text: "Eu, ", font: "Arial", size: 24 }),
              new TextRun({ text: (data.parentName || "___________________________________________").toUpperCase(), bold: true, font: "Arial", size: 24 }),
              new TextRun({ text: ", portador(a) da cédula de identidade RG nº ", font: "Arial", size: 24 }),
              new TextRun({ text: data.parentRg || "____________________", bold: true, font: "Arial", size: 24 }),
              new TextRun({ text: " e inscrito(a) no CPF/MF sob o nº ", font: "Arial", size: 24 }),
              new TextRun({ text: data.parentCpf || "______________________", bold: true, font: "Arial", size: 24 }),
              new TextRun({ text: ", residente e domiciliado(a) na ", font: "Arial", size: 24 }),
              new TextRun({ text: data.parentAddress || "___________________________________________", font: "Arial", size: 24 }),
              new TextRun({ text: ", nº ", font: "Arial", size: 24 }),
              new TextRun({ text: data.parentAddressNumber || "______", font: "Arial", size: 24 }),
              new TextRun({ text: ", bairro ", font: "Arial", size: 24 }),
              new TextRun({ text: data.parentNeighborhood || "________________", font: "Arial", size: 24 }),
              new TextRun({ text: ", na cidade de ", font: "Arial", size: 24 }),
              new TextRun({ text: data.parentCity || "__________________________", font: "Arial", size: 24 }),
              new TextRun({ text: ", na qualidade de ", font: "Arial", size: 24 }),
              new TextRun({ text: "PAI/MÃE/RESPONSÁVEL LEGAL", bold: true, font: "Arial", size: 24 }),
              new TextRun({ text: ", AUTORIZO o(a) menor ", font: "Arial", size: 24 }),
              new TextRun({ text: (data.minorName || "___________________________________________").toUpperCase(), bold: true, font: "Arial", size: 24 }),
              new TextRun({ text: ", nascido(a) em ", font: "Arial", size: 24 }),
              new TextRun({ text: data.minorBirthdate || "____/____/________", bold: true, font: "Arial", size: 24 }),
              new TextRun({ text: ", a viajar para ", font: "Arial", size: 24 }),
              new TextRun({ text: (data.destination || "__________________________").toUpperCase(), bold: true, font: "Arial", size: 24 }),
              new TextRun({ text: ", acompanhado(a) de ", font: "Arial", size: 24 }),
              new TextRun({ text: (data.companionName || "___________________________________________").toUpperCase(), bold: true, font: "Arial", size: 24 }),
              new TextRun({ text: ", portador(a) do RG nº ", font: "Arial", size: 24 }),
              new TextRun({ text: data.companionRg || "____________________", bold: true, font: "Arial", size: 24 }),
              new TextRun({ text: ", com validade até o final da referida viagem.", font: "Arial", size: 24 }),
            ],
          }),

          new Paragraph({
            alignment: AlignmentType.BOTH,
            spacing: { before: 400, after: 400 },
            children: [
              new TextRun({ 
                text: "Esta autorização é concedida com base no art. 83, § 1º, alínea 'b', item 2, da Lei nº 8.069/90 (Estatuto da Criança e do Adolescente).",
                italics: true,
                size: 20,
                font: "Arial",
              }),
            ],
          }),

          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 800 },
            children: [
              new TextRun({ 
                text: `${data.parentCity || "____________________"}, ____ de ________________ de 20____.`,
                font: "Arial",
                size: 24,
              }),
            ],
          }),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 1200 },
            children: [
              new TextRun({ text: "__________________________________________________________", font: "Arial", size: 24 }),
            ],
          }),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: (data.parentName || "Assinatura do Responsável").toUpperCase(), bold: true, font: "Arial", size: 20 }),
            ],
          }),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "Assinatura do Pai, Mãe ou Responsável Legal", font: "Arial", size: 18 }),
            ],
          }),
          
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 400 },
            children: [
              new TextRun({ text: "(Reconhecer firma em cartório)", italics: true, bold: true, size: 18, font: "Arial" }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Autorizacao_Viagem_${data.minorName?.replace(/\s+/g, '_') || 'Menor'}.docx`);
}
