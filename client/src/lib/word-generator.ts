import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, VerticalAlign } from "docx";
import { saveAs } from "file-saver";
import { format } from "date-fns";

async function createHeader(title: string, destination: any, bus: any) {
  const children = [];

  // Title
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 48,
          color: "000000",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 400 },
    })
  );

  // Info details
  const details = [
    { label: "Destino: ", value: `${destination.name} (${destination.country || "Brasil"})` },
    { label: "Ônibus: ", value: bus.name },
    { label: "Data: ", value: format(new Date(), "dd/MM/yyyy") },
  ];

  details.forEach(detail => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: detail.label, size: 24 }),
          new TextRun({ text: detail.value, size: 24 }),
        ],
        spacing: { after: 100 },
      })
    );
  });

  return children;
}

function createTable(headers: string[], rows: any[][]) {
  const headerBgColor = "76c157"; // Green from the image

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map(h => new TableCell({
          shading: { fill: headerBgColor },
          children: [
            new Paragraph({
              children: [new TextRun({ text: h.toUpperCase(), bold: true, color: "FFFFFF", size: 20 })],
              alignment: AlignmentType.CENTER,
            })
          ],
          verticalAlign: VerticalAlign.CENTER,
        })),
      }),
      ...rows.map(row => new TableRow({
        children: row.map(cell => new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: cell.toString(), size: 20 })], alignment: AlignmentType.CENTER })],
          verticalAlign: VerticalAlign.CENTER,
        })),
      })),
    ],
  });
}

export async function generateEmbarqueWord(destination: any, bus: any, passengers: any[]) {
  const headerChildren = await createHeader("LISTA DE EMBARQUE", destination, bus);
  
  const sortedPassengers = [...passengers].sort((a, b) => (a.client_name || "").localeCompare(b.client_name || ""));
  
  const rows = sortedPassengers.map((p, index) => {
    const getCpfOrRg = () => {
      if ((p.is_child || p.passenger_type === 'companion') && p.child_data) {
        return p.child_data.cpf || p.child_data.rg || "-";
      }
      return p.client?.cpf || p.client?.rg || "-";
    };

    return [
      (index + 1).toString(),
      p.client_name || "",
      getCpfOrRg(),
      p.seat_number.toString(),
      p.client?.departure_location || "-"
    ];
  });

  const doc = new Document({
    sections: [{
      children: [
        ...headerChildren,
        new Paragraph({ spacing: { before: 200 } }),
        createTable(["N°", "Nome", "RG/CPF", "Polt.", "Embarque"], rows),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Embarque_${destination.name.replace(/\s+/g, '_')}.docx`);
}

export async function generateListaCompletaWord(destination: any, bus: any, passengers: any[]) {
  const headerChildren = await createHeader("LISTA COMPLETA", destination, bus);
  
  const sortedPassengers = [...passengers].sort((a, b) => (a.client_name || "").localeCompare(b.client_name || ""));
  
  const rows = sortedPassengers.map((p, index) => {
    const getCpfOrRg = () => {
      if ((p.is_child || p.passenger_type === 'companion') && p.child_data) {
        return p.child_data.cpf || p.child_data.rg || "-";
      }
      return p.client?.cpf || p.client?.rg || "-";
    };

    return [
      (index + 1).toString(),
      p.client_name || "",
      getCpfOrRg(),
      p.seat_number.toString(),
      p.client?.phone || "-"
    ];
  });

  const doc = new Document({
    sections: [{
      children: [
        ...headerChildren,
        new Paragraph({ spacing: { before: 200 } }),
        createTable(["N°", "Nome", "RG/CPF", "Polt.", "Telefone"], rows),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Lista_Completa_${destination.name.replace(/\s+/g, '_')}.docx`);
}

export async function generateMotoristaWord(destination: any, bus: any, passengers: any[]) {
  const headerChildren = await createHeader("LISTA MOTORISTA", destination, bus);
  
  const sortedPassengers = [...passengers].sort((a, b) => (a.client_name || "").localeCompare(b.client_name || ""));
  
  const rows = sortedPassengers.map((p, index) => {
    const getCpfOrRg = () => {
      if ((p.is_child || p.passenger_type === 'companion') && p.child_data) {
        return p.child_data.cpf || p.child_data.rg || "-";
      }
      return p.client?.cpf || p.client?.rg || "-";
    };

    return [
      (index + 1).toString(),
      p.client_name || "",
      getCpfOrRg(),
      p.seat_number.toString(),
      p.client?.departure_location || "-"
    ];
  });

  const doc = new Document({
    sections: [{
      children: [
        ...headerChildren,
        new Paragraph({ spacing: { before: 200 } }),
        createTable(["N°", "Nome", "RG/CPF", "Polt.", "Embarque"], rows),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Motorista_${destination.name.replace(/\s+/g, '_')}.docx`);
}

export async function generateHotelWord(destination: any, bus: any, passengers: any[]) {
  const headerChildren = await createHeader("LISTA HOTEL", destination, bus);
  
  const sortedPassengers = [...passengers].sort((a, b) => (a.client_name || "").localeCompare(b.client_name || ""));
  
  const rows = sortedPassengers.map((p, index) => {
    const getCpfOrRg = () => {
      if ((p.is_child || p.passenger_type === 'companion') && p.child_data) {
        return p.child_data.cpf || p.child_data.rg || "-";
      }
      return p.client?.cpf || p.client?.rg || "-";
    };

    return [
      (index + 1).toString(),
      p.client_name || "",
      getCpfOrRg(),
      p.seat_number.toString()
    ];
  });

  const doc = new Document({
    sections: [{
      children: [
        ...headerChildren,
        new Paragraph({ spacing: { before: 200 } }),
        createTable(["N°", "Nome", "RG/CPF", "Polt."], rows),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Hotel_${destination.name.replace(/\s+/g, '_')}.docx`);
}

