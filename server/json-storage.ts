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
  type Proposal,
} from "@shared/schema";
import { IStorage } from "./storage";
import * as fs from "fs";
import * as path from "path";

interface DatabaseData {
  users: Record<string, any>;
  clients: Record<string, any>;
  destinations: Record<string, any>;
  children: Record<string, any>;
  monthly_reports: Record<string, any>;
  financial_transactions: Record<string, any>;
  prospects: Record<string, any>;
  inactive_clients: Record<string, any>;
  activities: Record<string, any>;
  buses: Record<string, any>;
  seatReservations: Record<string, any>;
  receipts: Record<string, any>;
  parcelas: Record<string, any>;
  departments: Record<string, any>;
  timeRecords: Record<string, any>;
  facialVerificationSessions: Record<string, any>;
  discountApprovalRequests: Record<string, any>;
  invitationLinks: Record<string, any>;
  crmTasks: Record<string, any>;
  notifications: Record<string, any>;
  cancelledClientCredits: Record<string, any>;
  bills: Record<string, any>;
}

interface RHDatabaseData {
  funcionarios: Record<string, any>;
  proposals: Record<string, any>;
}

export class JSONFileStorage implements IStorage {
  private dataPath: string;
  private rhDataPath: string;
  private data: DatabaseData;
  private rhData: RHDatabaseData;
  private saveDebounceTimer: NodeJS.Timeout | null = null;
  private rhSaveDebounceTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.dataPath = path.join(process.cwd(), "data", "database.json");
    this.rhDataPath = path.join(process.cwd(), "data", "rh-database.json");
    
    const dataDir = path.dirname(this.dataPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.data = this.loadData();
    this.rhData = this.loadRHData();
    
    console.log("JSON File Storage initialized successfully (main + RH)");
  }

  private loadData(): DatabaseData {
    const emptyData: DatabaseData = {
      users: {},
      clients: {},
      destinations: {},
      children: {},
      monthly_reports: {},
      financial_transactions: {},
      prospects: {},
      inactive_clients: {},
      activities: {},
      buses: {},
      seatReservations: {},
      receipts: {},
      parcelas: {},
      departments: {},
      timeRecords: {},
      facialVerificationSessions: {},
      discountApprovalRequests: {},
      invitationLinks: {},
      crmTasks: {},
      notifications: {},
      cancelledClientCredits: {},
      bills: {},
    };

    try {
      if (fs.existsSync(this.dataPath)) {
        const fileContent = fs.readFileSync(this.dataPath, "utf-8");
        const parsed = JSON.parse(fileContent);
        return { ...emptyData, ...parsed };
      }
    } catch (error) {
      console.error("Error loading database file:", error);
    }
    return emptyData;
  }

  private loadRHData(): RHDatabaseData {
    const emptyData: RHDatabaseData = {
      funcionarios: {},
      proposals: {},
    };

    try {
      if (fs.existsSync(this.rhDataPath)) {
        const fileContent = fs.readFileSync(this.rhDataPath, "utf-8");
        const parsed = JSON.parse(fileContent);
        return { ...emptyData, ...parsed };
      }
    } catch (error) {
      console.error("Error loading RH database file:", error);
    }
    return emptyData;
  }

