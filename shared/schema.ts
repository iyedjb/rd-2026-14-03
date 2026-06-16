import { z } from "zod";

// User schema for admin role management
export const userSchema = z.object({
  id: z.string(), // Firebase UID
  email: z.string().email(),
  role: z.enum(["admin", "vadmin"]),
  host_plan_expiration_date: z.date().optional(), // When the host plan expires
  created_at: z.date(),
  updated_at: z.date(),
});

export const insertUserSchema = userSchema.omit({
  id: true, // Auto-generated (Firebase UID)
  created_at: true,
  updated_at: true,
});

export const updateUserSchema = userSchema.omit({
  id: true,
  created_at: true, // Never updated
}).partial();

// Phone number schema for multiple phones with labels
export const phoneNumberSchema = z.object({
  label: z.string().min(1, "Nome/etiqueta é obrigatório"),
  number: z.string().min(1, "Número é obrigatório"),
});

// Down payment split schema for multiple payment methods
export const downPaymentSplitSchema = z.object({
  method: z.enum(["pix", "dinheiro", "credito", "debito", "boleto", "link", "credito_viagens_anteriores", "credito_viagens_interiores"]),
  amount: z.number().positive("Valor deve ser maior que zero"),
});

// Client schema with normalized search field
export const clientSchema = z.object({
  id: z.string(),
  first_name: z.string().min(1, "Nome é obrigatório"),
  last_name: z.string().min(1, "Sobrenome é obrigatório"),
  full_name_search: z.string(), // Normalized search field (lowercase)
  birthdate: z.date(),
  cpf: z.string().min(1, "CPF é obrigatório").refine(
    (cpf) => {
      const cleaned = cpf.replace(/\D/g, '');
      return cleaned.length === 11 && cleaned !== '00000000000' && cleaned !== '11111111111' && cleaned !== '22222222222' && cleaned !== '33333333333' && cleaned !== '44444444444' && cleaned !== '55555555555' && cleaned !== '66666666666' && cleaned !== '77777777777' && cleaned !== '88888888888' && cleaned !== '99999999999';
    },
    "CPF inválido"
  ), // Will be encrypted
  rg: z.string().optional(),
  civil_status: z.enum(["solteiro", "casado", "divorciado", "viuvo"]).optional(),
  spouse_name: z.string().optional(), // Name of spouse (shown only if civil_status is "casado")
  nationality: z.string().optional(),
  gender: z.enum(["masculino", "feminino", "outro", "nao_informar"]).optional(),
  phone: z.string().min(1, "Telefone é obrigatório"), // Legacy field for backward compatibility
  phone_numbers: z.array(phoneNumberSchema).optional(), // New multi-phone field
  email: z.string().email().or(z.literal("")).optional(),
  profession: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(), // CEP
  client_preferences: z.string().optional(), // Client preferences/notes (e.g., seat preferences, allergies, special needs)
  referred_by: z.string().optional(), // ID of client who referred this client
  destination: z.string().optional(), // Destination (required for agencia, optional for operadora)
  seat_number: z.string().optional(), // Selected seat number on the bus
  quantity: z.number().optional(),
  duration: z.number().min(1, "Duração é obrigatória"),
  departure_location: z.string().optional(), // Local de embarque
  return_location: z.string().optional(), // Local de retorno
  travel_itinerary: z.string().optional(), // Roteiro de viagem
  inclusions: z.string().optional(),
  travel_price: z.number().positive("Preço da viagem deve ser maior que zero").optional(),
  travel_level: z.enum(["ouro", "prata", "bronze"]).optional(), // Travel level tier (gold/silver/bronze)
  down_payment: z.number().nonnegative("Valor da entrada deve ser maior ou igual a zero").optional(), // Entrada
  down_payment_method: z.enum(["pix", "dinheiro", "credito", "debito", "boleto", "link", "credito_viagens_anteriores", "credito_viagens_interiores"]).optional(), // Método de pagamento da entrada
  down_payment_splits: z.array(downPaymentSplitSchema).optional(), // Multiple payment methods for entrada
  used_credit_id: z.string().optional(), // ID of the credit used for entrada (when down_payment_method is "credito_viagens_anteriores")
  first_payment_discount_type: z.enum(["none", "3", "5", "custom"]).optional(), // First payment discount
  first_payment_discount_value: z.number().nonnegative("Desconto deve ser maior ou igual a zero").optional(), // Custom discount percentage or fixed amount
  first_payment_discount_currency: z.enum(["percentage", "fixed"]).default("percentage").optional(), // Whether discount is percentage (%) or fixed (R$)
  installments_count: z.number().positive("Número de parcelas deve ser maior que zero").optional(), // Número de parcelas
  installment_due_date: z.string().optional(), // Vencimento das parcelas
  first_installment_due_date: z.string().optional(), // Vencimento da primeira parcela
  travel_date: z.date().optional(),
  payment_method: z.enum(["avista", "pix", "crediario_agencia", "credito_banco", "boleto", "link", "brinde"]).optional(),
  is_brinde: z.boolean().default(false), // Whether this is a gift/free trip for the client
  brinde_value: z.number().nonnegative().optional(), // The amount that was gifted (client's portion)
  avista_payment_type: z.enum(["pix", "dinheiro", "debito", "credito"]).optional(), // Sub-type when payment_method is "avista"
  contract_type: z.enum(["normal", "bate_volta"]).default("normal"),
  client_type: z.enum(["agencia", "operadora"]).default("agencia"), // Type of client: agency destinations or operator
  operator_name: z.enum(["azul_viagens", "cvc", "rex_tour"]).optional(), // Operator name if client_type is operadora (Note: Win rate for operators is 12%)
  // Discount approval tracking fields
  discount_approval_request_id: z.string().optional(), // Link to the approval request
  discount_approved_by_vadmin_name: z.string().optional(), // Name of vadmin who approved custom discount
  discount_approved_at: z.date().optional(), // When the custom discount was approved
  // Client approval workflow fields
  approval_token: z.string().optional(), // Unique token for approval link (auto-generated)
  approval_status: z.enum(["pending", "approved", "expired"]).default("pending"),
  approval_date: z.date().optional(), // When client approved the travel details
  approval_expires_at: z.date().optional(), // When the approval link expires
  link_opened_at: z.date().optional(), // When the client first opened the approval link
  // Creator tracking
  created_by_email: z.string().email().or(z.literal("")).optional(),
  created_by_name: z.string().optional(),
  // Cancellation fields
  is_cancelled: z.boolean().default(false),
  cancelled_at: z.date().optional(),
  cancellation_reason: z.string().optional(),
  cancelled_by_email: z.string().optional(),
  cancelled_by_name: z.string().optional(),
  // Soft delete fields - clients are not permanently deleted, they stay for 30 days
  is_deleted: z.boolean().default(false),
  deleted_at: z.date().optional(),
  deleted_by_email: z.string().optional(),
  deleted_by_name: z.string().optional(),
  permanent_delete_at: z.date().optional(), // When the client will be permanently removed (30 days after deletion)
  created_at: z.date(),
  updated_at: z.date(),
});

