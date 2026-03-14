import { 
  type User,
  type InsertUser,
  type UpdateUser,
  type Client, 
  type InsertClient,
  type UpdateClient,
  type Child,
  type InsertChild,
  type MonthlyReport,
  type Destination,
  type InsertDestination,
  type FinancialTransaction,
  type InsertFinancialTransaction,
  type Prospect,
  type InsertProspect,
  type UpdateProspect,
  type InactiveClient,
  type InsertInactiveClient,
  type UpdateInactiveClient,
  type Activity,
  type InsertActivity,
  type Bus,
  type InsertBus,
  type SeatReservation,
  type InsertSeatReservation,
  type Receipt,
  type InsertReceipt,
  type Parcela,
  type InsertParcela,
  type Department,
  type InsertDepartment,
  type TimeRecord,
  type InsertTimeRecord,
  type FacialVerificationSession,
  type InsertFacialVerificationSession,
  type DiscountApprovalRequest,
  type InsertDiscountApprovalRequest,
  type InvitationLink,
  type InsertInvitationLink,
  type CrmTask,
  type InsertCrmTask,
  type Funcionario,
  type InsertFuncionario,
  type Notification,
  type InsertNotification,
  type CancelledClientCredit,
  type InsertCancelledClientCredit,
  type Bill,
  type InsertBill,
  type Proposal
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser & { id?: string }): Promise<User>;
  updateUser(id: string, user: UpdateUser): Promise<User>;
  deleteUser(id: string): Promise<void>;
  upsertUser(uid: string, email: string): Promise<User>;

  // Client operations
  getClient(id: string): Promise<Client | undefined>;
  getClientByCpf(cpf: string, destination?: string): Promise<Client | undefined>;
  getClients(): Promise<Client[]>;
  getAllClientsIncludingDeleted(): Promise<Client[]>;
  getClientsByDestination(destinationName: string): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: UpdateClient): Promise<Client>;
  deleteClient(id: string): Promise<void>;
  searchClients(searchTerm: string, includeDeleted?: boolean): Promise<Client[]>;
  // Client approval operations
  getClientByApprovalToken(token: string): Promise<Client | undefined>;
  approveClient(token: string): Promise<Client | undefined>;
  regenerateApprovalLink(clientId: string): Promise<Client>;
  // Referral operations
  getReferralStatistics(): Promise<Array<{
    referrer_id: string;
    referrer_name: string;
    referral_count: number;
    total_revenue: number;
  }>>;

  // Destination operations
  getDestination(id: string): Promise<Destination | undefined>;
  getDestinations(): Promise<Destination[]>;
  getActiveDestinations(): Promise<Destination[]>;
  createDestination(destination: InsertDestination): Promise<Destination>;
  updateDestination(id: string, destination: Partial<InsertDestination>): Promise<Destination>;
  deleteDestination(id: string): Promise<void>;

  // Child operations
  getChild(id: string): Promise<Child | undefined>;
  getChildrenByClientId(clientId: string): Promise<Child[]>;
  getAllChildren(): Promise<Child[]>;
  createChild(child: InsertChild): Promise<Child>;
  updateChild(id: string, child: Partial<InsertChild>): Promise<Child>;
  deleteChild(id: string): Promise<void>;

  // Monthly report operations
  getMonthlyReport(id: string): Promise<MonthlyReport | undefined>;
  getMonthlyReports(): Promise<MonthlyReport[]>;
  createMonthlyReport(report: MonthlyReport): Promise<MonthlyReport>;

  // Financial transaction operations
  getFinancialTransaction(id: string): Promise<FinancialTransaction | undefined>;
  getFinancialTransactions(): Promise<FinancialTransaction[]>;
  createFinancialTransaction(transaction: InsertFinancialTransaction & { created_by_email: string; created_by_name: string }): Promise<FinancialTransaction>;
  updateFinancialTransaction(id: string, transaction: Partial<InsertFinancialTransaction>): Promise<FinancialTransaction>;
  deleteFinancialTransaction(id: string): Promise<void>;

  // Bill operations (Contas a Pagar e a Receber)
  getBill(id: string): Promise<Bill | undefined>;
  getBills(type?: "pagar" | "receber"): Promise<Bill[]>;
  getBillsByStatus(status: "pending" | "paid" | "overdue"): Promise<Bill[]>;
  createBill(bill: InsertBill & { created_by_email: string; created_by_name: string }): Promise<Bill>;
  updateBill(id: string, bill: Partial<InsertBill> & { status?: "pending" | "paid" | "overdue"; paid_at?: Date | null }): Promise<Bill>;
  deleteBill(id: string): Promise<void>;

  // Prospect operations  
  getProspect(id: string): Promise<Prospect | undefined>;
  getProspects(): Promise<Prospect[]>;
  createProspect(prospect: InsertProspect): Promise<Prospect>;
  updateProspect(id: string, prospect: UpdateProspect): Promise<Prospect>;
  deleteProspect(id: string): Promise<void>;
  searchProspects(searchTerm: string): Promise<Prospect[]>;
  // Prospect quote operations
  getProspectByQuoteToken(token: string): Promise<Prospect | undefined>;
  updateQuoteStatus(token: string, status: 'viewed' | 'accepted' | 'rejected'): Promise<Prospect | undefined>;
  convertProspectToClient(prospectId: string): Promise<{ prospect: Prospect; client: Client }>;

  // Inactive Client operations
  getInactiveClient(id: string): Promise<InactiveClient | undefined>;
  getInactiveClients(): Promise<InactiveClient[]>;
  createInactiveClient(client: InsertInactiveClient): Promise<InactiveClient>;
  updateInactiveClient(id: string, client: UpdateInactiveClient): Promise<InactiveClient>;
  deleteInactiveClient(id: string): Promise<void>;
  searchInactiveClients(searchTerm: string): Promise<InactiveClient[]>;

  // Activity tracking operations
  getActivities(filters?: { userEmail?: string; fromMs?: number; toMs?: number; limit?: number; clientName?: string }): Promise<any[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  getTopCreators(filters?: { fromMs?: number; toMs?: number; limit?: number }): Promise<{ user_email: string; count: number; user_id: string }[]>;

  // Bus operations
  getBus(id: string): Promise<Bus | undefined>;
  getBuses(): Promise<Bus[]>;
  getActiveBuses(): Promise<Bus[]>;
  createBus(bus: InsertBus): Promise<Bus>;
  updateBus(id: string, bus: Partial<InsertBus>): Promise<Bus>;
  deleteBus(id: string): Promise<void>;

  // Seat reservation operations
  getSeatReservation(id: string): Promise<SeatReservation | undefined>;
  getSeatReservations(): Promise<SeatReservation[]>;
  getSeatReservationsByDestination(destinationId: string): Promise<SeatReservation[]>;
  getSeatReservationsByBus(busId: string): Promise<SeatReservation[]>;
  getSeatReservationsWithClientsByDestination(destinationId: string): Promise<Array<SeatReservation & { client?: Client; is_child?: boolean; child_data?: Child; parent_client_id?: string }>>;
  getAllPassengersByDestination(destinationName: string): Promise<Array<{ client_id: string; client_name: string; seat_number: string | null; client?: Client; is_child: boolean; child_id?: string; child_data?: Child; is_deleted?: boolean }>>;
  createSeatReservation(reservation: InsertSeatReservation): Promise<SeatReservation>;
  updateSeatReservation(id: string, reservation: Partial<InsertSeatReservation>): Promise<SeatReservation>;
  deleteSeatReservation(id: string): Promise<void>;
  deleteSeatReservationsByChildId(childId: string): Promise<void>;
  deleteSeatReservationsByClientId(clientId: string): Promise<void>;
  getSeatReservationByDestinationAndSeat(destinationId: string, seatNumber: string): Promise<SeatReservation | undefined>;

  // Receipt operations
  getReceipt(id: string): Promise<Receipt | undefined>;
  getReceipts(): Promise<Receipt[]>;
  createReceipt(receipt: InsertReceipt): Promise<Receipt>;
  updateReceipt(id: string, receipt: Partial<InsertReceipt>): Promise<Receipt>;
  deleteReceipt(id: string): Promise<void>;

  // Parcela operations
  getParcela(id: string): Promise<Parcela | undefined>;
  getParcelas(): Promise<Parcela[]>;
  getParcelasByClientId(clientId: string): Promise<Parcela[]>;
  getParcelasByMonth(month: number, year: number): Promise<Parcela[]>;
  createParcela(parcela: InsertParcela): Promise<Parcela>;
  updateParcela(id: string, parcela: Partial<InsertParcela>): Promise<Parcela>;
  deleteParcela(id: string): Promise<void>;
  deleteParcelasByClientId(clientId: string): Promise<void>;

  // Department operations
  getDepartment(id: string): Promise<Department | undefined>;
  getDepartments(): Promise<Department[]>;
  getActiveDepartments(): Promise<Department[]>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: string, department: Partial<InsertDepartment>): Promise<Department>;
  deleteDepartment(id: string): Promise<void>;

  // Time record operations
  getTimeRecord(id: string): Promise<TimeRecord | undefined>;
  getTimeRecords(): Promise<TimeRecord[]>;
  getTimeRecordsByUserId(userId: string): Promise<TimeRecord[]>;
  getTimeRecordsByDateRange(startDate: string, endDate: string): Promise<TimeRecord[]>;
  getTodayTimeRecord(userId: string): Promise<TimeRecord | undefined>;
  createTimeRecord(timeRecord: InsertTimeRecord): Promise<TimeRecord>;
  updateTimeRecord(id: string, timeRecord: Partial<InsertTimeRecord>): Promise<TimeRecord>;
  deleteTimeRecord(id: string): Promise<void>;

  // Facial verification session operations
  getFacialVerificationSession(id: string): Promise<FacialVerificationSession | undefined>;
  getFacialVerificationSessionByToken(token: string): Promise<FacialVerificationSession | undefined>;
  createFacialVerificationSession(session: InsertFacialVerificationSession): Promise<FacialVerificationSession>;
  updateFacialVerificationSession(id: string, session: Partial<InsertFacialVerificationSession>): Promise<FacialVerificationSession>;
  deleteFacialVerificationSession(id: string): Promise<void>;
  cleanupExpiredSessions(): Promise<void>;

  // Discount approval request operations
  getDiscountApprovalRequest(id: string): Promise<DiscountApprovalRequest | undefined>;
  getDiscountApprovalRequests(): Promise<DiscountApprovalRequest[]>;
  getPendingDiscountApprovalRequests(): Promise<DiscountApprovalRequest[]>;
  createDiscountApprovalRequest(request: InsertDiscountApprovalRequest): Promise<DiscountApprovalRequest>;
  approveDiscountRequest(id: string, vadminId: string, vadminName: string, maxDiscountPercentage: number): Promise<DiscountApprovalRequest>;
  rejectDiscountRequest(id: string, vadminId: string, vadminName: string, reason?: string): Promise<DiscountApprovalRequest>;
  deleteDiscountApprovalRequest(id: string): Promise<void>;

  // Invitation link operations
  getInvitationLink(linkToken: string): Promise<InvitationLink | undefined>;
  createInvitationLink(link: InsertInvitationLink): Promise<InvitationLink>;
  updateInvitationLinkUsage(linkToken: string): Promise<InvitationLink | undefined>;

  // CRM Task operations
  getCrmTask(id: string): Promise<CrmTask | undefined>;
  getCrmTasks(): Promise<CrmTask[]>;
  getCrmTasksByUserId(userId: string): Promise<CrmTask[]>;
  getCrmTasksCreatedBy(userId: string): Promise<CrmTask[]>;
  createCrmTask(task: InsertCrmTask): Promise<CrmTask>;
  updateCrmTask(id: string, task: Partial<InsertCrmTask> & { status?: 'pending' | 'in_progress' | 'completed'; completed_at?: Date | null; completion_percentage?: number }): Promise<CrmTask>;
  deleteCrmTask(id: string): Promise<void>;

  // Notification operations
  getNotifications(userEmail: string, unreadOnly?: boolean): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(notificationId: string): Promise<Notification>;
  checkAndCreateBillReminders(): Promise<void>;

  // Funcionário operations
  getFuncionario(id: string): Promise<Funcionario | undefined>;
  getFuncionarios(): Promise<Funcionario[]>;
  getActiveFuncionarios(): Promise<Funcionario[]>;
  getTrialFuncionarios(): Promise<Funcionario[]>;
  createFuncionario(funcionario: InsertFuncionario): Promise<Funcionario>;
  createTrialFuncionario(funcionario: InsertFuncionario & { trial_period_days: number }): Promise<Funcionario>;
  updateFuncionario(id: string, funcionario: Partial<InsertFuncionario>): Promise<Funcionario>;
  activateTrialFuncionario(id: string): Promise<Funcionario>;
  terminateFuncionario(id: string, terminationReason: string): Promise<Funcionario>;
  deleteFuncionario(id: string): Promise<void>;

  // Proposal operations (RH database only)
  getProposal(id: string): Promise<Proposal | undefined>;
  getProposals(): Promise<Proposal[]>;
  createProposal(proposal: Proposal): Promise<Proposal>;
  deleteProposal(id: string): Promise<void>;

  // Cancelled Client Credit operations
  getCancelledClientCredit(id: string): Promise<CancelledClientCredit | undefined>;
  getCancelledClientCredits(): Promise<CancelledClientCredit[]>;
  getCancelledClientCreditsByClientId(clientId: string): Promise<CancelledClientCredit[]>;
  getActiveCancelledClientCredits(): Promise<CancelledClientCredit[]>;
  getExpiredCancelledClientCredits(): Promise<CancelledClientCredit[]>;
  createCancelledClientCredit(credit: InsertCancelledClientCredit): Promise<CancelledClientCredit>;
  updateCancelledClientCredit(id: string, credit: Partial<CancelledClientCredit>): Promise<CancelledClientCredit>;
  markCreditAsUsed(id: string, usedForClientId: string): Promise<CancelledClientCredit>;
  updateExpiredCredits(): Promise<number>;
  
  // Client cancellation operation
  cancelClient(clientId: string, reason: string, cancelledByEmail: string, cancelledByName: string): Promise<{
    client: Client;
    credit: CancelledClientCredit;
    cancelledReceipts: Receipt[];
    removedSeatReservations: SeatReservation[];
  }>;
}

// Use JSON File Storage - no Firebase dependency
import { JSONFileStorage } from "./json-storage";

console.log("Initializing JSON File storage...");
const storage: IStorage = new JSONFileStorage();
console.log("JSON File Storage initialized successfully (main + RH)");

export { storage };