  private saveData(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    this.saveDebounceTimer = setTimeout(() => {
      try {
        fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2), "utf-8");
      } catch (error) {
        console.error("Error saving database file:", error);
      }
    }, 100);
  }

  private saveRHData(): void {
    if (this.rhSaveDebounceTimer) {
      clearTimeout(this.rhSaveDebounceTimer);
    }
    this.rhSaveDebounceTimer = setTimeout(() => {
      try {
        fs.writeFileSync(this.rhDataPath, JSON.stringify(this.rhData, null, 2), "utf-8");
      } catch (error) {
        console.error("Error saving RH database file:", error);
      }
    }, 100);
  }

  private generateId(): string {
    return `json_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getLocalDateString(date: Date = new Date()): string {
    const brazilDate = new Date(date.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const year = brazilDate.getFullYear();
    const month = String(brazilDate.getMonth() + 1).padStart(2, "0");
    const day = String(brazilDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  private convertDatesToTimestamp(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (obj instanceof Date) return obj.toISOString();
    if (Array.isArray(obj)) return obj.map((item) => this.convertDatesToTimestamp(item));
    if (typeof obj === "object") {
      const converted: any = {};
      for (const key in obj) {
        const convertedValue = this.convertDatesToTimestamp(obj[key]);
        if (convertedValue !== undefined) {
          converted[key] = convertedValue;
        }
      }
      return converted;
    }
    return obj;
  }

  private convertTimestampsToDates(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === "string" && obj.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      return new Date(obj);
    }
    if (Array.isArray(obj)) return obj.map((item) => this.convertTimestampsToDates(item));
    if (typeof obj === "object") {
      const converted: any = {};
      for (const key in obj) {
        converted[key] = this.convertTimestampsToDates(obj[key]);
      }
      return converted;
    }
    return obj;
  }

  private generateApprovalToken(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const userData = this.data.users[id];
    if (userData) {
      return this.convertTimestampsToDates({ id, ...userData });
    }
    return undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    for (const [id, userData] of Object.entries(this.data.users)) {
      if ((userData as any).email === email) {
        return this.convertTimestampsToDates({ id, ...userData });
      }
    }
    return undefined;
  }

  async getUsers(): Promise<User[]> {
    return Object.keys(this.data.users).map((id) =>
      this.convertTimestampsToDates({ id, ...this.data.users[id] })
    );
  }

  async createUser(insertUser: InsertUser & { id?: string }): Promise<User> {
    const now = new Date();
    const user: User = {
      id: insertUser.id || this.generateId(),
      ...insertUser,
      created_at: now,
      updated_at: now,
    };

    const { id, ...userDataWithoutId } = user;
    this.data.users[user.id] = this.convertDatesToTimestamp(userDataWithoutId);
    this.saveData();

    return user;
  }

  async upsertUser(uid: string, email: string): Promise<User> {
    if (!email) {
      throw new Error("Email is required");
    }

    const normalizedEmail = email.toLowerCase();
    const vadminEmails = [
      "alda@rodabemturismo.com",
      "daniel@rodabemturismo.com",
      "rosinha@rodabemturismo.com",
      "iyed@rodabemturismo.com",
    ];
    const role = vadminEmails.includes(normalizedEmail) ? "vadmin" : "admin";

    const existingUserByUid = await this.getUser(uid);
    if (existingUserByUid) {
      if (vadminEmails.includes(normalizedEmail) && existingUserByUid.role !== "vadmin") {
        console.log(`Upgrading user ${normalizedEmail} from ${existingUserByUid.role} to vadmin`);
        return await this.updateUser(uid, { role: "vadmin" });
      }
      return existingUserByUid;
    }

    const existingUserByEmail = await this.getUserByEmail(normalizedEmail);
    if (existingUserByEmail) {
      return existingUserByEmail;
    }

    return await this.createUser({
      id: uid,
      email: normalizedEmail,
      role,
    });
  }

  async updateUser(id: string, updateUser: UpdateUser): Promise<User> {
    const existingUser = await this.getUser(id);
    if (!existingUser) {
      throw new Error("User not found");
    }

    const now = new Date();
    const updated: User = {
      ...existingUser,
      ...updateUser,
      updated_at: now,
    };

    const { id: _, ...userDataWithoutId } = updated;
    this.data.users[id] = this.convertDatesToTimestamp(userDataWithoutId);
    this.saveData();

    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    delete this.data.users[id];
    this.saveData();
  }

  // Client operations
  async getClient(id: string): Promise<Client | undefined> {
    const clientData = this.data.clients[id];
    if (clientData) {
      return this.convertTimestampsToDates({ id, ...clientData });
    }
    return undefined;
  }

  async getClientByCpf(cpf: string, destination?: string): Promise<Client | undefined> {
    const cleanedCpf = cpf.replace(/\D/g, "");
    for (const [id, clientData] of Object.entries(this.data.clients)) {
      const client = clientData as any;
      const clientCpf = (client.cpf || "").replace(/\D/g, "");
      if (clientCpf === cleanedCpf) {
        if (destination && client.destination !== destination) {
          continue;
        }
        if (client.is_deleted) {
          continue;
        }
        return this.convertTimestampsToDates({ id, ...client });
      }
    }
    return undefined;
  }

  async getClients(): Promise<Client[]> {
    return Object.keys(this.data.clients)
      .map((id) => this.convertTimestampsToDates({ id, ...this.data.clients[id] }))
      .filter((client: Client) => !(client as any).is_deleted);
  }

  async getAllClientsIncludingDeleted(): Promise<Client[]> {
    return Object.keys(this.data.clients)
      .map((id) => this.convertTimestampsToDates({ id, ...this.data.clients[id] }));
  }

  async getClientsByDestination(destinationName: string): Promise<Client[]> {
    const clients = await this.getClients();
    return clients.filter((c) => c.destination === destinationName);
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const now = new Date();
    const approvalExpiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000);

    const client: Client = {
      id: this.generateId(),
      ...insertClient,
      full_name_search: `${insertClient.first_name} ${insertClient.last_name}`.toLowerCase(),
      approval_token: this.generateApprovalToken(),
      approval_status: "pending",
      approval_expires_at: approvalExpiresAt,
      is_cancelled: false,
      created_at: now,
      updated_at: now,
    } as Client;

    const { id, ...clientDataWithoutId } = client;
    this.data.clients[client.id] = this.convertDatesToTimestamp(clientDataWithoutId);
    this.saveData();

    return client;
  }

  async updateClient(id: string, updateClientData: UpdateClient): Promise<Client> {
    const existingClient = await this.getClient(id);
    if (!existingClient) {
      throw new Error("Client not found");
    }

    const now = new Date();
    const updated: Client = {
      ...existingClient,
      ...updateClientData,
      full_name_search:
        updateClientData.first_name || updateClientData.last_name
          ? `${updateClientData.first_name || existingClient.first_name} ${
              updateClientData.last_name || existingClient.last_name
            }`.toLowerCase()
          : existingClient.full_name_search,
      updated_at: now,
    };

    const { id: _, ...clientDataWithoutId } = updated;
    this.data.clients[id] = this.convertDatesToTimestamp(clientDataWithoutId);
    this.saveData();

    return updated;
  }

  async deleteClient(id: string): Promise<void> {
    const client = await this.getClient(id);
    if (client) {
      const now = new Date();
      const permanentDeleteAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const updated = {
        ...this.data.clients[id],
        is_deleted: true,
        deleted_at: now.toISOString(),
        permanent_delete_at: permanentDeleteAt.toISOString(),
      };

      this.data.clients[id] = updated;
      this.saveData();
    }
  }

  async searchClients(searchTerm: string, includeDeleted?: boolean): Promise<Client[]> {
    const term = searchTerm.toLowerCase();
    let clients = Object.keys(this.data.clients).map((id) =>
      this.convertTimestampsToDates({ id, ...this.data.clients[id] })
    );

    if (!includeDeleted) {
      clients = clients.filter((client: any) => !client.is_deleted);
    }

    return clients.filter(
      (client: Client) =>
        client.full_name_search?.includes(term) ||
        (client.cpf && client.cpf.includes(term)) ||
        (client.email && client.email.toLowerCase().includes(term)) ||
        (client.destination && client.destination.toLowerCase().includes(term))
    );
  }

  async getClientByApprovalToken(token: string): Promise<Client | undefined> {
    for (const [id, clientData] of Object.entries(this.data.clients)) {
      if ((clientData as any).approval_token === token) {
        return this.convertTimestampsToDates({ id, ...clientData });
      }
    }
    return undefined;
  }

  async approveClient(token: string): Promise<Client | undefined> {
    const client = await this.getClientByApprovalToken(token);
    if (!client) {
      return undefined;
    }

    const now = new Date();
    if (client.approval_expires_at && client.approval_expires_at < now) {
      return client;
    }

    const approvedClient = await this.updateClient(client.id, {
      approval_status: "approved",
      approval_date: now,
    } as any);

    return approvedClient;
  }

  async regenerateApprovalLink(clientId: string): Promise<Client> {
    const client = await this.getClient(clientId);
    if (!client) {
      throw new Error("Client not found");
    }

    const now = new Date();
    const approvalExpiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000);

    const updatedClient = await this.updateClient(clientId, {
      approval_token: this.generateApprovalToken(),
      approval_status: "pending",
      approval_date: undefined,
      approval_expires_at: approvalExpiresAt,
    } as any);

    return updatedClient;
  }

  async getReferralStatistics(): Promise<
    Array<{
      referrer_id: string;
      referrer_name: string;
      referral_count: number;
      total_revenue: number;
    }>
  > {
    const clients = await this.getClients();
    const referralMap = new Map<
      string,
      {
        referrer_name: string;
        referral_count: number;
        total_revenue: number;
      }
    >();

    for (const client of clients) {
      if (client.referred_by) {
        const existing = referralMap.get(client.referred_by);
        const revenue = typeof client.travel_price === "number" ? client.travel_price : 0;

        if (existing) {
          existing.referral_count++;
          existing.total_revenue += revenue;
        } else {
          const referrer = clients.find((c) => c.id === client.referred_by);
          if (referrer) {
            referralMap.set(client.referred_by, {
              referrer_name: `${referrer.first_name} ${referrer.last_name}`,
              referral_count: 1,
              total_revenue: revenue,
            });
          }
        }
      }
    }

    return Array.from(referralMap.entries())
      .map(([referrer_id, stats]) => ({
        referrer_id,
        ...stats,
      }))
      .sort((a, b) => b.referral_count - a.referral_count);
  }

  // Destination operations
  async getDestination(id: string): Promise<Destination | undefined> {
    const destData = this.data.destinations[id];
    if (destData) {
      return this.convertTimestampsToDates({ id, ...destData });
    }
    return undefined;
  }

  async getDestinations(): Promise<Destination[]> {
    return Object.keys(this.data.destinations)
      .map((id) => this.convertTimestampsToDates({ id, ...this.data.destinations[id] }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getActiveDestinations(): Promise<Destination[]> {
    const destinations = await this.getDestinations();
    const now = new Date();
    return destinations.filter((d) => {
      if (!d.is_active) return false;
      // Also filter out destinations where the travel period has ended
      if (d.periodo_viagem_fim) {
        const endDate = new Date(d.periodo_viagem_fim);
        if (endDate < now) return false;
      }
      return true;
    });
  }

  async createDestination(insertDestination: InsertDestination): Promise<Destination> {
    const now = new Date();
    const destination: Destination = {
      id: this.generateId(),
      ...insertDestination,
      created_at: now,
      updated_at: now,
    };

    const { id, ...destDataWithoutId } = destination;
    this.data.destinations[destination.id] = this.convertDatesToTimestamp(destDataWithoutId);
    this.saveData();

    return destination;
  }

  async updateDestination(
    id: string,
    destinationUpdate: Partial<InsertDestination>
  ): Promise<Destination> {
    const existing = await this.getDestination(id);
    if (!existing) throw new Error("Destination not found");

    const now = new Date();
    const updated: Destination = {
      ...existing,
      ...destinationUpdate,
      updated_at: now,
    };

    const { id: _, ...destDataWithoutId } = updated;
    this.data.destinations[id] = this.convertDatesToTimestamp(destDataWithoutId);
    this.saveData();

    return updated;
  }

  async deleteDestination(id: string): Promise<void> {
    delete this.data.destinations[id];
    this.saveData();
  }

  // Child operations
  async getChild(id: string): Promise<Child | undefined> {
    const childData = this.data.children[id];
    if (childData) {
      return this.convertTimestampsToDates({ id, ...childData });
    }
    return undefined;
  }

  async getChildrenByClientId(clientId: string): Promise<Child[]> {
    const client = await this.getClient(clientId);
    if (!client || (client as any).is_deleted) {
      return [];
    }
    return Object.keys(this.data.children)
      .map((id) => this.convertTimestampsToDates({ id, ...this.data.children[id] }))
      .filter((child: Child) => child.client_id === clientId);
  }

  async getAllChildren(): Promise<Child[]> {
    return Object.keys(this.data.children).map((id) =>
      this.convertTimestampsToDates({ id, ...this.data.children[id] })
    );
  }

  async createChild(insertChild: InsertChild): Promise<Child> {
    const child: Child = {
      id: this.generateId(),
      ...insertChild,
    };

    const { id, ...childDataWithoutId } = child;
    this.data.children[child.id] = this.convertDatesToTimestamp(childDataWithoutId);
    this.saveData();

    return child;
  }

  async updateChild(id: string, childUpdate: Partial<InsertChild>): Promise<Child> {
    const existing = await this.getChild(id);
    if (!existing) throw new Error("Child not found");

    const updated: Child = {
      ...existing,
      ...childUpdate,
    };

    const { id: _, ...childDataWithoutId } = updated;
    this.data.children[id] = this.convertDatesToTimestamp(childDataWithoutId);
    this.saveData();

    return updated;
  }

  async deleteChild(id: string): Promise<void> {
    delete this.data.children[id];
    this.saveData();
  }

  // Monthly report operations
  async getMonthlyReport(id: string): Promise<MonthlyReport | undefined> {
    const reportData = this.data.monthly_reports[id];
    if (reportData) {
      return this.convertTimestampsToDates({ id, ...reportData });
    }
    return undefined;
  }

  async getMonthlyReports(): Promise<MonthlyReport[]> {
    return Object.keys(this.data.monthly_reports)
      .map((id) => this.convertTimestampsToDates({ id, ...this.data.monthly_reports[id] }))
      .sort((a, b) => {
        if (a.year !== b.year) {
          return b.year - a.year;
        }
        return b.month - a.month;
      });
  }

  async createMonthlyReport(report: MonthlyReport): Promise<MonthlyReport> {
    const newReport = { ...report, id: report.id || this.generateId() };

    const { id, ...reportDataWithoutId } = newReport;
    this.data.monthly_reports[newReport.id] = this.convertDatesToTimestamp(reportDataWithoutId);
    this.saveData();

    return newReport;
  }

  // Financial transaction operations
  async getFinancialTransaction(id: string): Promise<FinancialTransaction | undefined> {
    const transData = this.data.financial_transactions[id];
    if (transData) {
      return this.convertTimestampsToDates({ id, ...transData });
    }
    return undefined;
  }

  async getFinancialTransactions(): Promise<FinancialTransaction[]> {
    return Object.keys(this.data.financial_transactions)
      .map((id) =>
        this.convertTimestampsToDates({ id, ...this.data.financial_transactions[id] })
      )
      .sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }

  async createFinancialTransaction(
    insertTransaction: InsertFinancialTransaction & {
      created_by_email: string;
      created_by_name: string;
    }
  ): Promise<FinancialTransaction> {
    const now = new Date();
    const transaction: FinancialTransaction = {
      id: this.generateId(),
      ...insertTransaction,
      created_at: now,
      updated_at: now,
    };

    const { id, ...transDataWithoutId } = transaction;
    this.data.financial_transactions[transaction.id] =
      this.convertDatesToTimestamp(transDataWithoutId);
    this.saveData();

    return transaction;
  }

  async updateFinancialTransaction(
    id: string,
    transactionUpdate: Partial<InsertFinancialTransaction>
  ): Promise<FinancialTransaction> {
    const existing = await this.getFinancialTransaction(id);
    if (!existing) throw new Error("Financial transaction not found");

    const now = new Date();
    const updated: FinancialTransaction = {
      ...existing,
      ...transactionUpdate,
      updated_at: now,
    };

    const { id: _, ...transDataWithoutId } = updated;
    this.data.financial_transactions[id] = this.convertDatesToTimestamp(transDataWithoutId);
    this.saveData();

    return updated;
  }

  async deleteFinancialTransaction(id: string): Promise<void> {
    delete this.data.financial_transactions[id];
    this.saveData();
  }

  // Prospect operations (cadastro - customer database)
  async getProspect(id: string): Promise<Prospect | undefined> {
    const prospectData = this.data.prospects[id];
    if (prospectData) {
      return this.convertTimestampsToDates({ id, ...prospectData });
    }
    return undefined;
  }

  async getProspects(): Promise<Prospect[]> {
    return Object.keys(this.data.prospects).map((id) =>
      this.convertTimestampsToDates({ id, ...this.data.prospects[id] })
    );
  }

  async createProspect(insertProspect: InsertProspect): Promise<Prospect> {
    const now = new Date();

    const prospect: Prospect = {
      id: this.generateId(),
      ...insertProspect,
      full_name_search: `${insertProspect.first_name} ${insertProspect.last_name}`.toLowerCase(),
      status: "novo",
      created_at: now,
      updated_at: now,
    };

    const { id, ...prospectDataWithoutId } = prospect;
    this.data.prospects[prospect.id] = this.convertDatesToTimestamp(prospectDataWithoutId);
    this.saveData();

    return prospect;
  }

  async updateProspect(id: string, prospectUpdate: UpdateProspect): Promise<Prospect> {
    const existing = await this.getProspect(id);
    if (!existing) throw new Error("Prospect not found");

    const now = new Date();
    const updated: Prospect = {
      ...existing,
      ...prospectUpdate,
      full_name_search:
        prospectUpdate.first_name || prospectUpdate.last_name
          ? `${prospectUpdate.first_name || existing.first_name} ${
              prospectUpdate.last_name || existing.last_name
            }`.toLowerCase()
          : existing.full_name_search,
      updated_at: now,
    };

    const { id: _, ...prospectDataWithoutId } = updated;
    this.data.prospects[id] = this.convertDatesToTimestamp(prospectDataWithoutId);
    this.saveData();

    return updated;
  }

  async deleteProspect(id: string): Promise<void> {
    delete this.data.prospects[id];
    this.saveData();
  }

  async searchProspects(searchTerm: string): Promise<Prospect[]> {
    const prospects = await this.getProspects();
    const term = searchTerm.toLowerCase();
    return prospects.filter(
      (prospect) =>
        (prospect.full_name_search && prospect.full_name_search.includes(term)) ||
        (prospect.interested_destinations && prospect.interested_destinations.some(d => d.toLowerCase().includes(term))) ||
        (prospect.email && prospect.email.toLowerCase().includes(term)) ||
        (prospect.cpf && prospect.cpf.includes(term))
    );
  }

  async getProspectByQuoteToken(token: string): Promise<Prospect | undefined> {
    // This method exists for compatibility but prospects in this schema don't have quote tokens
    // The quote system was in a different version of the application
    return undefined;
  }

  async updateQuoteStatus(
    token: string,
    status: "viewed" | "accepted" | "rejected"
  ): Promise<Prospect | undefined> {
    // This method exists for compatibility but prospects in this schema don't have quote tokens
    return undefined;
  }

  async convertProspectToClient(
    prospectId: string
  ): Promise<{ prospect: Prospect; client: Client }> {
    const prospect = await this.getProspect(prospectId);
    if (!prospect) throw new Error("Prospect not found");

    const client = await this.createClient({
      first_name: prospect.first_name,
      last_name: prospect.last_name,
      birthdate: prospect.birthdate || new Date(),
      cpf: prospect.cpf || "",
      phone: prospect.phone,
      email: prospect.email,
      destination: prospect.interested_destinations?.[0] || "",
      duration: 1,
      travel_price: 0,
      created_by_email: prospect.created_by_email || "",
      created_by_name: prospect.created_by_name || "",
      is_brinde: false,
      contract_type: "normal",
      client_type: "agencia",
    } as InsertClient);

    const updatedProspect = await this.updateProspect(prospectId, {
      status: "convertido",
      converted_to_client_id: client.id,
      converted_at: new Date(),
    } as any);

    return { prospect: updatedProspect, client };
  }

  // Inactive Client operations
  async getInactiveClient(id: string): Promise<InactiveClient | undefined> {
    const clientData = this.data.inactive_clients[id];
    if (clientData) {
      return this.convertTimestampsToDates({ id, ...clientData });
    }
    return undefined;
  }

  async getInactiveClients(): Promise<InactiveClient[]> {
    return Object.keys(this.data.inactive_clients).map((id) =>
      this.convertTimestampsToDates({ id, ...this.data.inactive_clients[id] })
    );
  }

  async createInactiveClient(insertClient: InsertInactiveClient): Promise<InactiveClient> {
    const now = new Date();
    const id = this.generateId();
    const client: InactiveClient = {
      id,
      ...insertClient,
      full_name_search: `${insertClient.first_name} ${insertClient.last_name}`.toLowerCase(),
      created_at: now,
      updated_at: now,
    };

    const { id: _, ...clientData } = client;
    this.data.inactive_clients[id] = this.convertDatesToTimestamp(clientData);
    this.saveData();

    return client;
  }

  async updateInactiveClient(
    id: string,
    updateClient: UpdateInactiveClient
  ): Promise<InactiveClient> {
    const existing = await this.getInactiveClient(id);
    if (!existing) throw new Error("Inactive client not found");

    const now = new Date();
    const updated: InactiveClient = {
      ...existing,
      ...updateClient,
      full_name_search: `${updateClient.first_name || existing.first_name} ${
        updateClient.last_name || existing.last_name
      }`.toLowerCase(),
      updated_at: now,
    };

    const { id: _, ...clientData } = updated;
    this.data.inactive_clients[id] = this.convertDatesToTimestamp(clientData);
    this.saveData();

    return updated;
  }

  async deleteInactiveClient(id: string): Promise<void> {
    delete this.data.inactive_clients[id];
    this.saveData();
  }

  async searchInactiveClients(searchTerm: string): Promise<InactiveClient[]> {
    const clients = await this.getInactiveClients();
    const term = searchTerm.toLowerCase();
    return clients.filter(
      (c) =>
        c.full_name_search?.includes(term) ||
        c.cpf.includes(term) ||
        c.email?.toLowerCase().includes(term)
    );
  }

  // Activity tracking operations
  async getActivities(filters?: {
    userEmail?: string;
    fromMs?: number;
    toMs?: number;
    limit?: number;
    clientName?: string;
  }): Promise<any[]> {
    let activities: any[] = Object.keys(this.data.activities).map((id) =>
      this.convertTimestampsToDates({ id, ...this.data.activities[id] })
    );

    if (filters?.userEmail) {
      activities = activities.filter((a) => a.user_email === filters.userEmail);
    }
    if (filters?.fromMs) {
      activities = activities.filter((a) => new Date(a.created_at).getTime() >= filters.fromMs!);
    }
    if (filters?.toMs) {
      activities = activities.filter((a) => new Date(a.created_at).getTime() <= filters.toMs!);
    }
    if (filters?.clientName) {
      const term = filters.clientName.toLowerCase();
      activities = activities.filter(
        (a) => a.client_name && a.client_name.toLowerCase().includes(term)
      );
    }

    activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (filters?.limit) {
      activities = activities.slice(0, filters.limit);
    }

    return activities;
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const now = new Date();
    const activity: Activity = {
      id: this.generateId(),
      ...insertActivity,
      created_at: now,
    };

    const { id, ...activityData } = activity;
    this.data.activities[activity.id] = this.convertDatesToTimestamp(activityData);
    this.saveData();

    return activity;
  }

  async getTopCreators(filters?: {
    fromMs?: number;
    toMs?: number;
    limit?: number;
  }): Promise<{ user_email: string; count: number; user_id: string }[]> {
    let activities = await this.getActivities(filters);

    const creatorMap = new Map<string, { count: number; user_id: string }>();
    for (const activity of activities) {
      if (activity.action === "create" || activity.action?.includes("create")) {
        const existing = creatorMap.get(activity.user_email) || {
          count: 0,
          user_id: activity.user_id,
        };
        existing.count++;
        creatorMap.set(activity.user_email, existing);
      }
    }

    let results = Array.from(creatorMap.entries())
      .map(([user_email, data]) => ({
        user_email,
        count: data.count,
        user_id: data.user_id,
      }))
      .sort((a, b) => b.count - a.count);

    if (filters?.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  // Bus operations
  async getBus(id: string): Promise<Bus | undefined> {
    const busData = this.data.buses[id];
    if (busData) {
      return this.convertTimestampsToDates({ id, ...busData });
    }
    return undefined;
  }

  async getBuses(): Promise<Bus[]> {
    return Object.keys(this.data.buses).map((id) =>
      this.convertTimestampsToDates({ id, ...this.data.buses[id] })
    );
  }

  async getActiveBuses(): Promise<Bus[]> {
    const buses = await this.getBuses();
    return buses.filter((b) => b.is_active);
  }

  async createBus(insertBus: InsertBus): Promise<Bus> {
    const now = new Date();
    const bus: Bus = {
      id: this.generateId(),
      ...insertBus,
      created_at: now,
      updated_at: now,
    };

    const { id, ...busData } = bus;
    this.data.buses[bus.id] = this.convertDatesToTimestamp(busData);
    this.saveData();

    return bus;
  }

  async updateBus(id: string, busUpdate: Partial<InsertBus>): Promise<Bus> {
    const existing = await this.getBus(id);
    if (!existing) throw new Error("Bus not found");

    const now = new Date();
    const updated: Bus = {
      ...existing,
      ...busUpdate,
      updated_at: now,
    };

    const { id: _, ...busData } = updated;
    this.data.buses[id] = this.convertDatesToTimestamp(busData);
    this.saveData();

    return updated;
  }

  async deleteBus(id: string): Promise<void> {
    delete this.data.buses[id];
    this.saveData();
  }

  // Seat reservation operations
  async getSeatReservation(id: string): Promise<SeatReservation | undefined> {
    const reservationData = this.data.seatReservations[id];
    if (reservationData) {
      return this.convertTimestampsToDates({ id, ...reservationData });
    }
    return undefined;
  }

  async getSeatReservations(): Promise<SeatReservation[]> {
    return Object.keys(this.data.seatReservations).map((id) =>
      this.convertTimestampsToDates({ id, ...this.data.seatReservations[id] })
    );
  }

  async getSeatReservationsByDestination(destinationId: string): Promise<SeatReservation[]> {
    const reservations = await this.getSeatReservations();
    return reservations.filter((r) => r.destination_id === destinationId);
  }

  async getSeatReservationsByBus(busId: string): Promise<SeatReservation[]> {
    const reservations = await this.getSeatReservations();
    return reservations.filter((r) => r.bus_id === busId);
  }

  async getSeatReservationsWithClientsByDestination(
    destinationId: string
  ): Promise<Array<SeatReservation & { client?: Client; is_child?: boolean; child_data?: Child; parent_client_id?: string }>> {
    const reservations = await this.getSeatReservationsByDestination(destinationId);
    const reservationsWithClients: Array<SeatReservation & { client?: Client; is_child?: boolean; child_data?: Child; parent_client_id?: string }> = [];

    for (const reservation of reservations) {
      if (reservation.status === "cancelled") continue;

      const client = await this.getClient(reservation.client_id);
      if (!client || (client as any).is_deleted) {
        continue;
      }

      if (reservation.child_id) {
        const child = await this.getChild(reservation.child_id);
        reservationsWithClients.push({
          ...reservation,
          client: client,
          is_child: true,
          child_data: child,
          parent_client_id: reservation.client_id,
        });
      } else {
        reservationsWithClients.push({
          ...reservation,
          client: client,
          is_child: false,
        });
      }
    }

    return reservationsWithClients;
  }

  async getAllPassengersByDestination(
    destinationName: string
  ): Promise<
    Array<{
      client_id: string;
      client_name: string;
      seat_number: string | null;
      client?: Client;
      is_child: boolean;
      child_id?: string;
      child_data?: Child;
      is_deleted?: boolean;
    }>
  > {
    const destinations = await this.getDestinations();
    const destination = destinations.find((d) => d.name === destinationName);
    if (!destination) {
      return [];
    }

    const seatReservations = await this.getSeatReservationsByDestination(destination.id);

    const reservationByClientId = new Map<string, SeatReservation>();
    const reservationByChildName = new Map<string, SeatReservation>();
    const clientIdsWithReservations = new Set<string>();

    for (const reservation of seatReservations) {
      clientIdsWithReservations.add(reservation.client_id);
      if (reservation.child_id) {
        if (!reservationByClientId.has(`child:${reservation.child_id}`)) {
          reservationByClientId.set(`child:${reservation.child_id}`, reservation);
        }
      } else {
        reservationByChildName.set(
          (reservation.client_name || "").trim().toUpperCase(),
          reservation
        );
        if (!reservationByClientId.has(reservation.client_id)) {
          reservationByClientId.set(reservation.client_id, reservation);
        }
      }
    }

    const passengers = new Map<
      string,
      {
        client_id: string;
        client_name: string;
        seat_number: string | null;
        client?: Client;
        is_child: boolean;
        child_id?: string;
        child_data?: Child;
        is_deleted?: boolean;
      }
    >();

    const allClients = Object.keys(this.data.clients).map((id) =>
      this.convertTimestampsToDates({ id, ...this.data.clients[id] })
    );
    const destinationClients = allClients.filter(
      (c: any) =>
        c.destination === destinationName && !c.is_deleted
    );

    for (const client of destinationClients) {
      const isClientDeleted = !!(client as any).is_deleted;
      const clientName = `${client.first_name} ${client.last_name}`;
      const hasReservation = clientIdsWithReservations.has(client.id);

      if (!isClientDeleted || hasReservation || client.seat_number) {
        const reservation = reservationByClientId.get(client.id);
        const seatNumber = reservation?.seat_number || client.seat_number || null;

        passengers.set(`client:${client.id}`, {
          client_id: client.id,
          client_name: clientName,
          seat_number: seatNumber,
          client: client,
          is_child: false,
          is_deleted: isClientDeleted,
        });

        const children = await this.getChildrenByClientId(client.id);
        for (const child of children) {
          const childReservation =
            reservationByClientId.get(`child:${child.id}`) ||
            reservationByChildName.get(child.name.trim().toUpperCase());
          const childSeatNumber =
            childReservation?.seat_number || child.seat_number || null;

          passengers.set(`child:${child.id}`, {
            client_id: client.id,
            client_name: child.name,
            seat_number: childSeatNumber,
            client: client,
            is_child: true,
            child_id: child.id,
            child_data: child,
            is_deleted: false,
          });
        }
      }
    }

    for (const reservation of seatReservations) {
      const exists =
        passengers.has(`client:${reservation.client_id}`) ||
        (reservation.child_id && passengers.has(`child:${reservation.child_id}`));

      if (!exists && !reservation.child_id) {
        const client = await this.getClient(reservation.client_id);
        const isDeleted = client ? !!(client as any).is_deleted : true;

        passengers.set(
          `orphan:${reservation.id || reservation.client_id}:${reservation.seat_number}`,
          {
            client_id: reservation.client_id,
            client_name: reservation.client_name || "",
            seat_number: reservation.seat_number,
            client: client || undefined,
            is_child: false,
            is_deleted: isDeleted,
          }
        );
      }
    }

    return Array.from(passengers.values());
  }

  async createSeatReservation(reservation: InsertSeatReservation): Promise<SeatReservation> {
    const now = new Date();
    const newReservation: SeatReservation = {
      id: this.generateId(),
      ...reservation,
      reserved_at: reservation.reserved_at || now,
      is_reserved: reservation.is_reserved !== false,
    };

    const { id, ...reservationData } = newReservation;
    this.data.seatReservations[newReservation.id] =
      this.convertDatesToTimestamp(reservationData);
    this.saveData();

    return newReservation;
  }

  async updateSeatReservation(
    id: string,
    reservation: Partial<InsertSeatReservation>
  ): Promise<SeatReservation> {
    const existing = await this.getSeatReservation(id);
    if (!existing) throw new Error("Seat reservation not found");

    const updated: SeatReservation = {
      ...existing,
      ...reservation,
    };

    const { id: _, ...reservationData } = updated;
    this.data.seatReservations[id] = this.convertDatesToTimestamp(reservationData);
    this.saveData();

    return updated;
  }

  async deleteSeatReservation(id: string): Promise<void> {
    delete this.data.seatReservations[id];
    this.saveData();
  }

  async deleteSeatReservationsByChildId(childId: string): Promise<void> {
    let hasChanges = false;
    for (const [id, reservation] of Object.entries(this.data.seatReservations)) {
      if (reservation.child_id === childId) {
        delete this.data.seatReservations[id];
        hasChanges = true;
      }
    }
    if (hasChanges) {
      this.saveData();
    }
  }

  async deleteSeatReservationsByClientId(clientId: string): Promise<void> {
    let hasChanges = false;
    for (const [id, reservation] of Object.entries(this.data.seatReservations)) {
      if (reservation.client_id === clientId) {
        delete this.data.seatReservations[id];
        hasChanges = true;
      }
    }
    if (hasChanges) {
      this.saveData();
    }
  }

  async getSeatReservationByDestinationAndSeat(
    destinationId: string,
    seatNumber: string
  ): Promise<SeatReservation | undefined> {
    const reservations = await this.getSeatReservationsByDestination(destinationId);
    for (const r of reservations) {
      if (r.status === "cancelled") continue;
      const client = await this.getClient(r.client_id);
      if (!client || (client as any).is_deleted)
        continue;
      if (r.seat_number === seatNumber) return r;
    }
    return undefined;
  }

  // Receipt operations
  async getReceipt(id: string): Promise<Receipt | undefined> {
    const receiptData = this.data.receipts[id];
    if (receiptData) {
      return this.convertTimestampsToDates({ id, ...receiptData });
    }
    return undefined;
  }

  async getReceipts(): Promise<Receipt[]> {
    return Object.keys(this.data.receipts).map((id) =>
      this.convertTimestampsToDates({ id, ...this.data.receipts[id] })
    );
  }

  async createReceipt(insertReceipt: InsertReceipt): Promise<Receipt> {
    const now = new Date();
    const receipt: Receipt = {
      id: this.generateId(),
      ...insertReceipt,
      created_at: now,
      updated_at: now,
    };

    const { id, ...receiptData } = receipt;
    this.data.receipts[receipt.id] = this.convertDatesToTimestamp(receiptData);
    this.saveData();

    return receipt;
  }

  async updateReceipt(id: string, receiptUpdate: Partial<InsertReceipt>): Promise<Receipt> {
    const existing = await this.getReceipt(id);
    if (!existing) throw new Error("Receipt not found");

    const now = new Date();
    const updated: Receipt = {
      ...existing,
      ...receiptUpdate,
      updated_at: now,
      created_at: receiptUpdate.payment_date
        ? new Date(receiptUpdate.payment_date)
        : existing.created_at,
    };

    const { id: _, ...receiptData } = updated;
    this.data.receipts[id] = this.convertDatesToTimestamp(receiptData);
    this.saveData();

    return updated;
  }

  async deleteReceipt(id: string): Promise<void> {
    delete this.data.receipts[id];
    this.saveData();
  }

  // Parcela operations
  async getParcela(id: string): Promise<Parcela | undefined> {
    const parcelaData = this.data.parcelas[id];
    if (parcelaData) {
      return this.convertTimestampsToDates({ id, ...parcelaData });
    }
    return undefined;
  }

  async getParcelas(): Promise<Parcela[]> {
    return Object.keys(this.data.parcelas).map((id) =>
      this.convertTimestampsToDates({ id, ...this.data.parcelas[id] })
    );
  }

  async getParcelasByClientId(clientId: string): Promise<Parcela[]> {
    const client = await this.getClient(clientId);
    if (!client || (client as any).is_deleted) {
      return [];
    }
    const parcelas = await this.getParcelas();
    return parcelas.filter((p) => p.client_id === clientId);
  }

  async getParcelasByMonth(month: number, year: number): Promise<Parcela[]> {
    const parcelas = await this.getParcelas();
    return parcelas.filter((p) => {
      const dueDate = new Date(p.due_date);
      return dueDate.getUTCMonth() + 1 === month && dueDate.getUTCFullYear() === year;
    });
  }

  async createParcela(insertParcela: InsertParcela): Promise<Parcela> {
    const now = new Date();
    const parcela: Parcela = {
      id: this.generateId(),
      ...insertParcela,
      status: insertParcela.status || "pending",
      created_at: now,
      updated_at: now,
    };

    const { id, ...parcelaData } = parcela;
    this.data.parcelas[parcela.id] = this.convertDatesToTimestamp(parcelaData);
    this.saveData();

    return parcela;
  }

  async updateParcela(id: string, parcelaUpdate: Partial<InsertParcela>): Promise<Parcela> {
    const existing = await this.getParcela(id);
    if (!existing) throw new Error("Parcela not found");

    const now = new Date();
    const updated: Parcela = {
      ...existing,
      ...parcelaUpdate,
      updated_at: now,
    };

    const { id: _, ...parcelaData } = updated;
    this.data.parcelas[id] = this.convertDatesToTimestamp(parcelaData);
    this.saveData();

    return updated;
  }

  async deleteParcela(id: string): Promise<void> {
    delete this.data.parcelas[id];
    this.saveData();
  }

  async deleteParcelasByClientId(clientId: string): Promise<void> {
    const parcelas = await this.getParcelasByClientId(clientId);
    for (const parcela of parcelas) {
      await this.deleteParcela(parcela.id);
    }
  }

  // Department operations
  async getDepartment(id: string): Promise<Department | undefined> {
    const deptData = this.data.departments[id];
    if (deptData) {
      return this.convertTimestampsToDates({ id, ...deptData });
    }
    return undefined;
  }

  async getDepartments(): Promise<Department[]> {
    return Object.keys(this.data.departments)
      .map((id) => this.convertTimestampsToDates({ id, ...this.data.departments[id] }))
      .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
  }

  async getActiveDepartments(): Promise<Department[]> {
    const depts = await this.getDepartments();
    return depts.filter((d) => d.is_active);
  }

  async createDepartment(insertDepartment: InsertDepartment): Promise<Department> {
    const now = new Date();
    const department: Department = {
      id: this.generateId(),
      ...insertDepartment,
      created_at: now,
      updated_at: now,
    };

    const { id, ...deptData } = department;
    this.data.departments[department.id] = this.convertDatesToTimestamp(deptData);
    this.saveData();

    return department;
  }

  async updateDepartment(
    id: string,
    departmentUpdate: Partial<InsertDepartment>
  ): Promise<Department> {
    const existing = await this.getDepartment(id);
    if (!existing) throw new Error("Department not found");

    const now = new Date();
    const updated: Department = {
      ...existing,
      ...departmentUpdate,
      updated_at: now,
    };

    const { id: _, ...deptData } = updated;
    this.data.departments[id] = this.convertDatesToTimestamp(deptData);
    this.saveData();

    return updated;
  }

  async deleteDepartment(id: string): Promise<void> {
    delete this.data.departments[id];
    this.saveData();
  }

  // Time record operations
  async getTimeRecord(id: string): Promise<TimeRecord | undefined> {
    const timeData = this.data.timeRecords[id];
    if (timeData) {
      return this.convertTimestampsToDates({ id, ...timeData });
    }
    return undefined;
  }

  async getTimeRecords(): Promise<TimeRecord[]> {
    return Object.keys(this.data.timeRecords).map((id) =>
      this.convertTimestampsToDates({ id, ...this.data.timeRecords[id] })
    );
  }

  async getTimeRecordsByUserId(userId: string): Promise<TimeRecord[]> {
    const records = await this.getTimeRecords();
    return records.filter((r) => r.user_id === userId);
  }

  async getTimeRecordsByDateRange(startDate: string, endDate: string): Promise<TimeRecord[]> {
    const records = await this.getTimeRecords();
    return records.filter((r) => r.date >= startDate && r.date <= endDate);
  }

  async getTodayTimeRecord(userId: string): Promise<TimeRecord | undefined> {
    const today = this.getLocalDateString();
    const records = await this.getTimeRecordsByUserId(userId);
    return records.find((r) => r.date === today);
  }

  async createTimeRecord(insertTimeRecord: InsertTimeRecord): Promise<TimeRecord> {
    const now = new Date();
    const timeRecord: TimeRecord = {
      id: this.generateId(),
      ...insertTimeRecord,
      created_at: now,
      updated_at: now,
    };

    const { id, ...timeData } = timeRecord;
    this.data.timeRecords[timeRecord.id] = this.convertDatesToTimestamp(timeData);
    this.saveData();

    return timeRecord;
  }

  async updateTimeRecord(
    id: string,
    timeRecordUpdate: Partial<InsertTimeRecord>
  ): Promise<TimeRecord> {
    const existing = await this.getTimeRecord(id);
    if (!existing) throw new Error("Time record not found");

    const now = new Date();
    const updated: TimeRecord = {
      ...existing,
      ...timeRecordUpdate,
      updated_at: now,
    };

    const { id: _, ...timeData } = updated;
    this.data.timeRecords[id] = this.convertDatesToTimestamp(timeData);
    this.saveData();

    return updated;
  }

  async deleteTimeRecord(id: string): Promise<void> {
    delete this.data.timeRecords[id];
    this.saveData();
  }

  // Facial verification session operations
  async getFacialVerificationSession(id: string): Promise<FacialVerificationSession | undefined> {
    const sessionData = this.data.facialVerificationSessions[id];
    if (sessionData) {
      return this.convertTimestampsToDates({ id, ...sessionData });
    }
    return undefined;
  }

  async getFacialVerificationSessionByToken(
    token: string
  ): Promise<FacialVerificationSession | undefined> {
    for (const [id, sessionData] of Object.entries(this.data.facialVerificationSessions)) {
      if (
        (sessionData as any).session_token === token ||
        (sessionData as any).verification_token === token
      ) {
        return this.convertTimestampsToDates({ id, ...sessionData });
      }
    }
    return undefined;
  }

  async createFacialVerificationSession(
    insertSession: InsertFacialVerificationSession
  ): Promise<FacialVerificationSession> {
    const now = new Date();
    const session: FacialVerificationSession = {
      id: this.generateId(),
      ...insertSession,
      created_at: now,
      updated_at: now,
    };

    const { id, ...sessionData } = session;
    this.data.facialVerificationSessions[session.id] =
      this.convertDatesToTimestamp(sessionData);
    this.saveData();

    return session;
  }

  async updateFacialVerificationSession(
    id: string,
    sessionUpdate: Partial<InsertFacialVerificationSession>
  ): Promise<FacialVerificationSession> {
    const existing = await this.getFacialVerificationSession(id);
    if (!existing) throw new Error("Facial verification session not found");

    const now = new Date();
    const updated: FacialVerificationSession = {
      ...existing,
      ...sessionUpdate,
      updated_at: now,
    };

    const { id: _, ...sessionData } = updated;
    this.data.facialVerificationSessions[id] = this.convertDatesToTimestamp(sessionData);
    this.saveData();

    return updated;
  }

  async deleteFacialVerificationSession(id: string): Promise<void> {
    delete this.data.facialVerificationSessions[id];
    this.saveData();
  }

  async cleanupExpiredSessions(): Promise<void> {
    const now = new Date();
    for (const [id, sessionData] of Object.entries(this.data.facialVerificationSessions)) {
      const session = sessionData as any;
      if (session.expires_at && new Date(session.expires_at) < now) {
        delete this.data.facialVerificationSessions[id];
      }
    }
    this.saveData();
  }

  // Discount approval request operations
  async getDiscountApprovalRequest(id: string): Promise<DiscountApprovalRequest | undefined> {
    const requestData = this.data.discountApprovalRequests[id];
    if (requestData) {
      return this.convertTimestampsToDates({ id, ...requestData });
    }
    return undefined;
  }

  async getDiscountApprovalRequests(): Promise<DiscountApprovalRequest[]> {
    return Object.keys(this.data.discountApprovalRequests).map((id) =>
      this.convertTimestampsToDates({
        id,
        ...this.data.discountApprovalRequests[id],
      })
    );
  }

  async getPendingDiscountApprovalRequests(): Promise<DiscountApprovalRequest[]> {
    const requests = await this.getDiscountApprovalRequests();
    return requests.filter((r) => r.status === "pending");
  }

  async createDiscountApprovalRequest(
    request: InsertDiscountApprovalRequest
  ): Promise<DiscountApprovalRequest> {
    const now = new Date();
    const discountRequest: DiscountApprovalRequest = {
      id: this.generateId(),
      ...request,
      status: "pending",
      created_at: now,
      updated_at: now,
    };

    const { id, ...requestData } = discountRequest;
    this.data.discountApprovalRequests[discountRequest.id] =
      this.convertDatesToTimestamp(requestData);
    this.saveData();

    return discountRequest;
  }

  async approveDiscountRequest(
    id: string,
    vadminId: string,
    vadminName: string,
    maxDiscountPercentage: number
  ): Promise<DiscountApprovalRequest> {
    const existing = await this.getDiscountApprovalRequest(id);
    if (!existing) throw new Error("Discount approval request not found");

    const now = new Date();
    const updated: DiscountApprovalRequest = {
      ...existing,
      status: "approved",
      approved_by_email: vadminId,
      approved_by_name: vadminName,
      approval_notes: `Max discount: ${maxDiscountPercentage}%`,
      updated_at: now,
    };

    const { id: _, ...requestData } = updated;
    this.data.discountApprovalRequests[id] = this.convertDatesToTimestamp(requestData);
    this.saveData();

    return updated;
  }

  async rejectDiscountRequest(
    id: string,
    vadminId: string,
    vadminName: string,
    reason?: string
  ): Promise<DiscountApprovalRequest> {
    const existing = await this.getDiscountApprovalRequest(id);
    if (!existing) throw new Error("Discount approval request not found");

    const now = new Date();
    const updated: DiscountApprovalRequest = {
      ...existing,
      status: "rejected",
      approved_by_email: vadminId,
      approved_by_name: vadminName,
      approval_notes: reason,
      updated_at: now,
    };

    const { id: _, ...requestData } = updated;
    this.data.discountApprovalRequests[id] = this.convertDatesToTimestamp(requestData);
    this.saveData();

    return updated;
  }

  async deleteDiscountApprovalRequest(id: string): Promise<void> {
    delete this.data.discountApprovalRequests[id];
    this.saveData();
  }

  // Invitation link operations
  async getInvitationLink(linkToken: string): Promise<InvitationLink | undefined> {
    for (const [id, linkData] of Object.entries(this.data.invitationLinks)) {
      if ((linkData as any).link_token === linkToken) {
        return this.convertTimestampsToDates({ id, ...linkData });
      }
    }
    return undefined;
  }

  async createInvitationLink(link: InsertInvitationLink): Promise<InvitationLink> {
    const now = new Date();
    const linkToken = `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const invitationLink: InvitationLink = {
      id: this.generateId(),
      link_token: linkToken,
      ...link,
      created_at: now,
      used_count: 0,
    };

    const { id, ...linkData } = invitationLink;
    this.data.invitationLinks[invitationLink.id] = this.convertDatesToTimestamp(linkData);
    this.saveData();

    return invitationLink;
  }

  async updateInvitationLinkUsage(linkToken: string): Promise<InvitationLink | undefined> {
    const link = await this.getInvitationLink(linkToken);
    if (!link) return undefined;

    const updated = {
      ...this.data.invitationLinks[link.id],
      used_count: ((this.data.invitationLinks[link.id] as any).used_count || 0) + 1,
      last_used_at: new Date().toISOString(),
    };

    this.data.invitationLinks[link.id] = updated;
    this.saveData();

    return this.convertTimestampsToDates({ id: link.id, ...updated });
  }

  // CRM Task operations
  async getCrmTask(id: string): Promise<CrmTask | undefined> {
    const taskData = this.data.crmTasks[id];
    if (taskData) {
      return this.convertTimestampsToDates({ id, ...taskData });
    }
    return undefined;
  }

  async getCrmTasks(): Promise<CrmTask[]> {
    return Object.keys(this.data.crmTasks).map((id) =>
      this.convertTimestampsToDates({ id, ...this.data.crmTasks[id] })
    );
  }

  async getCrmTasksByUserId(userId: string): Promise<CrmTask[]> {
    const tasks = await this.getCrmTasks();
    return tasks.filter((t) => t.assigned_to_email === userId || t.assigned_by_user_id === userId);
  }

  async getCrmTasksCreatedBy(userId: string): Promise<CrmTask[]> {
    const tasks = await this.getCrmTasks();
    return tasks.filter((t) => t.assigned_by_user_id === userId);
  }

  async createCrmTask(insertTask: InsertCrmTask): Promise<CrmTask> {
    const now = new Date();
    const checklist = insertTask.checklist || [];
    const completedItems = checklist.filter((item) => item.done).length;
    const totalItems = checklist.length;
    const completion_percentage =
      totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    const task: CrmTask = {
      id: this.generateId(),
      ...insertTask,
      status: "pending",
      completion_percentage,
      created_at: now,
      updated_at: now,
    };

    const { id, ...taskData } = task;
    this.data.crmTasks[task.id] = this.convertDatesToTimestamp(taskData);
    this.saveData();

    return task;
  }

  async updateCrmTask(
    id: string,
    updates: Partial<InsertCrmTask> & {
      status?: "pending" | "in_progress" | "completed";
      completed_at?: Date | null;
      completion_percentage?: number;
    }
  ): Promise<CrmTask> {
    const existing = await this.getCrmTask(id);
    if (!existing) throw new Error("Task not found");

    const now = new Date();
    const checklist =
      updates.checklist !== undefined ? updates.checklist : existing.checklist || [];
    const completedItems = checklist.filter((item) => item.done).length;
    const totalItems = checklist.length;
    const autoPercentage =
      totalItems > 0
        ? Math.round((completedItems / totalItems) * 100)
        : updates.completion_percentage ?? existing.completion_percentage ?? 0;

    const updated: CrmTask = {
      ...existing,
      ...updates,
      completion_percentage:
        updates.checklist !== undefined
          ? autoPercentage
          : updates.completion_percentage ?? existing.completion_percentage ?? 0,
      updated_at: now,
    };

    const { id: _, ...taskData } = updated;
    this.data.crmTasks[id] = this.convertDatesToTimestamp(taskData);
    this.saveData();

    return updated;
  }

  async deleteCrmTask(id: string): Promise<void> {
    delete this.data.crmTasks[id];
    this.saveData();
  }

  // Notification operations
  async getNotifications(userEmail: string, unreadOnly?: boolean): Promise<Notification[]> {
    let notifications = Object.keys(this.data.notifications)
      .map((id) => this.convertTimestampsToDates({ id, ...this.data.notifications[id] }))
      .filter((n: any) => n.user_email === userEmail);

    if (unreadOnly) {
      notifications = notifications.filter((n: any) => !n.read);
    }

    return notifications.sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const now = new Date();
    const notification: Notification = {
      id: this.generateId(),
      ...insertNotification,
      read: false,
      created_at: now,
      updated_at: now,
    };

    const { id, ...notificationData } = notification;
    this.data.notifications[notification.id] =
      this.convertDatesToTimestamp(notificationData);
    this.saveData();

    return notification;
  }

  async markNotificationAsRead(notificationId: string): Promise<Notification> {
    const existing = this.data.notifications[notificationId];
    if (!existing) throw new Error("Notification not found");

    const updated = { ...existing, read: true, updated_at: new Date().toISOString() };
    this.data.notifications[notificationId] = updated;
    this.saveData();

    return this.convertTimestampsToDates({ id: notificationId, ...updated });
  }

  async checkAndCreateBillReminders(): Promise<void> {
    const bills = await this.getBills();
    const now = new Date();
    const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    for (const bill of bills) {
      if (bill.status === "pending") {
        const billDate = new Date(bill.due_date);
        if (billDate > now && billDate <= fiveDaysFromNow) {
          const existingNotifications = await this.getNotifications(
            bill.created_by_email,
            true
          );
          const reminderExists = existingNotifications.some(
            (n: any) => n.related_id === bill.id && n.type === "payment_reminder"
          );

          if (!reminderExists) {
            await this.createNotification({
              user_email: bill.created_by_email,
              type: "payment_reminder",
              title: "Lembrete: Conta Vencendo",
              message: `${bill.title} vence em ${new Date(bill.due_date).toLocaleDateString(
                "pt-BR"
              )} - R$ ${bill.amount.toFixed(2)}`,
              related_id: bill.id,
            });
          }
        }
      }
    }

    // Check for overdue parcelas (installments)
    const parcelas = await this.getParcelas();
    const clients = await this.getClients();
    const admins = await this.getUsers();

    for (const parcela of parcelas) {
      if (!parcela.is_paid) {
        const dueDate = new Date(parcela.due_date);
        if (dueDate < now) {
          // Find client info
          const client = clients.find(c => c.id === parcela.client_id);
          const clientName = client ? `${client.first_name} ${client.last_name}` : parcela.client_name || "Cliente";

          // Notify all admins/vadmins
          for (const admin of admins) {
            const existingNotifications = await this.getNotifications(admin.email, true);
            const reminderExists = existingNotifications.some(
              (n: any) => n.related_id === parcela.id && n.type === "parcela_overdue"
            );

            if (!reminderExists) {
              await this.createNotification({
                user_email: admin.email,
                type: "parcela_overdue",
                title: "Parcela Atrasada",
                message: `O cliente ${clientName} possui uma parcela de R$ ${parcela.amount.toFixed(2)} vencida em ${dueDate.toLocaleDateString("pt-BR")}.`,
                related_id: parcela.id,
              });
            }
          }
        }
      }
    }
  }

  // Funcionário operations (RH database)
  async getFuncionario(id: string): Promise<Funcionario | undefined> {
    const funcData = this.rhData.funcionarios[id];
    if (funcData) {
      return this.convertTimestampsToDates({ id, ...funcData });
    }
    return undefined;
  }

  async getFuncionarios(): Promise<Funcionario[]> {
    return Object.keys(this.rhData.funcionarios).map((id) =>
      this.convertTimestampsToDates({ id, ...this.rhData.funcionarios[id] })
    );
  }

  async getActiveFuncionarios(): Promise<Funcionario[]> {
    const funcionarios = await this.getFuncionarios();
    return funcionarios.filter((f) => f.is_active);
  }

  async getTrialFuncionarios(): Promise<Funcionario[]> {
    const funcionarios = await this.getFuncionarios();
    return funcionarios.filter(
      (f) => f.trial_status === "active" || f.trial_status === "pending"
    );
  }

  async createFuncionario(insertFuncionario: InsertFuncionario): Promise<Funcionario> {
    const now = new Date();
    const funcionario: Funcionario = {
      id: this.generateId(),
      ...insertFuncionario,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    const { id, ...funcData } = funcionario;
    this.rhData.funcionarios[funcionario.id] = this.convertDatesToTimestamp(funcData);
    this.saveRHData();

    return funcionario;
  }

  async createTrialFuncionario(
    insertFuncionario: InsertFuncionario & { trial_period_days: number }
  ): Promise<Funcionario> {
    const now = new Date();
    const funcionario: Funcionario = {
      id: this.generateId(),
      ...insertFuncionario,
      is_active: true,
      trial_status: "active",
      trial_start_date: now,
      trial_period_days: insertFuncionario.trial_period_days,
      created_at: now,
      updated_at: now,
    };

    const { id, ...funcData } = funcionario;
    this.rhData.funcionarios[funcionario.id] = this.convertDatesToTimestamp(funcData);
    this.saveRHData();

    return funcionario;
  }

  async updateFuncionario(id: string, updates: Partial<InsertFuncionario>): Promise<Funcionario> {
    const existing = await this.getFuncionario(id);
    if (!existing) throw new Error("Funcionário not found");

    const updated: Funcionario = {
      ...existing,
      ...updates,
      updated_at: new Date(),
    };

    const { id: _, ...funcData } = updated;
    this.rhData.funcionarios[id] = this.convertDatesToTimestamp(funcData);
    this.saveRHData();

    return updated;
  }

  async activateTrialFuncionario(id: string): Promise<Funcionario> {
    const existing = await this.getFuncionario(id);
    if (!existing) throw new Error("Funcionário not found");

    const updated: Funcionario = {
      ...existing,
      trial_status: "completed",
      updated_at: new Date(),
    };

    const { id: _, ...funcData } = updated;
    this.rhData.funcionarios[id] = this.convertDatesToTimestamp(funcData);
    this.saveRHData();

    return updated;
  }

  async terminateFuncionario(id: string, terminationReason: string): Promise<Funcionario> {
    const existing = await this.getFuncionario(id);
    if (!existing) throw new Error("Funcionário not found");

    const updated: Funcionario = {
      ...existing,
      is_active: false,
      termination_date: new Date(),
      termination_reason: terminationReason,
      updated_at: new Date(),
    };

    const { id: _, ...funcData } = updated;
    this.rhData.funcionarios[id] = this.convertDatesToTimestamp(funcData);
    this.saveRHData();

    return updated;
  }

  async deleteFuncionario(id: string): Promise<void> {
    delete this.rhData.funcionarios[id];
    this.saveRHData();
  }

  // Proposal operations (RH database)
  async getProposal(id: string): Promise<Proposal | undefined> {
    const proposalData = this.rhData.proposals[id];
    if (proposalData) {
      return this.convertTimestampsToDates({ id, ...proposalData });
    }
    return undefined;
  }

  async getProposals(): Promise<Proposal[]> {
    return Object.keys(this.rhData.proposals).map((id) =>
      this.convertTimestampsToDates({ id, ...this.rhData.proposals[id] })
    );
  }

  async createProposal(proposal: Proposal): Promise<Proposal> {
    const { id, ...proposalData } = proposal;
    this.rhData.proposals[proposal.id] = this.convertDatesToTimestamp(proposalData);
    this.saveRHData();
    return proposal;
  }

  async deleteProposal(id: string): Promise<void> {
    delete this.rhData.proposals[id];
    this.saveRHData();
  }

  // Cancelled Client Credit operations
  async getCancelledClientCredit(id: string): Promise<CancelledClientCredit | undefined> {
    const creditData = this.data.cancelledClientCredits[id];
    if (creditData) {
      return this.convertTimestampsToDates({ id, ...creditData });
    }
    return undefined;
  }

  async getCancelledClientCredits(): Promise<CancelledClientCredit[]> {
    return Object.keys(this.data.cancelledClientCredits).map((id) =>
      this.convertTimestampsToDates({ id, ...this.data.cancelledClientCredits[id] })
    );
  }

  async getCancelledClientCreditsByClientId(clientId: string): Promise<CancelledClientCredit[]> {
    const credits = await this.getCancelledClientCredits();
    return credits.filter((c) => c.client_id === clientId);
  }

  async getActiveCancelledClientCredits(): Promise<CancelledClientCredit[]> {
    const credits = await this.getCancelledClientCredits();
    return credits.filter((c) => !c.is_expired && !c.is_used);
  }

  async getExpiredCancelledClientCredits(): Promise<CancelledClientCredit[]> {
    const credits = await this.getCancelledClientCredits();
    return credits.filter((c) => c.is_expired);
  }

  async createCancelledClientCredit(
    credit: InsertCancelledClientCredit
  ): Promise<CancelledClientCredit> {
    const now = new Date();
    const newCredit: CancelledClientCredit = {
      ...credit,
      id: this.generateId(),
      is_expired: false,
      is_used: false,
      created_at: now,
      updated_at: now,
    };

    const { id, ...creditData } = newCredit;
    this.data.cancelledClientCredits[newCredit.id] =
      this.convertDatesToTimestamp(creditData);
    this.saveData();

    return newCredit;
  }

  async updateCancelledClientCredit(
    id: string,
    credit: Partial<CancelledClientCredit>
  ): Promise<CancelledClientCredit> {
    const existing = await this.getCancelledClientCredit(id);
    if (!existing) throw new Error("Cancelled client credit not found");

    const updated = { ...existing, ...credit, updated_at: new Date() };

    const { id: _, ...creditData } = updated;
    this.data.cancelledClientCredits[id] = this.convertDatesToTimestamp(creditData);
    this.saveData();

    return updated;
  }

  async markCreditAsUsed(id: string, usedForClientId: string): Promise<CancelledClientCredit> {
    return this.updateCancelledClientCredit(id, {
      is_used: true,
      used_at: new Date(),
      used_for_client_id: usedForClientId,
    });
  }

  async updateExpiredCredits(): Promise<number> {
    const credits = await this.getCancelledClientCredits();
    const now = new Date();
    let expiredCount = 0;
    for (const credit of credits) {
      if (!credit.is_expired && !credit.is_used && new Date(credit.expires_at) < now) {
        await this.updateCancelledClientCredit(credit.id, { is_expired: true });
        expiredCount++;
      }
    }
    return expiredCount;
  }

  async cancelClient(
    clientId: string,
    reason: string,
    cancelledByEmail: string,
    cancelledByName: string
  ): Promise<{
    client: Client;
    credit: CancelledClientCredit;
    cancelledReceipts: Receipt[];
    removedSeatReservations: SeatReservation[];
  }> {
    const client = await this.getClient(clientId);
    if (!client) throw new Error("Client not found");

    const allReceipts = await this.getReceipts();
    const clientReceipts = allReceipts.filter(
      (r) => r.client_id === clientId
    );
    const receiptsTotal = clientReceipts.reduce((sum, r) => sum + r.amount, 0);

    const downPaymentAmount = client.down_payment || 0;
    const totalPaid = receiptsTotal + downPaymentAmount;

    const allReservations = await this.getSeatReservations();
    const clientReservations = allReservations.filter((r) => r.client_id === clientId);

    for (const reservation of clientReservations) {
      await this.deleteSeatReservation(reservation.id);
    }

    const cancelledAt = new Date();
    const expiresAt = new Date(cancelledAt);
    expiresAt.setDate(expiresAt.getDate() + 90);

    const credit = await this.createCancelledClientCredit({
      client_id: clientId,
      client_name: `${client.first_name} ${client.last_name}`,
      client_phone: client.phone,
      client_email: client.email,
      destination: client.destination,
      original_travel_date: client.travel_date,
      total_paid: totalPaid,
      credit_amount: totalPaid,
      cancellation_reason: reason,
      cancelled_at: cancelledAt,
      expires_at: expiresAt,
      cancelled_by_email: cancelledByEmail,
      cancelled_by_name: cancelledByName,
      receipt_ids: clientReceipts.map((r) => r.id),
    });

    const updatedClient = await this.updateClient(clientId, {
      is_cancelled: true,
    } as any);

    return {
      client: updatedClient,
      credit,
      cancelledReceipts: clientReceipts,
      removedSeatReservations: clientReservations,
    };
  }

  // Bill operations
  async getBill(id: string): Promise<Bill | undefined> {
    const billData = this.data.bills[id];
    if (billData) {
      return this.convertTimestampsToDates({ id, ...billData });
    }
    return undefined;
  }

  async getBills(type?: "pagar" | "receber"): Promise<Bill[]> {
    const now = new Date();
    let bills = Object.keys(this.data.bills).map((id) => {
      const bill = this.convertTimestampsToDates({ id, ...this.data.bills[id] });
      if (bill.status !== "paid" && new Date(bill.due_date) < now) {
        return { ...bill, status: "overdue" as const };
      }
      return bill;
    });

    if (type) {
      bills = bills.filter((b: any) => b.type === type);
    }

    return bills.sort(
      (a: any, b: any) =>
        new Date(b.due_date).getTime() - new Date(a.due_date).getTime()
    );
  }

  async getBillsByStatus(status: "pending" | "paid" | "overdue"): Promise<Bill[]> {
    const bills = await this.getBills();
    return bills.filter((b) => b.status === status);
  }

  async createBill(
    insertBill: InsertBill & { created_by_email: string; created_by_name: string }
  ): Promise<Bill> {
    const now = new Date();
    const bill: Bill = {
      id: this.generateId(),
      ...insertBill,
      status: "pending",
      created_at: now,
      updated_at: now,
    };

    const { id, ...billData } = bill;
    this.data.bills[bill.id] = this.convertDatesToTimestamp(billData);
    this.saveData();

    return bill;
  }

  async updateBill(
    id: string,
    updates: Partial<InsertBill> & {
      status?: "pending" | "paid" | "overdue";
      paid_at?: Date | null;
    }
  ): Promise<Bill> {
    const existing = await this.getBill(id);
    if (!existing) throw new Error("Bill not found");

    const now = new Date();
    const { paid_at, ...otherUpdates } = updates;
    const updated: Bill = {
      ...existing,
      ...otherUpdates,
      updated_at: now,
    };

    if (paid_at !== undefined) {
      (updated as any).paid_at = paid_at || undefined;
    }

    const { id: _, ...billData } = updated;
    this.data.bills[id] = this.convertDatesToTimestamp(billData);
    this.saveData();

    return updated;
  }

  async deleteBill(id: string): Promise<void> {
    delete this.data.bills[id];
    this.saveData();
  }
}