export const baseInsertClientSchema = clientSchema.omit({
  id: true,
  full_name_search: true, // Auto-generated
  discount_approval_request_id: true, // Auto-set when approval is created
  discount_approved_by_vadmin_name: true, // Auto-set on approval
  discount_approved_at: true, // Auto-set on approval
  approval_token: true, // Auto-generated
  approval_status: true, // Auto-generated (defaults to "pending")
  approval_date: true, // Auto-generated when approved
  approval_expires_at: true, // Auto-generated when approval link is created
  link_opened_at: true, // Auto-set when client opens the link
  created_by_email: true, // Auto-set on creation
  created_by_name: true, // Auto-set on creation
  // Cancellation fields - auto-set when cancellation occurs
  is_cancelled: true,
  cancelled_at: true,
  cancellation_reason: true,
  cancelled_by_email: true,
  cancelled_by_name: true,
  // Soft delete fields - auto-set when deletion occurs
  is_deleted: true,
  deleted_at: true,
  deleted_by_email: true,
  deleted_by_name: true,
  permanent_delete_at: true,
  created_at: true,
  updated_at: true,
});

// Helper to accept both string and date, converting date to string
const flexibleDateString = z.union([z.string(), z.date()]).transform(val => 
  val instanceof Date ? val.toISOString().split('T')[0] : (val || '')
).optional();

// Update schema for clients - includes creator fields for admin updates
export const updateClientSchema = baseInsertClientSchema.extend({
  created_by_email: z.string().email().or(z.literal("")).optional(),
  created_by_name: z.string().optional(),
  installment_due_date: flexibleDateString,
  first_installment_due_date: flexibleDateString,
}).partial();

export const insertClientSchema = baseInsertClientSchema.refine(
  (data) => {
    // For agency clients, destination is required
    if (data.client_type === 'agencia' && !data.destination) {
      return false;
    }
    // For operator clients, destination and operator_name are required
    if (data.client_type === 'operadora' && (!data.destination || !data.operator_name)) {
      return false;
    }
    return true;
  },
  (data) => {
    if (data.client_type === 'agencia' && !data.destination) {
      return {
        message: "Destino é obrigatório para clientes da agência",
        path: ["destination"],
      };
    }
    if (data.client_type === 'operadora' && !data.operator_name) {
      return {
        message: "Operadora é obrigatória para clientes de operadora",
        path: ["operator_name"],
      };
    }
    if (data.client_type === 'operadora' && !data.destination) {
      return {
        message: "Destino é obrigatório para clientes de operadora",
        path: ["destination"],
      };
    }
    return {
      message: "Dados inválidos",
      path: [],
    };
  }
);

// Child schema
export const childSchema = z.object({
  id: z.string(),
  client_id: z.string(),
  name: z.string().min(1, "Nome é obrigatório"),
  birthdate: z.date(),
  phone: z.string().optional(), // Phone number for companion
  rg: z.string().optional(),
  cpf: z.string().optional(), // Will be encrypted
  passport_number: z.string().optional(), // Will be encrypted
  relationship: z.enum(["filho", "filha", "pai", "mae", "sogro", "sogra", "enteado", "enteada", "neto", "neta", "cônjuge", "noivo", "namorado", "irmao", "irma", "outro"]),
  price: z.number().nonnegative("Preço deve ser maior ou igual a zero").optional(),
  seat_number: z.string().optional(), // Selected seat number on the bus
});

export const insertChildSchema = childSchema.omit({
  id: true,
});

// Client approval schema for tracking approval events
export const clientApprovalSchema = z.object({
  id: z.string(),
  client_id: z.string(),
  approval_token: z.string(),
  status: z.enum(["pending", "approved", "expired"]),
  approved_at: z.date().optional(),
  ip_address: z.string().optional(), // Track IP for security
  user_agent: z.string().optional(), // Track user agent for security
  created_at: z.date(),
  updated_at: z.date(),
});

export const insertClientApprovalSchema = clientApprovalSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// Client approval response schema - for when client submits their approval
export const clientApprovalResponseSchema = z.object({
  accepted: z.boolean(),
  client_signature: z.string().optional(), // Digital signature or name confirmation
  comments: z.string().optional(), // Optional comments from client
  terms_accepted: z.boolean(), // Must accept terms and conditions
  }).refine(
  (data) => !data.accepted || data.terms_accepted, 
  {
    message: "Termos e condições devem ser aceitos para aprovar a viagem",
    path: ["terms_accepted"]
  }
);

export type ClientApprovalResponse = z.infer<typeof clientApprovalResponseSchema>;

// Inactive Client schema - for customers who are currently inactive
export const inactiveClientSchema = z.object({
  id: z.string(),
  first_name: z.string().min(1, "Nome é obrigatório"),
  last_name: z.string().min(1, "Sobrenome é obrigatório"),
  full_name_search: z.string().optional(),
  birthdate: z.date().optional(),
  cpf: z.string().min(1, "CPF é obrigatório"),
  phone: z.string().optional(),
  email: z.string().email().or(z.literal("")).optional(),
  profession: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  notes: z.string().optional(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const insertInactiveClientSchema = inactiveClientSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  full_name_search: true,
});

export const updateInactiveClientSchema = insertInactiveClientSchema.partial();

export type InactiveClient = z.infer<typeof inactiveClientSchema>;
export type InsertInactiveClient = z.infer<typeof insertInactiveClientSchema>;
export type UpdateInactiveClient = z.infer<typeof updateInactiveClientSchema>;

// Report schema
export const monthlyReportSchema = z.object({
  id: z.string(),
  year: z.number(),
  month: z.number(),
  total_clients: z.number(),
  total_revenue: z.number(),
  generated_at: z.date(),
});

export type MonthlyReport = z.infer<typeof monthlyReportSchema>;

// Destination schema for admin-managed destinations
export const destinationSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Nome do destino é obrigatório"),
  description: z.string().optional(),
  country: z.string().min(1, "País é obrigatório"),
  price: z.number().nonnegative().optional(), // Optional for backward compatibility
  bus_id: z.string().optional(), // Reference to bus type
  periodo_viagem_inicio: z.date().optional(), // Travel period start date
  periodo_viagem_fim: z.date().optional(), // Travel period end date - destination expires after this
  embarque: z.string().optional(), // Departure details
  retorno: z.string().optional(), // Return details
  horario_saida: z.string().optional(), // Departure time (saida)
  horario_volta: z.string().optional(), // Return time (volta)
  transporte: z.string().optional(), // Transportation details
  hospedagem: z.string().optional(), // Accommodation details
  passeios_adicionais: z.string().optional(), // Additional tours (charged separately)
  operadora: z.enum(["azul_viagens", "cvc", "patria", "next_tour", "galaxia"]).optional(), // Tour operator/consolidator
  kids_policy: z.enum(["yes", "no"]).optional(), // "yes" = kids 5+ can choose seats, "no" = kids 5 and under cannot choose seats
  whatsapp_group_link: z.string().optional(), // WhatsApp group invite link for clients
  guias: z.string().optional(), // Guide names
  o_motorista: z.string().optional(), // Driver name(s) (1 to 2 drivers)
  nome_empresa_onibus: z.string().optional(), // Bus company name
  is_active: z.boolean().default(true),
  has_levels: z.boolean().default(false), // Whether this destination has tiered pricing (Ouro/Prata/Bronze)
  ouro_price: z.number().nonnegative().optional(), // Gold tier price
  prata_price: z.number().nonnegative().optional(), // Silver tier price
  bronze_price: z.number().nonnegative().optional(), // Bronze tier price
  is_black_friday: z.boolean().default(false), // Black Friday promotion flag
  black_friday_price: z.number().nonnegative().optional(), // Promotional Black Friday price
  black_friday_start: z.date().optional(), // Black Friday promotion start date
  black_friday_end: z.date().optional(), // Black Friday promotion end date
  // Cost fields for revenue calculations (Previsão de Recebimento / Fechamento)
  frete: z.number().nonnegative().optional(), // Transport/shipping cost
  custo_almoços: z.number().nonnegative().optional(), // Lunches cost
  custo_inclusos: z.number().nonnegative().optional(), // Inclusions/included items cost
  created_at: z.date(),
  updated_at: z.date(),
});

export const insertDestinationSchema = destinationSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type Destination = z.infer<typeof destinationSchema>;
export type InsertDestination = z.infer<typeof insertDestinationSchema>;

// Bus schema
export const busSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Nome do ônibus é obrigatório"),
  type: z.string().optional(),
  total_seats: z.number().min(1, "Número de assentos é obrigatório"),
  description: z.string().optional(),
  pdf_file_name: z.string().optional(),
  seat_layout: z.union([z.string(), z.record(z.any())]).optional(),
  is_active: z.boolean().default(true),
  created_at: z.date(),
  updated_at: z.date(),
});

export const insertBusSchema = busSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type Bus = z.infer<typeof busSchema>;
export type InsertBus = z.infer<typeof insertBusSchema>;

// Seat reservation schema
export const seatReservationSchema = z.object({
  id: z.string(),
  destination_id: z.string(),
  bus_id: z.string(),
  client_id: z.string(),
  client_name: z.string().optional(),
  seat_number: z.string(),
  status: z.string().optional(),
  is_reserved: z.boolean().default(true),
  reserved_at: z.date(),
  child_id: z.string().optional(),
  is_child: z.boolean().optional(),
});

export const insertSeatReservationSchema = seatReservationSchema.omit({
  id: true,
  is_reserved: true,
}).extend({
  reserved_at: z.date().optional(),
  is_reserved: z.boolean().optional().default(true),
});

export type SeatReservation = z.infer<typeof seatReservationSchema>;
export type InsertSeatReservation = z.infer<typeof insertSeatReservationSchema>;

// Parcela payment schema for partial payment distribution
export const parcelaPaymentSchema = z.object({
  parcela_id: z.string(),
  amount: z.number().positive(),
});

// Split payment schema for multiple payment methods
export const splitPaymentSchema = z.object({
  method: z.enum(["pix", "dinheiro", "credito", "debito", "boleto", "link", "credito_viagens_interiores"]),
  amount: z.number().positive(),
  card_brand: z.enum(["visa_master_cabal", "elo", "amex"]).optional(),
  installments: z.number().min(1).max(12).optional(),
  fee_amount: z.number().optional(),
  net_amount: z.number().optional(),
});

export type SplitPayment = z.infer<typeof splitPaymentSchema>;

// Receipt schema
export const receiptSchema = z.object({
  id: z.string(),
  client_id: z.string().optional(),
  parcela_id: z.string().optional(),
  amount: z.number().positive(),
  name: z.string().min(1, "Nome é obrigatório"),
  amount_in_words: z.string().min(1, "Valor por extenso é obrigatório"),
  reference: z.string().min(1, "Referência é obrigatória"),
  payment_method: z.enum(["pix", "dinheiro", "credito", "debito", "boleto", "link", "credito_viagens_interiores"]).optional(),
  card_brand: z.enum(["visa_master_cabal", "elo", "amex"]).optional(),
  installments: z.number().min(1).max(12).optional(),
  fee_amount: z.number().optional(),
  net_amount: z.number().optional(),
  payment_date: z.date(),
  destination_id: z.string().optional(),
  notes: z.string().optional(),
  seat_number: z.string().optional(),
  paid_to: z.string().optional(),
  parcela_payments: z.array(parcelaPaymentSchema).optional(), // For partial payment distribution
  split_payments: z.array(splitPaymentSchema).optional(), // For multiple payment methods
  created_at: z.date(),
  updated_at: z.date(),
});

export const insertReceiptSchema = receiptSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type Receipt = z.infer<typeof receiptSchema>;
export type InsertReceipt = z.infer<typeof insertReceiptSchema>;

// Parcela (installment) schema
export const parcelaSchema = z.object({
  id: z.string(),
  client_id: z.string(),
  client_name: z.string().optional(),
  client_phone: z.string().optional(),
  amount: z.number().nonnegative("Valor deve ser maior ou igual a zero"), // Current remaining amount (reduced after partial payments)
  original_amount: z.number().positive("Valor original deve ser maior que zero").optional(), // Original installment amount before any payments
  paid_amount: z.number().nonnegative().default(0), // Total amount paid so far on this parcela
  due_date: z.date(),
  installment_number: z.number().optional(),
  total_installments: z.number().optional(),
  is_paid: z.boolean().default(false),
  payment_method: z.enum(["pix", "dinheiro", "credito", "debito", "boleto", "link", "credito_viagens_interiores"]).optional(),
  paid_date: z.date().optional(),
  notes: z.string().optional(),
  status: z.enum(["pending", "paid", "overdue", "partial"]).default("pending"), // Added "partial" status
  receipt_id: z.string().optional(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const insertParcelaSchema = parcelaSchema.omit({
  id: true,
  status: true,
  created_at: true,
  updated_at: true,
}).extend({
  status: z.enum(["pending", "paid", "overdue", "partial"]).optional().default("pending"),
});

export type Parcela = z.infer<typeof parcelaSchema>;
export type InsertParcela = z.infer<typeof insertParcelaSchema>;

// Department schema
export const departmentSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Nome do departamento é obrigatório"),
  description: z.string().optional(),
  manager_name: z.string().optional(),
  responsible: z.string().optional(),
  order: z.number().optional(),
  subsectors: z.array(z.object({
    title: z.string(),
    description: z.string()
  })).optional(),
  is_active: z.boolean().default(true),
  created_at: z.date(),
  updated_at: z.date(),
});

export const insertDepartmentSchema = departmentSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type Department = z.infer<typeof departmentSchema>;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;

// Time record schema
export const timeRecordSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  user_email: z.string().optional(),
  user_name: z.string().optional(),
  date: z.union([z.date(), z.string()]),
  check_in: z.string().optional(),
  check_out: z.string().optional(),
  clock_in: z.union([z.date(), z.string(), z.null()]).optional(),
  clock_out: z.union([z.date(), z.string(), z.null()]).optional(),
  break_start: z.union([z.date(), z.string(), z.null()]).optional(),
  break_end: z.union([z.date(), z.string(), z.null()]).optional(),
  lunch_start: z.union([z.date(), z.string(), z.null()]).optional(),
  lunch_end: z.union([z.date(), z.string(), z.null()]).optional(),
  lunch_duration_minutes: z.number().optional(),
  break_duration_minutes: z.number().optional(),
  total_hours: z.number().optional(),
  notes: z.string().optional(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const insertTimeRecordSchema = timeRecordSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type TimeRecord = z.infer<typeof timeRecordSchema>;
export type InsertTimeRecord = z.infer<typeof insertTimeRecordSchema>;

// Facial verification schema
export const facialVerificationSessionSchema = z.object({
  id: z.string(),
  session_token: z.string().optional(),
  verification_token: z.string().optional(),
  user_id: z.string().optional(),
  user_email: z.string().optional(),
  user_name: z.string().optional(),
  time_record_id: z.string().optional(),
  expires_at: z.date().optional(),
  verified_at: z.date().optional(),
  facial_match_confidence: z.number().optional(),
  verification_method: z.string().optional(),
  verification_metadata: z.record(z.any()).optional(),
  photo_data_url: z.string().optional(),
  status: z.enum(["pending", "verified", "failed", "expired"]),
  created_at: z.date(),
  updated_at: z.date(),
});

export const insertFacialVerificationSessionSchema = facialVerificationSessionSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type FacialVerificationSession = z.infer<typeof facialVerificationSessionSchema>;
export type InsertFacialVerificationSession = z.infer<typeof insertFacialVerificationSessionSchema>;

// Financial transaction schema
export const financialTransactionSchema = z.object({
  id: z.string(),
  type: z.enum(["income", "expense"]),
  category: z.string().min(1, "Categoria é obrigatória"),
  description: z.string(),
  amount: z.number(),
  transaction_date: z.date(),
  payment_method: z.enum(["pix", "dinheiro", "credito", "debito", "boleto", "link", "credito_viagens_interiores"]),
  client_id: z.string().optional(),
  created_by_email: z.string().email(),
  created_by_name: z.string(),
  notes: z.string().optional(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const insertFinancialTransactionSchema = financialTransactionSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  created_by_email: true,
  created_by_name: true,
});

export type FinancialTransaction = z.infer<typeof financialTransactionSchema>;
export type InsertFinancialTransaction = z.infer<typeof insertFinancialTransactionSchema>;

// Contas a Pagar e a Receber (Bills/Accounts Payable/Receivable)
export const billSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  type: z.enum(["pagar", "receber"]), // pagar = payable, receber = receivable
  amount: z.number().positive("Valor deve ser maior que zero"),
  due_date: z.date(),
  status: z.enum(["pending", "paid", "overdue"]),
  category: z.string().optional(), // e.g., "Aluguel", "Internet", "Salário"
  created_by_email: z.string().email(),
  created_by_name: z.string(),
  payment_method: z.enum(["pix", "dinheiro", "credito", "debito", "boleto", "link", "credito_viagens_interiores"]).optional(),
  paid_at: z.date().optional(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const insertBillSchema = billSchema.omit({
  id: true,
  status: true, // Auto-set to "pending"
  created_by_email: true,
  created_by_name: true,
  paid_at: true,
  created_at: true,
  updated_at: true,
});

export type Bill = z.infer<typeof billSchema>;
export type InsertBill = z.infer<typeof insertBillSchema>;

// Prospect schema - for interested customers who haven't booked yet (cadastro)
export const prospectSchema = z.object({
  id: z.string(),
  first_name: z.string().min(1, "Nome é obrigatório"),
  last_name: z.string().min(1, "Sobrenome é obrigatório"),
  full_name_search: z.string().optional(),
  birthdate: z.date().optional(),
  cpf: z.string().min(1, "CPF é obrigatório"),
  rg: z.string().optional(),
  civil_status: z.enum(["solteiro", "casado", "divorciado", "viuvo"]).optional(),
  spouse_name: z.string().optional(),
  nationality: z.string().optional(),
  gender: z.enum(["masculino", "feminino", "outro", "nao_informar"]).optional(),
  phone: z.string().min(1, "Telefone é obrigatório"),
  phone_numbers: z.array(phoneNumberSchema).optional(),
  email: z.string().email().or(z.literal("")).optional(),
  profession: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  notes: z.string().optional(),
  interested_destinations: z.array(z.string()).optional(),
  companions: z.array(z.object({
    name: z.string().min(1, "Nome é obrigatório"),
    birthdate: z.date().optional(),
    phone: z.string().optional(),
    cpf: z.string().optional(),
    rg: z.string().optional(),
    passport_number: z.string().optional(),
    relationship: z.enum(["filho", "filha", "pai", "mae", "sogro", "sogra", "enteado", "enteada", "neto", "neta", "cônjuge", "noivo", "namorado", "irmao", "irma", "outro"]).optional(),
  })).optional(),
  status: z.enum(["novo", "em_contato", "convertido"]).default("novo"),
  converted_to_client_id: z.string().optional(),
  converted_at: z.date().optional(),
  from_client_id: z.string().optional(), // ID of existing client if prospect was created from a client
  created_by_email: z.string().email().or(z.literal("")).optional(),
  created_by_name: z.string().optional(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const insertProspectSchema = prospectSchema.omit({
  id: true,
  full_name_search: true,
  status: true,
  converted_to_client_id: true,
  converted_at: true,
  created_by_email: true,
  created_by_name: true,
  created_at: true,
  updated_at: true,
}).extend({
  from_client_id: z.string().optional(), // Allow from_client_id on insert
});

export const updateProspectSchema = prospectSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).partial();

export type Prospect = z.infer<typeof prospectSchema>;
export type InsertProspect = z.infer<typeof insertProspectSchema>;
export type UpdateProspect = z.infer<typeof updateProspectSchema>;

// Activity schema
export const activitySchema = z.object({
  id: z.string(),
  user_email: z.string().email(),
  user_id: z.string(),
  action: z.string(),
  client_id: z.string().optional(),
  client_name: z.string().optional(),
  details: z.union([z.string(), z.record(z.any())]).optional(),
  created_at: z.date(),
});

export const insertActivitySchema = activitySchema.omit({
  id: true,
  created_at: true,
});

export type Activity = z.infer<typeof activitySchema>;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

// Discount approval request schema
export const discountApprovalRequestSchema = z.object({
  id: z.string(),
  client_id: z.string(),
  admin_id: z.string().optional(),
  requested_discount_type: z.enum(["3", "5", "custom"]),
  requested_discount_value: z.number().nonnegative(),
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
  requested_by_email: z.string().email(),
  requested_by_name: z.string(),
  approved_by_email: z.string().email().optional(),
  approved_by_name: z.string().optional(),
  approval_notes: z.string().optional(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const insertDiscountApprovalRequestSchema = discountApprovalRequestSchema.omit({
  id: true,
  status: true,
  created_at: true,
  updated_at: true,
});

export type DiscountApprovalRequest = z.infer<typeof discountApprovalRequestSchema>;
export type InsertDiscountApprovalRequest = z.infer<typeof insertDiscountApprovalRequestSchema>;

// Date parser that handles various formats
const dateParser = z.union([
  z.date(),
  z.number(),
  z.string().pipe(z.coerce.date()),
]).transform(val => val instanceof Date ? val : new Date(val));

// CRM Task Checklist Item schema
export const checklistItemSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Título do item é obrigatório"),
  done: z.boolean().default(false),
  order: z.number().default(0),
});

export type ChecklistItem = z.infer<typeof checklistItemSchema>;

// CRM Task schema
export const crmTaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  assigned_to_email: z.string().email(),
  assigned_to_name: z.string(),
  assigned_by_user_id: z.string().optional(),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).default("pending"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  due_date: dateParser,
  checklist: z.array(checklistItemSchema).optional(),
  completion_percentage: z.number().min(0).max(100).default(0),
  created_by_email: z.string().email(),
  created_by_name: z.string(),
  created_by_role: z.enum(["admin", "vadmin"]),
  updates: z.array(z.object({
    user_id: z.string(),
    user_email: z.string(),
    user_name: z.string(),
    message: z.string(),
    timestamp: dateParser,
  })).optional(),
  created_at: dateParser,
  updated_at: dateParser,
});

export const insertCrmTaskSchema = crmTaskSchema.omit({
  id: true,
  status: true,
  completion_percentage: true,
  created_at: true,
  updated_at: true,
});

export type CrmTask = z.infer<typeof crmTaskSchema>;
export type InsertCrmTask = z.infer<typeof insertCrmTaskSchema>;

// Employee (Funcionário) schema - NEW
export const funcionarioSchema = z.object({
  id: z.string(),
  first_name: z.string().min(1, "Nome é obrigatório"),
  last_name: z.string().min(1, "Sobrenome é obrigatório"),
  email: z.string().email("Email válido é obrigatório").or(z.literal("")).optional(),
  phone: z.string().optional(),
  cpf: z.string().min(1, "CPF é obrigatório"),
  birthdate: dateParser.optional(),
  address: z.string().optional(),
  nationality: z.string().optional(),
  education_level: z.enum(["fundamental", "medio", "superior", "pos_graduacao"]).optional(),
  position: z.string().min(1, "Cargo é obrigatório"),
  department: z.string().min(1, "Departamento é obrigatório"),
  salary: z.number().positive("Salário deve ser maior que zero"),
  hire_date: dateParser,
  effective_date: dateParser.optional(), // Data de efetivação
  photo_url: z.string().optional(),
  curriculum_url: z.string().optional(),
  personal_story: z.string().optional(),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  linkedin: z.string().optional(),
  specializations: z.array(z.object({
    title: z.string(),
    date: dateParser.optional(),
  })).optional(),
  evaluation_period_start: dateParser.optional(),
  evaluation_period_end: dateParser.optional(),
  termination_date: dateParser.optional(),
  termination_reason: z.string().optional(),
  is_active: z.boolean().default(true),
  trial_period_days: z.number().positive().optional(),
  trial_start_date: dateParser.optional(),
  trial_status: z.enum(["pending", "active", "completed"]).optional(),
  created_at: dateParser,
  updated_at: dateParser,
});

export const insertFuncionarioSchema = funcionarioSchema.omit({
  id: true,
  is_active: true,
  termination_date: true,
  termination_reason: true,
  trial_status: true,
  trial_start_date: true,
  created_at: true,
  updated_at: true,
});

export type Funcionario = z.infer<typeof funcionarioSchema>;
export type InsertFuncionario = z.infer<typeof insertFuncionarioSchema>;

// Proposal schema (for job offers, creates a client record)
export const proposalSchema = z.object({
  id: z.string(),
  funcionario_id: z.string(),
  funcionario_name: z.string(),
  funcionario_position: z.string(),
  funcionario_email: z.string().optional(),
  funcionario_phone: z.string().optional(),
  client_first_name: z.string().min(1, "Nome do cliente é obrigatório"),
  client_last_name: z.string().min(1, "Sobrenome do cliente é obrigatório"),
  client_email: z.string().email().optional(),
  client_phone: z.string().min(1, "Telefone é obrigatório"),
  client_cpf: z.string().optional(),
  client_birthdate: z.union([z.string(), z.date()]).optional(),
  proposed_salary: z.number().positive("Salário proposto deve ser maior que zero"),
  job_description: z.string().min(1, "Descrição do trabalho é obrigatória"),
  work_location: z.enum(["presencial", "remoto", "hibrido"], { errorMap: () => ({ message: "Local de trabalho é obrigatório" }) }),
  work_days: z.string().min(1, "Dias de trabalho são obrigatórios"),
  work_hours: z.string().optional(),
  additional_details: z.string().optional(),
  client_id: z.string().optional(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const insertProposalSchema = proposalSchema.omit({
  id: true,
  client_id: true,
  created_at: true,
  updated_at: true,
});

export type Proposal = z.infer<typeof proposalSchema>;
export type InsertProposal = z.infer<typeof insertProposalSchema>;

// Chat message schema
export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1, "Mensagem não pode estar vazia"),
  timestamp: z.union([z.date(), z.number(), z.string()]).optional(),
  isCommand: z.boolean().optional(),
  actions: z.array(z.any()).optional(),
});

export const chatRequestSchema = z.object({
  message: z.string().min(1, "Mensagem é obrigatória"),
  history: z.array(chatMessageSchema).optional(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;

// Client Registration Invitation Link schema
export const invitationLinkSchema = z.object({
  id: z.string(),
  link_token: z.string(),
  admin_id: z.string(),
  admin_email: z.string(),
  client_type: z.enum(["agencia", "operadora"]),
  operator_name: z.enum(["azul_viagens", "cvc", "rex_tour"]).optional(),
  destination: z.string().optional(),
  created_at: z.date(),
  expires_at: z.date(),
  used_count: z.number().default(0),
  last_used_at: z.date().optional(),
});

export const insertInvitationLinkSchema = invitationLinkSchema.omit({
  id: true,
  link_token: true,
  created_at: true,
  used_count: true,
  last_used_at: true,
});

// Public schema for invitation submissions - only basic personal information from guests
export const publicInvitationSubmissionSchema = z.object({
  full_name: z.string().min(1, "Nome completo é obrigatório"),
  birthdate: z.date(),
  cpf: z.string().min(1, "CPF é obrigatório"),
  rg: z.string().optional(),
  civil_status: z.enum(["solteiro", "casado", "divorciado", "viuvo"]).optional(),
  spouse_name: z.string().optional(),
  nationality: z.string().optional(),
  gender: z.enum(["masculino", "feminino", "outro", "nao_informar"]).optional(),
  phone: z.string().min(1, "Telefone é obrigatório"),
  email: z.string().email().optional(),
  profession: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  client_preferences: z.string().optional(),
});

// Notification schema
export const notificationSchema = z.object({
  id: z.string(),
  user_email: z.string().email(),
  type: z.enum(["task_completed", "payment_reminder", "task_assigned", "parcela_overdue"]),
  title: z.string(),
  message: z.string(),
  related_id: z.string().optional(), // Task ID or Parcela ID
  read: z.boolean().default(false),
  created_at: dateParser,
  updated_at: dateParser,
});

export const insertNotificationSchema = notificationSchema.omit({
  id: true,
  read: true,
  created_at: true,
  updated_at: true,
});

export type Notification = z.infer<typeof notificationSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type InvitationLink = z.infer<typeof invitationLinkSchema>;
export type InsertInvitationLink = z.infer<typeof insertInvitationLinkSchema>;
export type PublicInvitationSubmission = z.infer<typeof publicInvitationSubmissionSchema>;
export type Client = z.infer<typeof clientSchema>;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type UpdateClient = Partial<InsertClient>;
export type Child = z.infer<typeof childSchema>;
export type InsertChild = z.infer<typeof insertChildSchema>;
export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;

// Cancelled Client Credit schema - tracks credits from cancelled trips
export const cancelledClientCreditSchema = z.object({
  id: z.string(),
  client_id: z.string(),
  client_name: z.string(),
  client_phone: z.string().optional(),
  client_email: z.string().optional(),
  destination: z.string().optional(),
  original_travel_date: z.date().optional(),
  total_paid: z.number().nonnegative(), // Total amount paid by the client
  credit_amount: z.number().nonnegative(), // Credit amount (same as total_paid)
  cancellation_reason: z.string().optional(),
  cancelled_at: z.date(),
  expires_at: z.date(), // 90 days from cancellation
  is_expired: z.boolean().default(false),
  is_used: z.boolean().default(false), // If credit was applied to a new trip
  used_at: z.date().optional(),
  used_for_client_id: z.string().optional(), // Client ID where credit was applied
  cancelled_by_email: z.string().optional(),
  cancelled_by_name: z.string().optional(),
  receipt_ids: z.array(z.string()).optional(), // IDs of receipts that were cancelled
  created_at: z.date(),
  updated_at: z.date(),
});

export const insertCancelledClientCreditSchema = cancelledClientCreditSchema.omit({
  id: true,
  is_expired: true,
  is_used: true,
  used_at: true,
  used_for_client_id: true,
  created_at: true,
  updated_at: true,
});

export type CancelledClientCredit = z.infer<typeof cancelledClientCreditSchema>;
export type InsertCancelledClientCredit = z.infer<typeof insertCancelledClientCreditSchema>;

