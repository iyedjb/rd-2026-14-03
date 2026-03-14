import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import QRCode from "qrcode";
import { nanoid } from "nanoid";

// Helper function to parse date to UTC Date (preserves the date components without timezone shift)
function parseToUTCDate(dateValue: string | Date | undefined | null): Date {
  if (!dateValue) return new Date();
  
  if (dateValue instanceof Date) {
    // Already a Date - recreate as UTC midnight to ensure consistency
    return new Date(Date.UTC(dateValue.getUTCFullYear(), dateValue.getUTCMonth(), dateValue.getUTCDate()));
  }
  
  // Parse string - handle ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)
  const dateStr = String(dateValue).split('T')[0];
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return new Date(Date.UTC(year, month, day));
    }
  }
  
  return new Date();
}

// Helper function to calculate parcela due dates based on installment_due_date (day of month)
function calculateParcelaDueDate(installmentDueDate: string | undefined, installmentIndex: number, now: Date = new Date()): Date {
  // Parse the day of month from installment_due_date
  // Supports formats: "10", "dia 10", "Todo dia 10", "2024-01-10", etc.
  let dayOfMonth = 1; // default to 1st
  
  if (installmentDueDate) {
    // Check if it's a full date string (YYYY-MM-DD)
    if (installmentDueDate.includes('-') && installmentDueDate.match(/^\d{4}-\d{2}-\d{2}/)) {
      // It's a full date, extract the day
      const dateParts = installmentDueDate.split('-');
      if (dateParts.length === 3) {
        dayOfMonth = parseInt(dateParts[2], 10) || 1;
      }
    } else {
      // Try to extract any number from the string (e.g., "Todo dia 10" -> 10, "dia 5" -> 5)
      const numberMatch = installmentDueDate.match(/\d+/);
      if (numberMatch) {
        dayOfMonth = parseInt(numberMatch[0], 10) || 1;
      }
    }
  }
  
  // Ensure day is valid (1-28 to avoid month-end issues)
  dayOfMonth = Math.max(1, Math.min(28, dayOfMonth));
  
  // First parcela is due on that day of the next month
  // Subsequent parcelas are due on that day of following months
  const dueDate = new Date(now.getFullYear(), now.getMonth() + 1 + installmentIndex, dayOfMonth);
  
  console.log(`[Parcela] installment_due_date="${installmentDueDate}" -> parsed day=${dayOfMonth}, index=${installmentIndex}, due date=${dueDate.toISOString()}`);
  
  return dueDate;
}
import {
  insertUserSchema,
  updateUserSchema,
  insertClientSchema,
  baseInsertClientSchema,
  updateClientSchema,
  insertDestinationSchema,
  insertChildSchema,
  monthlyReportSchema,
  insertFinancialTransactionSchema,
  clientApprovalResponseSchema,
  insertProspectSchema,
  updateProspectSchema,
  insertBusSchema,
  insertSeatReservationSchema,
  insertReceiptSchema,
  insertParcelaSchema,
  insertDepartmentSchema,
  insertTimeRecordSchema,
  insertFacialVerificationSessionSchema,
  chatRequestSchema,
  publicInvitationSubmissionSchema,
  insertCrmTaskSchema,
  insertFuncionarioSchema,
  insertBillSchema,
  insertInactiveClientSchema,
  updateInactiveClientSchema,
  type Funcionario,
  type Bill
} from "@shared/schema";

import { generateTerminationPDF, generateMonthlyReportPDF } from "./utils/pdf-generator";
import { generateProposalPDF } from "./utils/proposal-generator";
import { insertProposalSchema, type Proposal } from "@shared/schema";

// Firebase Admin for authentication middleware
import { getAuth } from 'firebase-admin/auth';

// Extend Express Request type to include user from auth middleware
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email: string;
        email_verified?: boolean;
      };
    }
  }
}

// Authentication middleware to verify Firebase ID tokens
async function authenticateToken(req: any, res: any, next: any) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token);
    
    // Check if email is defined
    if (!decodedToken.email) {
      return res.status(401).json({ error: 'Email is required' });
    }
    
    // Check if email domain is authorized for access
    const allowedDomains = ['rodabemturismo.com', 'vuro.com.br'];
    const emailDomain = decodedToken.email.split('@')[1]?.toLowerCase();
    const isAuthorizedDomain = emailDomain ? allowedDomains.includes(emailDomain) : false;
    
    // Vadmin emails don't need verification requirement
    const vadminEmails = ['alda@rodabemturismo.com', 'daniel@rodabemturismo.com', 'rosinha@rodabemturismo.com', 'iyed@rodabemturismo.com'];
    const isVadmin = vadminEmails.includes(decodedToken.email.toLowerCase());
    
    // Check if user exists in our system and has valid role (only if needed for verification check)
    let userInSystem = null;
    let hasValidRole = false;
    
    if (!decodedToken.email_verified && !isVadmin && !isAuthorizedDomain) {
      // Only check user role if email isn't verified and domain isn't authorized
      try {
        const storage = await import("./storage").then(m => m.storage);
        userInSystem = await storage.getUser(decodedToken.uid);
        hasValidRole = Boolean(userInSystem && (userInSystem.role === 'admin' || userInSystem.role === 'vadmin'));
      } catch (error) {
        // User lookup failed, continue with regular email verification
      }
      
      if (!hasValidRole) {
        return res.status(401).json({ error: 'Email must be verified' });
      }
    }
    
    req.user = decodedToken; // Add user info to request
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Role-based authorization middleware
function requireRole(allowedRoles: string[]) {
  return async (req: any, res: any, next: any) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const storage = await import("./storage").then(m => m.storage);
      const user = await storage.getUser(req.user.uid);
      
      if (!user) {
        return res.status(403).json({ error: 'User not found in system' });
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      req.userRole = user.role; // Add role info to request
      next();
    } catch (error) {
      console.error('Role verification failed:', error);
      return res.status(500).json({ error: 'Authorization failed' });
    }
  };
}

// Validation middleware factory
function validateBody<T>(schema: z.ZodSchema<T>, options?: { preserveUnknown?: boolean }) {
  return (req: any, res: any, next: any) => {
    try {
      // Parse dates in the request body if they exist
      const bodyWithDates = parseRequestDates(req.body);
      
      // If preserveUnknown is true, merge validated data with original body to keep extra fields
      const validatedData = schema.parse(bodyWithDates);
      
      if (options?.preserveUnknown) {
        // Preserve unknown fields (like children) that Zod would otherwise strip
        req.body = { ...bodyWithDates, ...validatedData };
      } else {
        req.body = validatedData;
      }
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validationError.message 
        });
      }
      return res.status(400).json({ 
        error: "Invalid request data" 
      });
    }
  };
}

// Helper function to parse ISO date strings to Date objects
function parseRequestDates(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    // Check if string is an ISO date format with time
    const isoDateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    // Check if string is a simple date format (YYYY-MM-DD)
    const simpleDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    
    if (isoDateTimeRegex.test(obj) || simpleDateRegex.test(obj)) {
      const parsedDate = new Date(obj);
      // Ensure the date is valid
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(parseRequestDates);
  }
  
  if (typeof obj === 'object') {
    const parsed: any = {};
    for (const key in obj) {
      parsed[key] = parseRequestDates(obj[key]);
    }
    return parsed;
  }
  
  return obj;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const storage = await import("./storage").then(m => m.storage);

  // Database backup download - no auth required
  app.get("/database.json", (req, res) => {
    res.download('./data/database.json', 'database-backup.json');
  });

  app.get("/rh-database.json", (req, res) => {
    res.download('./data/rh-database.json', 'rh-database-backup.json');
  });

  // TEMPORARY FIX: Link clients as companions for hotel PDF room grouping
  app.post("/api/fix-hotel-rooms", async (req, res) => {
    try {
      const { destination, groups } = req.body;
      // groups format: [{ main: "client name", companions: ["name1", "name2"], type: "CASAL" or "TRIO" }]
      
      // Get passengers from seat reservations for this destination (more reliable)
      const passengers = await storage.getAllPassengersByDestination(destination);
      const clients = await storage.getClients();
      
      // Create a map of passenger names to their client IDs and data
      // Normalize names by collapsing multiple spaces
      const normalizeName = (name: string) => name.toLowerCase().trim().replace(/\s+/g, ' ');
      
      const passengerMap = new Map<string, any>();
      passengers.forEach((p: any) => {
        passengerMap.set(normalizeName(p.client_name), p);
      });
      
      // Also add all clients as fallback
      const destinationClients = clients.filter((c: any) => c.destination === destination);
      destinationClients.forEach((c: any) => {
        const name = `${c.first_name} ${c.last_name}`.toLowerCase().trim();
        if (!passengerMap.has(name)) {
          passengerMap.set(name, { client_id: c.id, client_name: `${c.first_name} ${c.last_name}`, client: c });
        }
      });
      
      const results = [];
      
      for (const group of groups) {
        const mainClientName = normalizeName(group.main);
        
        // Search in passenger map first
        let mainPassenger: any = null;
        for (const [name, passenger] of Array.from(passengerMap.entries())) {
          if (name.includes(mainClientName) || mainClientName.includes(name)) {
            mainPassenger = passenger;
            break;
          }
        }
        
        // Get the actual client record
        const mainClient = mainPassenger?.client || (mainPassenger?.client_id ? await storage.getClient(mainPassenger.client_id) : null);
        
        if (!mainClient) {
          results.push({ group: group.main, error: "Main client not found" });
          continue;
        }
        
        const companionsAdded = [];
        for (const companionEntry of group.companions) {
          // Handle both string names and object data
          if (typeof companionEntry === 'object' && companionEntry.name) {
            // Manual companion data provided - add directly as child
            const child = await storage.createChild({
              client_id: mainClient.id,
              name: companionEntry.name,
              birthdate: companionEntry.birthdate ? parseToUTCDate(companionEntry.birthdate) : new Date('1970-01-01'),
              cpf: companionEntry.cpf || undefined,
              rg: companionEntry.rg || undefined,
              relationship: 'cônjuge',
              price: 0,
            });
            companionsAdded.push({ name: companionEntry.name, type: 'manual', id: child.id });
            continue;
          }
          
          const compName = normalizeName(companionEntry as string);
          
          // Search in passenger map
          let companionPassenger: any = null;
          for (const [name, passenger] of Array.from(passengerMap.entries())) {
            if (name.includes(compName) || compName.includes(name)) {
              companionPassenger = passenger;
              break;
            }
          }
          
          const companionClient = companionPassenger?.client || (companionPassenger?.client_id ? await storage.getClient(companionPassenger.client_id) : null);
          
          if (!companionClient) {
            results.push({ group: group.main, companion: companionEntry, error: "Companion not found" });
            continue;
          }
          
          // Create companion entry linking to main client
          const child = await storage.createChild({
            client_id: mainClient.id,
            name: `${companionClient.first_name} ${companionClient.last_name}`,
            birthdate: companionClient.birthdate ? parseToUTCDate(companionClient.birthdate) : new Date('1970-01-01'),
            cpf: companionClient.cpf || undefined,
            rg: companionClient.rg || undefined,
            relationship: 'cônjuge',
            price: companionClient.travel_price || 0,
          });
          
          // Update seat reservation to point to main client
          const seatReservations = await storage.getSeatReservations();
          const companionSeat = seatReservations.find((s: any) => s.client_id === companionClient.id);
          if (companionSeat) {
            await storage.updateSeatReservation(companionSeat.id, {
              client_id: mainClient.id,
              is_child: true,
              child_id: child.id,
            });
          }
          
          companionsAdded.push({ 
            name: `${companionClient.first_name} ${companionClient.last_name}`,
            originalClientId: companionClient.id,
            childId: child.id
          });
        }
        
        results.push({
          mainClient: { id: mainClient.id, name: `${mainClient.first_name} ${mainClient.last_name}` },
          companionsAdded,
          roomType: group.type
        });
      }
      
      res.json({ success: true, results });
    } catch (error) {
      console.error("Error fixing hotel rooms:", error);
      res.status(500).json({ error: "Failed to fix hotel rooms" });
    }
  });

  // User routes - protected with authentication and role-based authorization
  app.get("/api/users", authenticateToken, async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error getting users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", authenticateToken, requireRole(['vadmin']), async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error getting user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Delete user endpoint - VAdmin only
  app.delete("/api/users/:id", authenticateToken, requireRole(['vadmin']), async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      res.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Safe endpoint for current user - anyone can get their own profile
  app.get("/api/me", authenticateToken, async (req: any, res) => {
    try {
      let user = await storage.getUser(req.user.uid);
      if (!user) {
        return res.status(404).json({ error: "User profile not found" });
      }
      
      // Force update vadmin emails to vadmin role
      const vadminEmails = ['alda@rodabemturismo.com', 'daniel@rodabemturismo.com', 'rosinha@rodabemturismo.com', 'iyed@rodabemturismo.com'];
      if (vadminEmails.includes(req.user.email?.toLowerCase()) && user.role !== 'vadmin') {
        console.log(`🔧 Force upgrading ${req.user.email} to vadmin role`);
        user = await storage.updateUser(req.user.uid, { role: 'vadmin' });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error getting current user:", error);
      res.status(500).json({ error: "Failed to fetch user profile" });
    }
  });

  // DEPRECATED: Block old client-drafts endpoint (removed feature)
  // Log requests to identify source of old cached code
  app.all("/api/client-drafts*", (req: any, res) => {
    console.warn('🚨 DEPRECATED ENDPOINT ACCESSED: /api/client-drafts', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      referer: req.get('referer'),
    });
    res.status(410).json({ 
      error: "This endpoint has been removed. Please clear your browser cache and reload the application.",
      deprecated: true 
    });
  });

  // Initialize user on first login - creates user record with proper role based on email
  // Special authentication middleware for initialization - bypasses email verification for valid domains
  async function authenticateForInitialization(req: any, res: any, next: any) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.split(' ')[1];
      const auth = getAuth();
      const decodedToken = await auth.verifyIdToken(token);
      
      if (!decodedToken.email) {
        return res.status(401).json({ error: 'Email is required' });
      }
      
      // Check if email domain is allowed for initialization
      const allowedDomains = ['rodabemturismo.com', 'vuro.com.br'];
      const emailDomain = decodedToken.email.split('@')[1]?.toLowerCase();
      
      if (!allowedDomains.includes(emailDomain)) {
        return res.status(401).json({ error: 'Domain not authorized' });
      }
      
      req.user = decodedToken;
      next();
    } catch (error) {
      console.error('Token verification failed:', error);
      return res.status(401).json({ error: 'Invalid token' });
    }
  }

  app.post("/api/auth/initialize", authenticateForInitialization, async (req: any, res) => {
    try {
      const { uid, email } = req.user;
      const user = await storage.upsertUser(uid, email);
      res.json(user);
    } catch (error) {
      console.error("Error initializing user:", error);
      res.status(500).json({ error: "Failed to initialize user" });
    }
  });

  // Bootstrap endpoint for vadmin emails to upgrade their role
  app.post("/api/auth/bootstrap-vadmin", authenticateToken, async (req: any, res) => {
    try {
      const { uid, email } = req.user;
      
      // Check if email is in the vadmin list
      const vadminEmails = ['alda@rodabemturismo.com', 'daniel@rodabemturismo.com', 'rosinha@rodabemturismo.com', 'iyed@rodabemturismo.com'];
      if (!vadminEmails.includes(email?.toLowerCase())) {
        return res.status(403).json({ error: 'Not authorized to use this endpoint' });
      }
      
      // Update user role to vadmin
      const user = await storage.updateUser(uid, { role: 'vadmin' });
      res.json(user);
    } catch (error) {
      console.error("Error bootstrapping vadmin:", error);
      res.status(500).json({ error: "Failed to bootstrap vadmin role" });
    }
  });

  app.post("/api/reports/monthly", authenticateToken, async (req: any, res) => {
    try {
      const { month, year } = req.body;
      const clients = await storage.getClients();
      
      console.log(`[Report] Generating for ${month}/${year}. Total clients available: ${clients.length}`);
      
      // Filter clients created in the given month and year
      const filteredClients = clients.filter((c: any) => {
        // Use created_at if available, otherwise travel_date as a secondary fallback
        const dateSource = c.created_at || c.travel_date;
        if (!dateSource) return false;
        
        const createDate = new Date(dateSource);
        const matches = (createDate.getMonth() + 1) === parseInt(month) && createDate.getFullYear() === parseInt(year);
        
        if (matches) {
          console.log(`[Report] Match found: ${c.first_name} ${c.last_name} (Date: ${dateSource})`);
        }
        
        return matches;
      });

      console.log(`[Report] Filtered down to ${filteredClients.length} clients.`);

      const pdfBuffer = await generateMonthlyReportPDF(filteredClients, month, year);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Content-Disposition', `attachment; filename=relatorio-mensal-${month}-${year}.pdf`);
      res.status(200).send(pdfBuffer);
    } catch (error) {
      console.error("Error generating monthly report:", error);
      res.status(500).json({ error: "Failed to generate monthly report" });
    }
  });

  // Create user with Firebase Auth UID - only vadmin can create users
  app.post("/api/users", authenticateToken, requireRole(['vadmin']), validateBody(insertUserSchema), async (req, res) => {
    try {
      // Normalize email
      const normalizedEmail = req.body.email?.toLowerCase();
      if (!normalizedEmail) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Check if user with this email already exists
      const existingUser = await storage.getUserByEmail(normalizedEmail);
      if (existingUser) {
        return res.status(409).json({ error: "User with this email already exists" });
      }

      // Create user with normalized email
      const userData = { ...req.body, email: normalizedEmail };
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  // Update user - only vadmin can update users, and they can't change their own role
  app.put("/api/users/:id", authenticateToken, requireRole(['vadmin']), validateBody(updateUserSchema), async (req: any, res) => {
    try {
      // Prevent users from changing their own role
      if (req.user.uid === req.params.id && req.body.role) {
        return res.status(403).json({ error: "Cannot change your own role" });
      }

      // Normalize and check for email uniqueness if email is being updated
      let updateData = { ...req.body };
      if (req.body.email) {
        const normalizedEmail = req.body.email.toLowerCase();
        updateData.email = normalizedEmail;
        
        const existingUser = await storage.getUserByEmail(normalizedEmail);
        if (existingUser && existingUser.id !== req.params.id) {
          return res.status(409).json({ error: "User with this email already exists" });
        }
      }

      const user = await storage.updateUser(req.params.id, updateData);
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Delete user - only vadmin can delete users, and they can't delete themselves
  app.delete("/api/users/:id", authenticateToken, requireRole(['vadmin']), async (req: any, res) => {
    try {
      if (req.user.uid === req.params.id) {
        return res.status(403).json({ error: "Cannot delete your own account" });
      }

      await storage.deleteUser(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Update plan expiration date - users can update their own plan expiration
  app.patch("/api/me/plan-expiration", authenticateToken, async (req: any, res) => {
    try {
      const { host_plan_expiration_date } = req.body;
      
      if (!host_plan_expiration_date) {
        return res.status(400).json({ error: "host_plan_expiration_date is required" });
      }

      // Validate the date
      const expirationDate = new Date(host_plan_expiration_date);
      if (isNaN(expirationDate.getTime())) {
        return res.status(400).json({ error: "Invalid date format" });
      }

      // Update the user's plan expiration date
      const user = await storage.updateUser(req.user.uid, {
        host_plan_expiration_date: expirationDate,
      });

      res.json(user);
    } catch (error) {
      console.error("Error updating plan expiration date:", error);
      res.status(500).json({ error: "Failed to update plan expiration date" });
    }
  });

  // Inactive Client routes
  app.get("/api/inactive-clients", authenticateToken, requireRole(['admin', 'vadmin']), async (req, res) => {
    try {
      const clients = await storage.getInactiveClients();
      res.json({ 
        inactiveClients: clients, 
        pagination: { 
          currentPage: 1, 
          totalPages: 1, 
          totalItems: clients.length, 
          itemsPerPage: Math.max(1, clients.length) 
        } 
      });
    } catch (error) {
      console.error("Error getting inactive clients:", error);
      res.status(500).json({ error: "Failed to fetch inactive clients" });
    }
  });

  app.post("/api/inactive-clients", authenticateToken, requireRole(['admin', 'vadmin']), async (req, res) => {
    try {
      const parsed = insertInactiveClientSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid client data", errors: parsed.error.format() });
      const client = await storage.createInactiveClient(parsed.data);
      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating inactive client:", error);
      res.status(500).json({ error: "Failed to create inactive client" });
    }
  });

  app.put("/api/inactive-clients/:id", authenticateToken, requireRole(['admin', 'vadmin']), async (req, res) => {
    try {
      const parsed = updateInactiveClientSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid client data", errors: parsed.error.format() });
      const client = await storage.updateInactiveClient(req.params.id, parsed.data);
      res.json(client);
    } catch (error) {
      console.error("Error updating inactive client:", error);
      res.status(500).json({ error: "Failed to update inactive client" });
    }
  });

  app.delete("/api/inactive-clients/:id", authenticateToken, requireRole(['admin', 'vadmin']), async (req, res) => {
    try {
      await storage.deleteInactiveClient(req.params.id);
      res.sendStatus(200);
    } catch (error) {
      console.error("Error deleting inactive client:", error);
      res.status(500).json({ error: "Failed to delete inactive client" });
    }
  });

  // Client routes with server-side pagination and filtering
  app.get("/api/clients", authenticateToken, requireRole(['admin', 'vadmin']), async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const destination = req.query.destination as string;
      const client_type = req.query.client_type as string;
      const status = req.query.status as string;
      const sortBy = req.query.sortBy as string;
      
      let clients = await storage.getClients();
      
      // Log total clients fetched for debugging
      console.log(`[API] Total clients from storage: ${clients.length}`);
      
      // When searching, include deleted clients so they appear with a "deleted" badge
      // When NOT searching, filter out deleted clients to hide them from the main list
      if (!search) {
        clients = clients.filter((client: any) => {
          const isDeleted = client.is_deleted === true || client.is_deleted === "true" || client.is_deleted === 1;
          const isCancelled = client.is_cancelled === true || client.is_cancelled === "true" || client.is_cancelled === 1;
          return !isDeleted && !isCancelled;
        });
      }
      
      // For receipt selection specifically (limit=10 and search exists), also filter out cancelled/deleted
      if (req.query.limit === "10" && search) {
        clients = clients.filter((client: any) => {
          const isDeleted = client.is_deleted === true || client.is_deleted === "true" || client.is_deleted === 1;
          const isCancelled = client.is_cancelled === true || client.is_cancelled === "true" || client.is_cancelled === 1;
          return !isDeleted && !isCancelled;
        });
      }
      
      // Apply search filter
      if (search) {
        // Normalize search term: lowercase, remove accents, trim spaces
        const normalizeText = (text: string) => {
          return text
            .toLowerCase()
            .trim()
            .normalize('NFD')                    // Decompose accents
            .replace(/[\u0300-\u036f]/g, '')   // Remove diacritics
            .replace(/\s+/g, ' ');             // Normalize spaces
        };
        
        const normalizedSearch = normalizeText(search);
        
        // Also search through children/companions
        const allChildren = await storage.getAllChildren();
        const childrenByClientId = new Map<string, typeof allChildren>();
        for (const child of allChildren) {
          if (!childrenByClientId.has(child.client_id)) {
            childrenByClientId.set(child.client_id, []);
          }
          childrenByClientId.get(child.client_id)!.push(child);
        }
        
        // Find clients whose children match the search
        const clientsWithMatchingCompanions = new Map<string, string>();
        const clientsWithCompanionsList = new Map<string, string[]>();

        for (const child of allChildren) {
          const normalizedChildName = normalizeText(child.name || '');
          const normalizedChildCpf = normalizeText(child.cpf || '');
          
          if (normalizedChildName.includes(normalizedSearch) || 
              normalizedChildCpf.includes(normalizedSearch)) {
            if (!clientsWithMatchingCompanions.has(child.client_id)) {
              clientsWithMatchingCompanions.set(child.client_id, child.name);
            }
          }
          
          // Always collect all children names for each client
          if (child.name) {
            if (!clientsWithCompanionsList.has(child.client_id)) {
              clientsWithCompanionsList.set(child.client_id, []);
            }
            clientsWithCompanionsList.get(child.client_id)!.push(child.name);
          }
        }
        
        clients = clients.filter(client => {
          // Search in full_name_search OR construct from first_name + last_name for backward compatibility
          const fullNameFromSearch = normalizeText(client.full_name_search || '');
          const fullNameFromParts = normalizeText(`${client.first_name || ''} ${client.last_name || ''}`);
          const normalizedFirstName = normalizeText(client.first_name || '');
          const normalizedLastName = normalizeText(client.last_name || '');
          const normalizedEmail = normalizeText(client.email || '');
          const normalizedPhone = normalizeText(client.phone || '');
          const normalizedCpf = normalizeText(client.cpf || '');
          
          const matchesClient = (
            fullNameFromSearch.includes(normalizedSearch) ||
            fullNameFromParts.includes(normalizedSearch) ||
            normalizedFirstName.includes(normalizedSearch) ||
            normalizedLastName.includes(normalizedSearch) ||
            normalizedEmail.includes(normalizedSearch) ||
            normalizedPhone.includes(normalizedSearch) ||
            normalizedCpf.includes(normalizedSearch)
          );
          
          // Check if this client has a matching companion
          const hasMatchingCompanion = clientsWithMatchingCompanions.has(client.id);
          
          // Add matching_companion info to the client object
          if (hasMatchingCompanion && !matchesClient) {
            (client as any).matching_companion = clientsWithMatchingCompanions.get(client.id);
          }

          // If the owner matches the search, add all companions to be displayed
          if (matchesClient) {
            (client as any).matching_companions = clientsWithCompanionsList.get(client.id) || [];
          }
          
          return matchesClient || hasMatchingCompanion;
        });
      }
      
      // Apply destination filter
      if (destination) {
        clients = clients.filter(client => client.destination === destination);
      }
      
      // Apply client_type filter (treat missing client_type as 'agencia' for backward compatibility)
      // IMPORTANT: When searching, we ignore client_type filter to show results from ALL types (agencia + operadora)
      // This ensures users can find clients even if they're in a different category (compania/operadora)
      if (client_type && client_type !== 'all' && !search) {
        clients = clients.filter(client => {
          const clientType = (client as any).client_type || 'agencia';
          return clientType === client_type;
        });
      }
      
      // Apply status filter (cancelled, confirmed, pending)
      if (status && status !== 'all') {
        const now = new Date();
        clients = clients.filter(client => {
          const isCancelled = (client as any).is_cancelled === true;
          
          // Handle Firebase timestamps and various date formats
          let travelDate: Date | null = null;
          const rawDate = client.travel_date;
          if (rawDate) {
            if (rawDate instanceof Date) {
              travelDate = rawDate;
            } else if (typeof rawDate === 'object' && (rawDate as any)._seconds !== undefined) {
              // Firebase Timestamp
              travelDate = new Date((rawDate as any)._seconds * 1000);
            } else if (typeof rawDate === 'object' && (rawDate as any).seconds !== undefined) {
              // Firestore Timestamp
              travelDate = new Date((rawDate as any).seconds * 1000);
            } else if (typeof rawDate === 'number') {
              travelDate = new Date(rawDate);
            } else if (typeof rawDate === 'string') {
              travelDate = new Date(rawDate);
            }
            // Validate the date
            if (travelDate && isNaN(travelDate.getTime())) {
              travelDate = null;
            }
          }
          
          if (status === 'cancelled') {
            return isCancelled;
          } else if (status === 'confirmed') {
            // Confirmed = has travel date in future and not cancelled
            return !isCancelled && travelDate && travelDate > now;
          } else if (status === 'pending') {
            // Pending = no travel date or travel date within 7 days
            if (isCancelled) return false;
            if (!travelDate) return true;
            const daysUntilTravel = (travelDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
            return daysUntilTravel <= 7 && daysUntilTravel >= 0;
          }
          return true;
        });
      }
      
      // Apply sorting (default to created_at descending if not specified)
      const sortField = sortBy === "name" ? "full_name_search" : 
                       sortBy === "travel_date" ? "travel_date" : "created_at";
      
      clients.sort((a, b) => {
        const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim();
        const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim();
        
        if (sortBy === "name") {
          return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
        }

        if (sortField === "travel_date" || sortField === "created_at") {
          const aVal = (a as any)[sortField];
          const bVal = (b as any)[sortField];
          return new Date(bVal || 0).getTime() - new Date(aVal || 0).getTime();
        }
        
        const aVal = (a as any)[sortField];
        const bVal = (b as any)[sortField];
        return (aVal || "").localeCompare(bVal || "", 'pt-BR', { sensitivity: 'base' });
      });
      
      // Calculate pagination
      const totalItems = clients.length;
      const totalPages = Math.ceil(totalItems / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedClients = clients.slice(startIndex, endIndex);
      
      // Ensure client_type defaults to 'agencia' for backward compatibility
      const clientsWithDefaults = paginatedClients.map((client: any) => ({
        ...client,
        client_type: client.client_type || 'agencia'
      }));
      
      res.json({
        clients: clientsWithDefaults,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit,
        }
      });
    } catch (error) {
      console.error("Error getting clients:", error);
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", authenticateToken, requireRole(['admin', 'vadmin']), async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      // Ensure client_type defaults to 'agencia' for backward compatibility
      const clientWithDefaults = {
        ...(client as any),
        client_type: (client as any).client_type || 'agencia'
      };
      res.json(clientWithDefaults);
    } catch (error) {
      console.error("Error getting client:", error);
      res.status(500).json({ error: "Failed to fetch client" });
    }
  });

  // Get client balance (total owed, paid, outstanding) with installments
  app.get("/api/clients/:id/balance", authenticateToken, requireRole(['admin', 'vadmin']), async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      // Get all receipts for this client
      const allReceipts = await storage.getReceipts();
      const clientReceipts = allReceipts.filter((r: any) => r.client_id === req.params.id);
      
      // Check if there's already a receipt for the entrada (down payment)
      // This is used to prevent duplicate entrada receipts
      const entradaReceipt = clientReceipts.find((r: any) => 
        r.paid_to === 'Entrada' || 
        (r.reference && r.reference.toLowerCase().includes('entrada'))
      );
      
      // For "à vista" payments, the entrada is considered already paid
      // because "à vista" means full payment upfront
      const isAvistaPayment = (client as any).payment_method === 'avista';
      const entradaPaid = isAvistaPayment || !!entradaReceipt;
      
      // Calculate receipts paid, EXCLUDING entrada receipts to avoid double-counting
      // The entrada is already counted in downPaymentTarget (down_payment field)
      // Entrada receipts are for documentation/PDF generation only
      const receiptsPaid = clientReceipts
        .filter((r: any) => {
          // Exclude entrada receipts from the total paid calculation
          const isEntradaReceipt = r.paid_to === 'Entrada' || 
            (r.reference && r.reference.toLowerCase().includes('entrada'));
          return !isEntradaReceipt;
        })
        .reduce((sum: number, r: any) => sum + r.amount, 0);

      // Get all parcelas (installments) for this client
      const allParcelas = await storage.getParcelas();
      const clientParcelas = allParcelas.filter((p: any) => p.client_id === req.params.id);

      // Get children (companhia) for this client to include their prices
      const children = await storage.getChildrenByClientId(req.params.id);
      const childrenTotal = children.reduce((sum: number, child: any) => sum + (child.price || 0), 0);

      // The total travel amount includes client price + children prices (companhia)
      const travelPrice = (client as any).travel_price || 0;
      const grossTravelAmount = travelPrice + childrenTotal;
      
      // Apply discount if configured
      const discountType = (client as any).first_payment_discount_type;
      const discountValue = (client as any).first_payment_discount_value || 0;
      const discountCurrency = (client as any).first_payment_discount_currency || 'percentage';
      
      let discountAmount = 0;
      if (discountType === '3') {
        // 3% discount
        discountAmount = grossTravelAmount * 0.03;
      } else if (discountType === '5') {
        // 5% discount
        discountAmount = grossTravelAmount * 0.05;
      } else if (discountType === 'custom' && discountValue > 0) {
        // Custom discount - can be percentage or fixed amount
        if (discountCurrency === 'fixed') {
          discountAmount = discountValue;
        } else {
          // Percentage discount
          discountAmount = grossTravelAmount * (discountValue / 100);
        }
      }
      
      // Total with discount applied
      const totalTravelAmount = grossTravelAmount - discountAmount;
      
      const installmentsCount = (client as any).installments_count || 0;
      const downPaymentTarget = (client as any).down_payment || 0;
      
      // For "à vista" payments, the full amount is paid upfront
      // For other payment methods, total paid = entrada (down_payment) + receipts
      let totalPaid: number;
      let outstandingBalance: number;
      let remainingInstallments: number;
      let installmentAmount: number;
      
      if (isAvistaPayment) {
        // For avista, consider full amount as paid (no installments, no outstanding balance)
        totalPaid = totalTravelAmount;
        outstandingBalance = 0;
        remainingInstallments = 0;
        installmentAmount = 0;
      } else {
        // We still assume entrada is considered paid if configured, for balance purposes
        totalPaid = downPaymentTarget + receiptsPaid;
        // Outstanding balance = total price (with children) - everything already paid (entrada + receipts)
        outstandingBalance = Math.max(0, totalTravelAmount - totalPaid);
        // Calculate each installment amount (if there are installments after entrada)
        const remainingForInstallments = totalTravelAmount - downPaymentTarget;
        remainingInstallments = installmentsCount;
        installmentAmount = installmentsCount > 0 ? remainingForInstallments / installmentsCount : 0;
      }

      res.json({
        client,
        grossTravelAmount,
        discountAmount,
        discountType,
        discountValue,
        totalTravelAmount,
        totalPaid,
        outstandingBalance,
        downPaymentAmount: downPaymentTarget,
        entradaPaid,
        remainingInstallments,
        installmentAmount,
        parcelas: clientParcelas.map((p: any) => ({
          id: p.id,
          amount: p.amount,
          due_date: p.due_date,
          status: p.status,
          paid_date: p.paid_date,
          payment_method: p.payment_method,
        })),
      });
    } catch (error) {
      console.error("Error getting client balance:", error);
      res.status(500).json({ error: "Failed to fetch client balance" });
    }
  });

  // Get client history by CPF
  app.get("/api/client-history/:cpf", authenticateToken, requireRole(['admin', 'vadmin']), async (req, res) => {
    try {
      const cpf = req.params.cpf;
      
      // Get all clients with this CPF
      const allClients = await storage.getClients();
      const clientRecords = allClients.filter((c: any) => c.cpf === cpf);
      
      if (clientRecords.length === 0) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      // Get the most recent client record for personal info
      const sortedClients = clientRecords.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const mainClient = sortedClients[0];
      
      // Build trip history
      const trips = [];
      for (const client of clientRecords) {
        // Get companions/children for this trip
        const children = await storage.getChildrenByClientId(client.id);
        const companions = children.map((child: any) => ({
          name: child.name,
          relationship: child.relationship
        }));
        
        trips.push({
          id: client.id,
          destination: client.destination,
          travel_date: client.travel_date,
          travel_price: client.travel_price || 0,
          created_at: client.created_at,
          companions
        });
      }
      
      // Calculate statistics
      const totalTrips = trips.length;
      const totalPaid = trips.reduce((sum: number, trip: any) => sum + trip.travel_price, 0);
      
      // Get preferred destinations
      const destinationCounts: { [key: string]: number } = {};
      trips.forEach((trip: any) => {
        const count = destinationCounts[trip.destination] || 0;
        destinationCounts[trip.destination] = count + 1;
      });
      
      const preferredDestinations = Object.entries(destinationCounts)
        .map(([destination, count]) => ({ destination, count }))
        .sort((a, b) => b.count - a.count);
      
      const allDestinations = Array.from(new Set(trips.map((t: any) => t.destination)));
      
      // Get usual companions
      const companionCounts: { [key: string]: { name: string; relationship: string; count: number } } = {};
      trips.forEach((trip: any) => {
        trip.companions.forEach((comp: any) => {
          const key = `${comp.name}-${comp.relationship}`;
          const existing = companionCounts[key];
          if (existing) {
            existing.count++;
          } else {
            companionCounts[key] = {
              name: comp.name,
              relationship: comp.relationship,
              count: 1
            };
          }
        });
      });
      
      const usualCompanions = Object.values(companionCounts)
        .sort((a, b) => b.count - a.count);
      
      const hasCompanions = usualCompanions.length > 0;
      
      res.json({
        client: {
          first_name: mainClient.first_name,
          last_name: mainClient.last_name,
          cpf: mainClient.cpf,
          birthdate: mainClient.birthdate,
          phone: mainClient.phone,
          email: mainClient.email,
          address: mainClient.address
        },
        trips,
        totalTrips,
        totalPaid,
        preferredDestinations,
        allDestinations,
        hasCompanions,
        usualCompanions
      });
    } catch (error) {
      console.error("Error fetching client history:", error);
      res.status(500).json({ error: "Failed to fetch client history" });
    }
  });

  app.post("/api/clients", authenticateToken, requireRole(['admin', 'vadmin']), validateBody(insertClientSchema, { preserveUnknown: true }), async (req, res) => {
    try {
      if (process.env.NODE_ENV === 'development') {
        const sanitizedData = { ...req.body };
        delete sanitizedData.cpf;
        delete sanitizedData.rg;
        delete sanitizedData.email;
        delete sanitizedData.address;
        console.log("Creating client with data:", JSON.stringify(sanitizedData, null, 2));
      }
      
      // Check for duplicate CPF for the same destination
      if (req.body.cpf && req.body.destination) {
        const existingClient = await storage.getClientByCpf(req.body.cpf, req.body.destination);
        if (existingClient) {
          return res.status(409).json({ 
            error: `Já existe um cliente com o CPF ${req.body.cpf} cadastrado para o destino ${req.body.destination}`,
            existingClientId: existingClient.id,
            existingClientName: `${existingClient.first_name} ${existingClient.last_name}`
          });
        }
      }
      
      // Add creator tracking
      const clientData = {
        ...req.body,
        created_by_email: req.user?.email,
        created_by_name: req.user?.email?.split('@')[0] || 'Sistema',
      };
      const client = await storage.createClient(clientData);
      console.log("Client created successfully:", client.id);
      
      // Create children/companions if provided (server-side to ensure atomicity)
      const childrenData = req.body.children;
      if (childrenData && Array.isArray(childrenData) && childrenData.length > 0) {
        console.log(`Creating ${childrenData.length} children for client ${client.id}`);
        for (const childInput of childrenData) {
          try {
            const childOptions: any = {
              client_id: client.id,
              name: childInput.name,
              birthdate: parseToUTCDate(childInput.birthdate),
              phone: childInput.phone || '',
              rg: childInput.rg || '',
              cpf: childInput.cpf || '',
              passport_number: childInput.passport_number || '',
              relationship: childInput.relationship || 'outro',
              price: childInput.price || 0,
            };

            if (childInput.seat_number) {
              childOptions.seat_number = childInput.seat_number;
            }

            const child = await storage.createChild(childOptions);
            console.log(`Child created: ${child.id} - ${child.name}`);

            if (child.seat_number && client.destination) {
              const destinations = await storage.getDestinations();
              const destinationObj = destinations.find(d => d.name === client.destination);
              if (destinationObj && destinationObj.bus_id) {
                await storage.createSeatReservation({
                  client_id: client.id,
                  child_id: child.id,
                  client_name: child.name,
                  destination_id: destinationObj.id,
                  bus_id: destinationObj.bus_id,
                  seat_number: child.seat_number,
                  status: "reserved",
                  is_reserved: true,
                  is_child: true,
                  reserved_at: new Date()
                });
                console.log(`Created SeatReservation for child ${child.id} at seat ${child.seat_number}`);
              }
            }
          } catch (childError) {
            console.error(`Failed to create child for client ${client.id}:`, childError);
          }
        }
      }
      
      // If client used a credit from a previous cancelled trip, mark the credit as used
      if (req.body.used_credit_id && req.body.down_payment_method === 'credito_viagens_anteriores') {
        try {
          await storage.markCreditAsUsed(req.body.used_credit_id, client.id);
          console.log(`Credit ${req.body.used_credit_id} marked as used for new client ${client.id}`);
        } catch (creditError) {
          console.error("Failed to mark credit as used:", creditError);
          // Don't fail the request if credit marking fails
        }
      }
      
      // Log client creation activity
      try {
        if (req.user) {
          await storage.createActivity({
            action: "client_created",
            user_id: req.user.uid,
            user_email: req.user.email,
            client_id: client.id,
            client_name: `${client.first_name} ${client.last_name}`,
            details: `Cliente criado: ${client.first_name} ${client.last_name} - ${client.destination}`
          });
        }
      } catch (activityError) {
        console.error("Failed to log client creation activity:", activityError);
        // Don't fail the request if activity logging fails
      }

      // Create parcelas if payment method is crediario_agencia
      if (client.payment_method === 'crediario_agencia' && client.installments_count) {
        try {
          // Get children/companions to calculate total travel amount
          const children = await storage.getChildrenByClientId(client.id);
          const childrenTotal = children.reduce((sum: number, child: any) => sum + (child.price || 0), 0);
          
          // Total travel price includes client price + all companions' prices
          const clientPrice = client.travel_price || 0;
          const totalTravelPrice = clientPrice + childrenTotal;
          const downPayment = client.down_payment || 0;
          const remainingAmount = totalTravelPrice - downPayment;
          const installmentAmount = remainingAmount / client.installments_count;

          // Calculate due dates using installment_due_date (day of month) for each parcela
          const now = new Date();

          for (let i = 0; i < client.installments_count; i++) {
            // Use the helper function to calculate the due date based on installment_due_date
            const dueDate = calculateParcelaDueDate(client.installment_due_date, i, now);

            await storage.createParcela({
              client_id: client.id,
              client_name: `${client.first_name} ${client.last_name}`,
              client_phone: client.phone,
              amount: installmentAmount,
              due_date: dueDate,
              installment_number: i + 1,
              total_installments: client.installments_count,
              is_paid: false,
              status: "pending",
              paid_amount: 0,
            });
          }
          console.log(`Created ${client.installments_count} parcelas for client ${client.id} using day ${client.installment_due_date || '1'} of each month, with total amount ${totalTravelPrice} (client: ${clientPrice}, companions: ${childrenTotal})`);
        } catch (parcelaError) {
          console.error("Failed to create parcelas:", parcelaError);
          // Don't fail the request if parcela creation fails
        }
      }
      
      // Create a single PAID parcela for immediate payment methods (credito_banco, avista)
      // These payment methods mean the client paid everything upfront
      if (client.payment_method === 'credito_banco' || client.payment_method === 'avista') {
        try {
          // Get children/companions to calculate total travel amount
          const children = await storage.getChildrenByClientId(client.id);
          const childrenTotal = children.reduce((sum: number, child: any) => sum + (child.price || 0), 0);
          
          // Total travel price includes client price + all companions' prices
          const clientPrice = client.travel_price || 0;
          const totalTravelPrice = clientPrice + childrenTotal;
          
          const now = new Date();
          
          await storage.createParcela({
            client_id: client.id,
            client_name: `${client.first_name} ${client.last_name}`,
            client_phone: client.phone,
            amount: totalTravelPrice,
            due_date: now,
            installment_number: 1,
            total_installments: 1,
            is_paid: true,
            status: "paid",
            paid_amount: totalTravelPrice,
            paid_date: now,
            payment_method: client.payment_method === 'avista' ? 'dinheiro' : 'credito',
          });
          console.log(`Created paid parcela for client ${client.id} with amount ${totalTravelPrice} (payment method: ${client.payment_method})`);
        } catch (parcelaError) {
          console.error("Failed to create paid parcela:", parcelaError);
          // Don't fail the request if parcela creation fails
        }
      }
      
      // Handle brinde (gift) payment - create expense in Caixa and handle companions
      console.log(`🎁 Checking brinde for client ${client.id}: is_brinde=${client.is_brinde}, brinde_value=${client.brinde_value}`);
      if (client.is_brinde || client.payment_method === 'brinde') {
        try {
          const brindeAmount = client.brinde_value || (client.travel_price || 0);
          console.log(`🎁 Creating brinde expense: amount=${brindeAmount}, destination=${client.destination}`);
          
          // Create the brinde expense in Caixa (negative amount = expense)
          await storage.createFinancialTransaction({
            type: 'expense',
            category: 'Brinde/Viagem Grátis',
            description: `Brinde - ${client.first_name} ${client.last_name} - ${client.destination || 'Destino não especificado'}`,
            amount: -brindeAmount, // Negative for expense
            transaction_date: new Date(),
            payment_method: 'dinheiro', // Use dinheiro as default for brinde (internal tracking)
            client_id: client.id,
            notes: `Viagem brinde para cliente. Valor do cliente: R$ ${brindeAmount.toFixed(2).replace('.', ',')}`,
            created_by_email: req.user?.email || 'sistema@rodabemturismo.com',
            created_by_name: req.user?.email?.split('@')[0] || 'Sistema',
          });
          console.log(`✅ Created brinde expense in Caixa for client ${client.id}, amount: -${brindeAmount}`);
          
          // For brinde clients, if there are companions with prices, create parcelas for companions only
          const children = await storage.getChildrenByClientId(client.id);
          const childrenTotal = children.reduce((sum: number, child: any) => sum + (child.price || 0), 0);
          
          if (childrenTotal > 0) {
            // Companions need to pay their portion via parcelas
            const downPayment = client.down_payment || 0;
            const remainingAmount = Math.max(0, childrenTotal - downPayment);
            const now = new Date();
            
            if (remainingAmount > 0) {
              if (client.installments_count && client.installments_count > 0) {
                // Create multiple installments for companions
                const installmentAmount = remainingAmount / client.installments_count;
                
                for (let i = 0; i < client.installments_count; i++) {
                  const dueDate = calculateParcelaDueDate(client.installment_due_date, i, now);
                  await storage.createParcela({
                    client_id: client.id,
                    client_name: `${client.first_name} ${client.last_name}`,
                    client_phone: client.phone,
                    amount: installmentAmount,
                    due_date: dueDate,
                    installment_number: i + 1,
                    total_installments: client.installments_count,
                    is_paid: false,
                    status: "pending",
                    paid_amount: 0,
                  });
                }
                console.log(`Created ${client.installments_count} parcelas for brinde client companions (total: ${childrenTotal})`);
              } else {
                // No installments specified - create a single pending parcela for companions
                await storage.createParcela({
                  client_id: client.id,
                  client_name: `${client.first_name} ${client.last_name}`,
                  client_phone: client.phone,
                  amount: remainingAmount,
                  due_date: now,
                  installment_number: 1,
                  total_installments: 1,
                  is_paid: false,
                  status: "pending",
                  paid_amount: 0,
                  notes: "Acompanhantes - pagamento pendente",
                });
                console.log(`Created single pending parcela for brinde client companions (total: ${remainingAmount})`);
              }
            } else if (downPayment >= childrenTotal) {
              // Down payment covers all companions - create a paid parcela
              await storage.createParcela({
                client_id: client.id,
                client_name: `${client.first_name} ${client.last_name}`,
                client_phone: client.phone,
                amount: childrenTotal,
                due_date: now,
                installment_number: 1,
                total_installments: 1,
                is_paid: true,
                status: "paid",
                paid_amount: childrenTotal,
                paid_date: now,
                payment_method: client.down_payment_method === 'credito_viagens_anteriores' ? 'pix' : (client.down_payment_method || 'pix'),
                notes: "Acompanhantes - pago na entrada",
              });
              console.log(`Created paid parcela for brinde client companions (total: ${childrenTotal})`);
            }
          }
        } catch (brindeError) {
          console.error("Failed to create brinde expense in Caixa:", brindeError);
          // Don't fail the request if brinde expense creation fails
        }
      }
      
      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ error: "Failed to create client" });
    }
  });

  app.put("/api/clients/:id", authenticateToken, requireRole(['admin', 'vadmin']), validateBody(updateClientSchema, { preserveUnknown: true }), async (req, res) => {
    try {
      if (process.env.NODE_ENV === 'development') {
        const sanitizedData = { ...req.body };
        delete sanitizedData.cpf;
        delete sanitizedData.rg;
        delete sanitizedData.email;
        delete sanitizedData.address;
        console.log("Updating client", req.params.id, "with data:", JSON.stringify(sanitizedData, null, 2));
      }
      
      // Ensure backward compatibility: default client_type to 'agencia' if not provided
      const updateData = {
        ...req.body,
        client_type: req.body.client_type || 'agencia'
      };
      
      const client = await storage.updateClient(req.params.id, updateData);
      console.log("Client updated successfully:", client.id);
      
      // Update children/companions if provided (server-side to ensure atomicity)
      const childrenData = req.body.children;
      if (childrenData && Array.isArray(childrenData)) {
        console.log(`Updating ${childrenData.length} children for client ${client.id}`);
        
        // Get existing children
        const existingChildren = await storage.getChildrenByClientId(client.id);
        
        // Delete existing children first
        for (const existingChild of existingChildren) {
          try {
            await storage.deleteChild(existingChild.id);
            await storage.deleteSeatReservationsByChildId(existingChild.id);
          } catch (deleteError) {
            console.error(`Failed to delete child ${existingChild.id}:`, deleteError);
          }
        }
        
        // Create new children
        for (const childInput of childrenData) {
          try {
            const childOptions: any = {
              client_id: client.id,
              name: childInput.name,
              birthdate: parseToUTCDate(childInput.birthdate),
              phone: childInput.phone || '',
              rg: childInput.rg || '',
              cpf: childInput.cpf || '',
              passport_number: childInput.passport_number || '',
              relationship: childInput.relationship || 'outro',
              price: childInput.price || 0,
            };

            if (childInput.seat_number) {
              childOptions.seat_number = childInput.seat_number;
            }

            const child = await storage.createChild(childOptions);
            console.log(`Child created: ${child.id} - ${child.name}`);

            if (child.seat_number && client.destination) {
              const destinations = await storage.getDestinations();
              const destinationObj = destinations.find(d => d.name === client.destination);
              if (destinationObj && destinationObj.bus_id) {
                await storage.createSeatReservation({
                  client_id: client.id,
                  child_id: child.id,
                  client_name: child.name,
                  destination_id: destinationObj.id,
                  bus_id: destinationObj.bus_id,
                  seat_number: child.seat_number,
                  status: "reserved",
                  is_reserved: true,
                  is_child: true,
                  reserved_at: new Date()
                });
                console.log(`Created SeatReservation for child ${child.id} at seat ${child.seat_number}`);
              }
            }
          } catch (childError) {
            console.error(`Failed to create child for client ${client.id}:`, childError);
          }
        }
      }
      
      // Log client update activity
      try {
        if (req.user) {
          await storage.createActivity({
            action: "client_updated",
            user_id: req.user.uid,
            user_email: req.user.email,
            client_id: client.id,
            client_name: `${client.first_name} ${client.last_name}`,
            details: `Cliente atualizado: ${client.first_name} ${client.last_name}`
          });
        }
      } catch (activityError) {
        console.error("Failed to log client update activity:", activityError);
        // Don't fail the request if activity logging fails
      }

      // Recalculate parcelas if payment method is crediario_agencia and relevant fields are set
      if (client.payment_method === 'crediario_agencia' && client.installments_count) {
        try {
          // Delete existing parcelas for this client
          await storage.deleteParcelasByClientId(client.id);
          console.log(`Deleted existing parcelas for client ${client.id}`);

          // Get children/companions to calculate total travel amount (like in create route)
          const children = await storage.getChildrenByClientId(client.id);
          const childrenTotal = children.reduce((sum: number, child: any) => sum + (child.price || 0), 0);

          // Total travel price includes client price + all companions' prices
          const clientPrice = client.travel_price || 0;
          const totalTravelPrice = clientPrice + childrenTotal;
          const downPayment = client.down_payment || 0;
          const remainingAmount = totalTravelPrice - downPayment;
          const installmentAmount = remainingAmount / client.installments_count;

          // Calculate due dates using installment_due_date (day of month) for each parcela
          // This is the same logic as the create route for consistency
          const now = new Date();

          for (let i = 0; i < client.installments_count; i++) {
            // Use the helper function to calculate the due date based on installment_due_date
            const dueDate = calculateParcelaDueDate(client.installment_due_date, i, now);

            await storage.createParcela({
              client_id: client.id,
              client_name: `${client.first_name} ${client.last_name}`,
              client_phone: client.phone,
              amount: installmentAmount,
              due_date: dueDate,
              installment_number: i + 1,
              total_installments: client.installments_count,
              is_paid: false,
              status: "pending",
              paid_amount: 0,
            });
          }
          console.log(`Created ${client.installments_count} parcelas for updated client ${client.id} using day ${client.installment_due_date || '1'} of each month`);
        } catch (parcelaError) {
          console.error("Failed to recalculate parcelas on update:", parcelaError);
          // Don't fail the request if parcela recalculation fails
        }
      } else if (client.payment_method === 'credito_banco' || client.payment_method === 'avista') {
        // For immediate payment methods, delete existing parcelas and create a single paid parcela
        try {
          await storage.deleteParcelasByClientId(client.id);
          console.log(`Deleted existing parcelas for client ${client.id} (payment method: ${client.payment_method})`);
          
          // Get children/companions to calculate total travel amount
          const children = await storage.getChildrenByClientId(client.id);
          const childrenTotal = children.reduce((sum: number, child: any) => sum + (child.price || 0), 0);
          
          // Total travel price includes client price + all companions' prices
          const clientPrice = client.travel_price || 0;
          const totalTravelPrice = clientPrice + childrenTotal;
          
          const now = new Date();
          
          await storage.createParcela({
            client_id: client.id,
            client_name: `${client.first_name} ${client.last_name}`,
            client_phone: client.phone,
            amount: totalTravelPrice,
            due_date: now,
            installment_number: 1,
            total_installments: 1,
            is_paid: true,
            status: "paid",
            paid_amount: totalTravelPrice,
            paid_date: now,
            payment_method: client.payment_method === 'avista' ? 'dinheiro' : 'credito',
          });
          console.log(`Created paid parcela for updated client ${client.id} with amount ${totalTravelPrice} (payment method: ${client.payment_method})`);
        } catch (parcelaError) {
          console.error("Failed to handle immediate payment parcelas on update:", parcelaError);
        }
      } else if (client.payment_method !== 'crediario_agencia') {
        // If payment method changed to something else (pix, boleto, link), delete parcelas
        try {
          await storage.deleteParcelasByClientId(client.id);
          console.log(`Deleted parcelas for client ${client.id} (payment method changed to ${client.payment_method})`);
        } catch (parcelaError) {
          console.error("Failed to delete parcelas on update:", parcelaError);
        }
      }
      
      res.json(client);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ error: "Failed to update client" });
    }
  });

  // Soft delete a client (vadmin only) - client will remain for 30 days before permanent deletion
  app.delete("/api/clients/:id", authenticateToken, requireRole(['vadmin']), async (req: any, res) => {
    try {
      const clientId = req.params.id;
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      // Get current user info for tracking who deleted
      const deletedByEmail = req.user?.email || '';
      const deletedByName = req.user?.name || req.user?.email || 'Unknown';
      
      const now = new Date();
      const permanentDeleteDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      
      // Soft delete by updating the client with deletion info
      await storage.updateClient(clientId, {
        is_deleted: true,
        deleted_at: now,
        deleted_by_email: deletedByEmail,
        deleted_by_name: deletedByName,
        permanent_delete_at: permanentDeleteDate,
      } as any);
      
      console.log(`Client ${clientId} soft deleted by ${deletedByName}, will be permanently deleted on ${permanentDeleteDate.toISOString()}`);
      
      res.status(200).json({ 
        message: "Client deleted successfully",
        permanent_delete_at: permanentDeleteDate 
      });
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ error: "Failed to delete client" });
    }
  });

  // Get all deleted clients (vadmin only)
  app.get("/api/deleted-clients", authenticateToken, requireRole(['vadmin']), async (req, res) => {
    try {
      const allClients = await storage.getAllClientsIncludingDeleted();
      const deletedClients = allClients.filter((client: any) => client.is_deleted === true);
      
      // Sort by deleted_at descending (most recently deleted first)
      deletedClients.sort((a: any, b: any) => {
        const dateA = a.deleted_at ? new Date(a.deleted_at).getTime() : 0;
        const dateB = b.deleted_at ? new Date(b.deleted_at).getTime() : 0;
        return dateB - dateA;
      });
      
      res.json({ clients: deletedClients });
    } catch (error) {
      console.error("Error fetching deleted clients:", error);
      res.status(500).json({ error: "Failed to fetch deleted clients" });
    }
  });

  // Restore a deleted client (vadmin only)
  app.post("/api/clients/:id/restore", authenticateToken, requireRole(['vadmin']), async (req, res) => {
    try {
      const clientId = req.params.id;
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      if (!(client as any).is_deleted) {
        return res.status(400).json({ error: "Client is not deleted" });
      }
      
      // Restore the client by clearing deletion fields
      await storage.updateClient(clientId, {
        is_deleted: false,
        deleted_at: null,
        deleted_by_email: null,
        deleted_by_name: null,
        permanent_delete_at: null,
      } as any);
      
      console.log(`Client ${clientId} restored successfully`);
      
      res.json({ message: "Client restored successfully" });
    } catch (error) {
      console.error("Error restoring client:", error);
      res.status(500).json({ error: "Failed to restore client" });
    }
  });

  // Permanently delete a client (vadmin only) - for immediate permanent deletion if needed
  app.delete("/api/clients/:id/permanent", authenticateToken, requireRole(['vadmin']), async (req, res) => {
    try {
      await storage.deleteClient(req.params.id);
      console.log(`Client ${req.params.id} permanently deleted`);
      res.status(204).send();
    } catch (error) {
      console.error("Error permanently deleting client:", error);
      res.status(500).json({ error: "Failed to permanently delete client" });
    }
  });

  app.post("/api/clients/:id/regenerate-link", authenticateToken, requireRole(['admin', 'vadmin']), async (req, res) => {
    try {
      const client = await storage.regenerateApprovalLink(req.params.id);
      console.log("Approval link regenerated successfully for client:", client.id);
      res.json(client);
    } catch (error) {
      console.error("Error regenerating approval link:", error);
      res.status(500).json({ error: "Failed to regenerate approval link" });
    }
  });

  app.put("/api/clients/:id/seats", authenticateToken, requireRole(['admin', 'vadmin']), async (req, res) => {
    try {
      const { id } = req.params;
      const { client_seat, children_seats } = req.body;
      
      if (!client_seat) {
        return res.status(400).json({ 
          error: "Client seat number is required" 
        });
      }

      const client = await storage.getClient(id);
      
      if (!client) {
        return res.status(404).json({ 
          error: "Client not found" 
        });
      }

      // Get children for this client
      const children = await storage.getChildrenByClientId(client.id);

      // Get the destination to find the bus
      const destinations = await storage.getDestinations();
      const destination = destinations.find(d => d.name === client.destination);
      
      if (!destination) {
        return res.status(404).json({ 
          error: "Destination not found" 
        });
      }

      if (!destination.bus_id) {
        return res.status(400).json({ 
          error: "No bus configured for this destination" 
        });
      }

      // Collect all seat numbers being selected
      const allSeats = [client_seat];
      if (children_seats && Array.isArray(children_seats)) {
        children_seats.forEach((cs: { seat_number: string }) => allSeats.push(cs.seat_number));
      }

      // Check if any seats are already reserved by OTHER clients
      const reservations = await storage.getSeatReservationsByDestination(destination.id);
      const takenSeats = allSeats.filter(seat => 
        reservations.some(r => r.seat_number === seat && r.client_id !== client.id && !children.some(c => c.id === r.client_id))
      );
      
      if (takenSeats.length > 0) {
        return res.status(409).json({ 
          error: `These seats are already reserved by other clients: ${takenSeats.join(', ')}` 
        });
      }

      // Check for duplicate seat selections within this request
      const uniqueSeats = new Set(allSeats);
      if (uniqueSeats.size !== allSeats.length) {
        return res.status(400).json({ 
          error: "Cannot select the same seat for multiple people" 
        });
      }

      // Delete old seat reservations for this client and children
      const clientOldReservations = reservations.filter(r => 
        r.client_id === client.id || children.some(c => c.id === r.client_id)
      );
      for (const oldRes of clientOldReservations) {
        await storage.deleteSeatReservation(oldRes.id);
      }

      // Create seat reservation for client
      await storage.createSeatReservation({
        client_id: client.id,
        client_name: `${client.first_name} ${client.last_name}`,
        destination_id: destination.id,
        bus_id: destination.bus_id,
        seat_number: client_seat,
        status: "reserved",
        is_reserved: true,
        reserved_at: new Date()
      });

      // Update client with selected seat
      await storage.updateClient(client.id, { seat_number: client_seat });

      // Create seat reservations and update children
      if (children_seats && Array.isArray(children_seats)) {
        for (const childSeat of children_seats) {
          const child = children.find(c => c.id === childSeat.child_id);
          if (child) {
            // Create seat reservation for child - use parent's client.id for family grouping in PDFs
            await storage.createSeatReservation({
              client_id: client.id,  // Use parent's client ID so families are grouped together
              client_name: child.name,
              destination_id: destination.id,
              bus_id: destination.bus_id,
              seat_number: childSeat.seat_number,
              status: "reserved",
              is_reserved: true,
              reserved_at: new Date()
            });

            // Update child with selected seat
            await storage.updateChild(child.id, { seat_number: childSeat.seat_number });
          }
        }
      }

      res.json({
        success: true,
        client_seat,
        children_seats
      });
    } catch (error) {
      console.error("Error updating client seats:", error);
      res.status(500).json({ error: "Failed to update client seats" });
    }
  });

  app.get("/api/clients/search/:term", authenticateToken, requireRole(['admin', 'vadmin']), async (req, res) => {
    try {
      const clients = await storage.searchClients(req.params.term);
      res.json(clients);
    } catch (error) {
      console.error("Error searching clients:", error);
      res.status(500).json({ error: "Failed to search clients" });
    }
  });

  app.get("/api/referrals/statistics", authenticateToken, requireRole(['admin', 'vadmin']), async (req, res) => {
    try {
      const statistics = await storage.getReferralStatistics();
      res.json(statistics);
    } catch (error) {
      console.error("Error getting referral statistics:", error);
      res.status(500).json({ error: "Failed to fetch referral statistics" });
    }
  });

  // Activity tracking routes
  app.get("/api/activities", authenticateToken, requireRole(['vadmin']), async (req: any, res) => {
    try {
      const { userEmail, from, to, limit, clientName } = req.query;
      const filters: any = {};
      
      if (userEmail) filters.userEmail = userEmail;
      if (from) filters.fromMs = parseInt(from);
      if (to) filters.toMs = parseInt(to);
      if (limit) filters.limit = parseInt(limit) || 50;
      if (clientName) filters.clientName = clientName;
      
      const activities = await storage.getActivities(filters);
      res.json(activities);
    } catch (error) {
      console.error("Error getting activities:", error);
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  app.get("/api/activities/top-creators", authenticateToken, requireRole(['vadmin']), async (req: any, res) => {
    try {
      const { from, to, limit } = req.query;
      const filters: any = {};
      
      if (from) filters.fromMs = parseInt(from);
      if (to) filters.toMs = parseInt(to);
      if (limit) filters.limit = parseInt(limit) || 10;
      
      const topCreators = await storage.getTopCreators(filters);
      res.json(topCreators);
    } catch (error) {
      console.error("Error getting top creators:", error);
      res.status(500).json({ error: "Failed to fetch top creators" });
    }
  });

  // Helper function to check if prospect has invalid phone number
  function hasIncompleteData(prospect: any): boolean {
    // Check phone - must be 10-11 digits, not all same digit, not ending in 6+ repeated digits
    const phone = (prospect.phone || '').replace(/\D/g, '');
    return (
      phone.length < 10 || 
      phone.length > 11 ||
      /^(\d)\1+$/.test(phone) ||  // All same digit (e.g., 00000000000)
      /(\d)\1{5,}$/.test(phone)   // Ends with 6+ of same digit (e.g., 31900000000, 139000000)
    );
  }

  // Prospect routes with server-side pagination and filtering
  app.get("/api/prospects", authenticateToken, requireRole(['admin', 'vadmin']), async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const destination = req.query.destination as string;
      const status = req.query.status as string;
      const sortBy = req.query.sortBy as string;
      const showIncomplete = req.query.showIncomplete === 'true';
      
      let prospects = await storage.getProspects();
      
      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase();
        prospects = prospects.filter(prospect => 
          prospect.full_name_search?.toLowerCase().includes(searchLower) ||
          prospect.email?.toLowerCase().includes(searchLower) ||
          prospect.phone?.toLowerCase().includes(searchLower)
        );
      }
      
      // Apply destination filter (check interested_destinations array)
      if (destination) {
        prospects = prospects.filter(prospect => 
          prospect.interested_destinations?.includes(destination)
        );
      }
      
      // Apply status filter
      if (status) {
        const statusMap: { [key: string]: string } = {
          'novo': 'novo',
          'em_contato': 'em_contato', 
          'convertido': 'convertido'
        };
        const mappedStatus = statusMap[status];
        if (mappedStatus) {
          prospects = prospects.filter(prospect => prospect.status === mappedStatus);
        }
      }
      
      // Apply incomplete data filter
      if (showIncomplete) {
        prospects = prospects.filter(prospect => hasIncompleteData(prospect));
      }
      
      // Apply sorting
      if (sortBy) {
        prospects.sort((a, b) => {
          const field = sortBy === "name" ? "full_name_search" : 
                       sortBy === "travel_date" ? "travel_date" : "created_at";
          const aVal = (a as any)[field];
          const bVal = (b as any)[field];
          
          if (field === "travel_date" || field === "created_at") {
            return new Date(bVal || 0).getTime() - new Date(aVal || 0).getTime();
          }
          return (bVal || "").localeCompare(aVal || "");
        });
      }
      
      // Calculate pagination
      const totalItems = prospects.length;
      const totalPages = Math.ceil(totalItems / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedProspects = prospects.slice(startIndex, endIndex);
      
      res.json({
        prospects: paginatedProspects,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit,
        }
      });
    } catch (error) {
      console.error("Error getting prospects:", error);
      res.status(500).json({ error: "Failed to fetch prospects" });
    }
  });

  app.get("/api/prospects/:id", authenticateToken, requireRole(['admin', 'vadmin']), async (req, res) => {
    try {
      const prospect = await storage.getProspect(req.params.id);
      if (!prospect) {
        return res.status(404).json({ error: "Prospect not found" });
      }
      res.json(prospect);
    } catch (error) {
      console.error("Error getting prospect:", error);
      res.status(500).json({ error: "Failed to fetch prospect" });
    }
  });

  app.post("/api/prospects", authenticateToken, requireRole(['admin', 'vadmin']), validateBody(insertProspectSchema), async (req, res) => {
    try {
      const prospect = await storage.createProspect(req.body);
      res.status(201).json(prospect);
    } catch (error) {
      console.error("Error creating prospect:", error);
      res.status(500).json({ error: "Failed to create prospect" });
    }
  });

  app.put("/api/prospects/:id", authenticateToken, requireRole(['admin', 'vadmin']), validateBody(updateProspectSchema), async (req, res) => {
    try {
      const prospect = await storage.updateProspect(req.params.id, req.body);
      res.json(prospect);
    } catch (error) {
      console.error("Error updating prospect:", error);
      res.status(500).json({ error: "Failed to update prospect" });
    }
  });

  app.delete("/api/prospects/:id", authenticateToken, requireRole(['admin', 'vadmin']), async (req, res) => {
    try {
      await storage.deleteProspect(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting prospect:", error);
      res.status(500).json({ error: "Failed to delete prospect" });
    }
  });

  app.get("/api/prospects/search/:term", authenticateToken, requireRole(['admin', 'vadmin']), async (req, res) => {
    try {
      const prospects = await storage.searchProspects(req.params.term);
      res.json(prospects);
    } catch (error) {
      console.error("Error searching prospects:", error);
      res.status(500).json({ error: "Failed to search prospects" });
    }
  });

  // Quote-related routes (legacy - kept for backward compatibility)
  app.get("/api/quote/:token", async (req, res) => {
    try {
      const prospect = await storage.getProspectByQuoteToken(req.params.token);
      if (!prospect) {
        return res.status(404).json({ error: "Quote not found" });
      }
      
      // Mark as em_contato if it was novo
      if (prospect.status === "novo") {
        await storage.updateProspect(prospect.id, { status: "em_contato" });
      }
      
      res.json(prospect);
    } catch (error) {
      console.error("Error getting quote:", error);
      res.status(500).json({ error: "Failed to fetch quote" });
    }
  });

  app.post("/api/quote/:token/status", async (req, res) => {
    try {
      const { status } = req.body;
      if (!['em_contato', 'convertido'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      
      const prospect = await storage.getProspectByQuoteToken(req.params.token);
      if (!prospect) {
        return res.status(404).json({ error: "Quote not found" });
      }
      
      const updatedProspect = await storage.updateProspect(prospect.id, { status });
      res.json(updatedProspect);
    } catch (error) {
      console.error("Error updating quote status:", error);
      res.status(500).json({ error: "Failed to update quote status" });
    }
  });

  // Convert prospect to client
  app.post("/api/prospects/:id/convert", authenticateToken, requireRole(['admin', 'vadmin']), async (req, res) => {
    try {
      const result = await storage.convertProspectToClient(req.params.id);
      res.json(result);
    } catch (error) {
      console.error("Error converting prospect to client:", error);
      res.status(500).json({ error: "Failed to convert prospect to client" });
    }
  });

  // Destination routes
  app.get("/api/destinations", async (req, res) => {
    try {
      const destinations = await storage.getDestinations();
      res.json(destinations);
    } catch (error) {
      console.error("Error getting destinations:", error);
      res.status(500).json({ error: "Failed to fetch destinations" });
    }
  });

  app.get("/api/destinations/active", async (req, res) => {
    try {
      const destinations = await storage.getActiveDestinations();
      res.json(destinations);
    } catch (error) {
      console.error("Error getting active destinations:", error);
      res.status(500).json({ error: "Failed to fetch active destinations" });
    }
  });

  app.get("/api/destinations/capacities", async (req, res) => {
    try {
      const destinations = await storage.getActiveDestinations();
      const buses = await storage.getBuses();
      const busMap = new Map(buses.map(b => [b.id, b]));
      
      const allClients = await storage.getClients();
      const allSeatReservations = await storage.getSeatReservations();
      const allChildren = await storage.getAllChildren();

      const capacities: Record<string, { availableSeats: number; isSoldOut: boolean; totalPassengers: number; totalSeats: number }> = {};
      
      // Group data by destination for fast lookup
      const reservationsByDest = new Map<string, typeof allSeatReservations>();
      for (const res of allSeatReservations) {
        const list = reservationsByDest.get(res.destination_id) || [];
        list.push(res);
        reservationsByDest.set(res.destination_id, list);
      }

      const clientsByDestName = new Map<string, typeof allClients>();
      for (const client of allClients) {
        if ((client as any).is_deleted || (client as any).approval_status === "cancelled") continue;
        const list = clientsByDestName.get(client.destination || '') || [];
        list.push(client);
        clientsByDestName.set(client.destination || '', list);
      }

      const childrenByClient = new Map<string, typeof allChildren>();
      for (const child of allChildren) {
        const list = childrenByClient.get(child.client_id) || [];
        list.push(child);
        childrenByClient.set(child.client_id, list);
      }

      // Process each destination
      for (const destination of destinations) {
        let totalSeats = 0;
        if (destination.bus_id) {
          const bus = busMap.get(destination.bus_id);
          if (bus) {
            totalSeats = bus.total_seats;
          }
        }

        const seatReservations = reservationsByDest.get(destination.id) || [];
        const seatReservationsCount = seatReservations.length;
        const reservedClientIds = new Set(seatReservations.filter(r => r.client_id).map(r => String(r.client_id)));
        const reservedChildIds = new Set(seatReservations.filter(r => r.child_id).map(r => String(r.child_id)));

        const clients = clientsByDestName.get(destination.name) || [];
        
        let clientsWithoutSeatsCount = 0;
        let companionsWithoutSeatsCount = 0;

        for (const client of clients) {
          if (!reservedClientIds.has(String(client.id))) {
            clientsWithoutSeatsCount++;
          }
          
          const children = childrenByClient.get(client.id) || [];
          for (const child of children) {
            if (!reservedChildIds.has(String(child.id))) {
              companionsWithoutSeatsCount++;
            }
          }
        }

        const totalImpact = seatReservationsCount + clientsWithoutSeatsCount + companionsWithoutSeatsCount;
        const availableSeats = Math.max(0, totalSeats - totalImpact);
        const isSoldOut = totalSeats > 0 && availableSeats <= 0;

        capacities[destination.id] = {
          availableSeats,
          isSoldOut,
          totalPassengers: totalImpact,
          totalSeats
        };
      }
      
      res.json(capacities);
    } catch (error) {
      console.error("Error getting destination capacities:", error);
      res.status(500).json({ error: "Failed to fetch destination capacities" });
    }
  });

  app.get("/api/destinations/:id", async (req, res) => {
    try {
      const destination = await storage.getDestination(req.params.id);
      if (!destination) {
        return res.status(404).json({ error: "Destination not found" });
      }
      res.json(destination);
    } catch (error) {
      console.error("Error getting destination:", error);
      res.status(500).json({ error: "Failed to fetch destination" });
    }
  });

  app.get("/api/destinations/:id/capacity", async (req, res) => {
    try {
      const destination = await storage.getDestination(req.params.id);
      if (!destination) {
        return res.status(404).json({ error: "Destination not found" });
      }

      let totalSeats = 0;
      if (destination.bus_id) {
        const bus = await storage.getBus(destination.bus_id);
        if (bus) {
          totalSeats = bus.total_seats;
        }
      }

      const seatReservations = await storage.getSeatReservationsByDestination(destination.id);
      
      // Filter out reservations for cancelled/deleted clients
      const filteredReservations = [];
      for (const res of seatReservations) {
        if (res.status === 'cancelled') continue;
        const client = await storage.getClient(res.client_id);
        if (!client || (client as any).is_deleted || (client as any).approval_status === "cancelled") continue;
        filteredReservations.push(res);
      }
      
      const seatReservationsCount = filteredReservations.length;
      const reservedClientIds = new Set(filteredReservations.filter(r => r.client_id).map(r => String(r.client_id)));
      const reservedChildIds = new Set(filteredReservations.filter(r => r.child_id).map(r => String(r.child_id)));

      const clients = (await storage.getClientsByDestination(destination.name)).filter(c => !(c as any).is_deleted && (c as any).approval_status !== "cancelled");
      
      let clientsWithoutSeatsCount = 0;
      let companionsWithoutSeatsCount = 0;

      for (const client of clients) {
        if (!reservedClientIds.has(String(client.id))) {
          clientsWithoutSeatsCount++;
        }
        
        const children = await storage.getChildrenByClientId(client.id);
        for (const child of children) {
          if (!reservedChildIds.has(String(child.id))) {
            companionsWithoutSeatsCount++;
          }
        }
      }

      const totalPassengers = seatReservationsCount + clientsWithoutSeatsCount + companionsWithoutSeatsCount;
      const availableSeats = Math.max(0, totalSeats - totalPassengers);
      const isSoldOut = totalSeats > 0 && availableSeats <= 0;

      res.json({
        destinationId: destination.id,
        destinationName: destination.name,
        totalSeats,
        seatReservationsCount,
        clientsWithoutSeats: clientsWithoutSeatsCount,
        companionsWithoutSeats: companionsWithoutSeatsCount,
        totalPassengers,
        availableSeats,
        isSoldOut
      });
    } catch (error) {
      console.error("Error getting destination capacity:", error);
      res.status(500).json({ error: "Failed to fetch destination capacity" });
    }
  });

  app.post("/api/destinations", validateBody(insertDestinationSchema), async (req, res) => {
    try {
      const destination = await storage.createDestination(req.body);
      res.status(201).json(destination);
    } catch (error) {
      console.error("Error creating destination:", error);
      res.status(500).json({ error: "Failed to create destination" });
    }
  });

  app.put("/api/destinations/:id", validateBody(insertDestinationSchema.partial()), async (req, res) => {
    try {
      const destination = await storage.updateDestination(req.params.id, req.body);
      res.json(destination);
    } catch (error) {
      console.error("Error updating destination:", error);
      res.status(500).json({ error: "Failed to update destination" });
    }
  });

  app.delete("/api/destinations/:id", async (req, res) => {
    try {
      await storage.deleteDestination(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting destination:", error);
      res.status(500).json({ error: "Failed to delete destination" });
    }
  });

  // Bus routes
  app.get("/api/buses", async (req, res) => {
    try {
      const buses = await storage.getBuses();
      res.json(buses);
    } catch (error) {
      console.error("Error getting buses:", error);
      res.status(500).json({ error: "Failed to fetch buses" });
    }
  });

  app.get("/api/buses/active", async (req, res) => {
    try {
      const buses = await storage.getActiveBuses();
      res.json(buses);
    } catch (error) {
      console.error("Error getting active buses:", error);
      res.status(500).json({ error: "Failed to fetch active buses" });
    }
  });

  app.get("/api/buses/:id", async (req, res) => {
    try {
      const bus = await storage.getBus(req.params.id);
      if (!bus) {
        return res.status(404).json({ error: "Bus not found" });
      }
      res.json(bus);
    } catch (error) {
      console.error("Error getting bus:", error);
      res.status(500).json({ error: "Failed to fetch bus" });
    }
  });

  app.post("/api/buses", validateBody(insertBusSchema), async (req, res) => {
    try {
      const bus = await storage.createBus(req.body);
      res.status(201).json(bus);
    } catch (error) {
      console.error("Error creating bus:", error);
      res.status(500).json({ error: "Failed to create bus" });
    }
  });

  app.put("/api/buses/:id", validateBody(insertBusSchema.partial()), async (req, res) => {
    try {
      const bus = await storage.updateBus(req.params.id, req.body);
      res.json(bus);
    } catch (error) {
      console.error("Error updating bus:", error);
      res.status(500).json({ error: "Failed to update bus" });
    }
  });

  app.delete("/api/buses/:id", async (req, res) => {
    try {
      await storage.deleteBus(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting bus:", error);
      res.status(500).json({ error: "Failed to delete bus" });
    }
  });

  // Seat reservation routes
  app.get("/api/seat-reservations", async (req, res) => {
    try {
      const reservations = await storage.getSeatReservations();
      res.json(reservations);
    } catch (error) {
      console.error("Error getting all seat reservations:", error);
      res.status(500).json({ error: "Failed to fetch seat reservations" });
    }
  });

  app.get("/api/seat-reservations/destination/:destinationId", async (req, res) => {
    try {
      const reservations = await storage.getSeatReservationsByDestination(req.params.destinationId);
      res.json(reservations);
    } catch (error) {
      console.error("Error getting seat reservations:", error);
      res.status(500).json({ error: "Failed to fetch seat reservations" });
    }
  });

  app.get("/api/seat-reservations/destination/:destinationId/with-clients", authenticateToken, async (req, res) => {
    try {
      const reservations = await storage.getSeatReservationsWithClientsByDestination(req.params.destinationId);
      
      // Process reservations to include child data directly in the response if needed
      const processedReservations = await Promise.all(reservations.map(async (res: any) => {
        // If it's a child but child_data is already there (from storage.ts logic), just return it
        if (res.is_child && res.child_data) {
          return { ...res, child: res.child_data };
        }
        
        // Fallback for cases where it's a child but child_data wasn't populated
        if (res.is_child && res.child_id && !res.child) {
          try {
            const child = await storage.getChild(res.child_id);
            return { ...res, child };
          } catch (e) {
            return res;
          }
        }
        return res;
      }));
      
      res.json(processedReservations);
    } catch (error) {
      console.error("Error getting seat reservations with clients:", error);
      res.status(500).json({ error: "Failed to fetch seat reservations with client details" });
    }
  });

  app.get("/api/passengers/destination/:destinationName", authenticateToken, async (req, res) => {
    try {
      const passengers = await storage.getAllPassengersByDestination(req.params.destinationName);
      res.json(passengers);
    } catch (error) {
      console.error("Error getting all passengers by destination:", error);
      res.status(500).json({ error: "Failed to fetch all passengers for destination" });
    }
  });

  app.get("/api/seat-reservations/bus/:busId", async (req, res) => {
    try {
      const reservations = await storage.getSeatReservationsByBus(req.params.busId);
      res.json(reservations);
    } catch (error) {
      console.error("Error getting seat reservations:", error);
      res.status(500).json({ error: "Failed to fetch seat reservations" });
    }
  });

  app.post("/api/seat-reservations", validateBody(insertSeatReservationSchema), async (req, res) => {
    try {
      // Check if seat is already reserved
      const existing = await storage.getSeatReservationByDestinationAndSeat(
        req.body.destination_id,
        req.body.seat_number
      );
      
      if (existing) {
        return res.status(409).json({ error: "Seat is already reserved" });
      }

      const reservation = await storage.createSeatReservation(req.body);
      res.status(201).json(reservation);
    } catch (error) {
      console.error("Error creating seat reservation:", error);
      res.status(500).json({ error: "Failed to create seat reservation" });
    }
  });

  app.put("/api/seat-reservations/:id", validateBody(insertSeatReservationSchema.partial()), async (req, res) => {
    try {
      // If changing seat number or destination, check for conflicts
      if (req.body.seat_number || req.body.destination_id) {
        const current = await storage.getSeatReservation(req.params.id);
        if (!current) {
          return res.status(404).json({ error: "Seat reservation not found" });
        }

        const newDestinationId = req.body.destination_id || current.destination_id;
        const newSeatNumber = req.body.seat_number || current.seat_number;

        // Check if the new seat is already reserved (excluding current reservation)
        const existing = await storage.getSeatReservationByDestinationAndSeat(
          newDestinationId,
          newSeatNumber
        );
        
        if (existing && existing.id !== req.params.id) {
          return res.status(409).json({ error: "Seat is already reserved" });
        }
      }

      const reservation = await storage.updateSeatReservation(req.params.id, req.body);
      res.json(reservation);
    } catch (error) {
      console.error("Error updating seat reservation:", error);
      res.status(500).json({ error: "Failed to update seat reservation" });
    }
  });

  app.delete("/api/seat-reservations/:id", async (req, res) => {
    try {
      await storage.deleteSeatReservation(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting seat reservation:", error);
      res.status(500).json({ error: "Failed to delete seat reservation" });
    }
  });

  // Manual seat assignment endpoint - creates minimal client and reserves seat
  app.post("/api/seat-reservations/manual", authenticateToken, requireRole(['admin', 'vadmin']), async (req: any, res) => {
    try {
      const { destination_id, bus_id, seat_number, client_name, cpf_or_rg, departure_location } = req.body;
      
      if (!destination_id || !bus_id || !seat_number || !client_name) {
        return res.status(400).json({ 
          error: "destination_id, bus_id, seat_number, and client_name are required" 
        });
      }

      // Check if seat is already reserved
      const existing = await storage.getSeatReservationByDestinationAndSeat(
        destination_id,
        seat_number
      );
      
      if (existing) {
        return res.status(409).json({ error: "Este assento já está reservado por outro passageiro." });
      }

      // Get destination to get the destination name
      const destination = await storage.getDestination(destination_id);
      if (!destination) {
        return res.status(404).json({ error: "Destination not found" });
      }

      // Split client name into first and last name
      const nameParts = client_name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || firstName;

      // Create a minimal client record for manual seat assignment
      const minimalClient = await storage.createClient({
        first_name: firstName,
        last_name: lastName,
        cpf: cpf_or_rg || "Manual",
        rg: cpf_or_rg,
        phone: "Manual",
        destination: destination.name,
        duration: destination.periodo_viagem_fim && destination.periodo_viagem_inicio 
          ? Math.ceil((destination.periodo_viagem_fim.getTime() - destination.periodo_viagem_inicio.getTime()) / (1000 * 60 * 60 * 24))
          : 1,
        birthdate: new Date(),
        departure_location: departure_location || "Manual",
        seat_number: seat_number,
        contract_type: "normal",
        client_type: "agencia",
        is_brinde: false,
      });

      // Create seat reservation
      const reservation = await storage.createSeatReservation({
        client_id: minimalClient.id,
        client_name: client_name,
        destination_id: destination_id,
        bus_id: bus_id,
        seat_number: seat_number,
        status: "reserved",
        is_reserved: true,
        reserved_at: new Date()
      });

      res.status(201).json({ reservation, client: minimalClient });
    } catch (error) {
      console.error("Error creating manual seat reservation:", error);
      res.status(500).json({ error: "Failed to create manual seat reservation" });
    }
  });

  // Get unassigned clients for a destination (clients + companions without seat reservations)
  app.get("/api/clients/destination/:destinationName/unassigned", authenticateToken, async (req: any, res) => {
    try {
      const destinationName = decodeURIComponent(req.params.destinationName);
      
      // Get all clients for this destination
      const allClients = await storage.getClientsByDestination(destinationName);
      
      // Get destination to get its ID
      const destinations = await storage.getDestinations();
      const destination = destinations.find(d => d.name === destinationName);
      
      if (!destination) {
        return res.json([]);
      }
      
      // Get all seat reservations for this destination
      const reservations = await storage.getSeatReservationsByDestination(destination.id);
      const reservedClientIds = new Set(reservations.map(r => r.client_id));
      const reservedChildIds = new Set(reservations.filter(r => r.child_id).map(r => r.child_id));
      
      // Build list of unassigned passengers (clients + companions/children)
      const unassignedPassengers: Array<{
        id: string;
        name: string;
        type: 'client' | 'companion';
        client_id: string;
        cpf?: string;
        rg?: string;
        departure_location?: string;
        child_id?: string;
      }> = [];
      
      const normalizedReservedNames = new Set(reservations.map(r => r.client_name?.toLowerCase().trim()));
      
      for (const client of allClients) {
        // Skip cancelled clients
        if ((client as any).approval_status === "cancelled" || (client as any).is_cancelled) continue;

        const clientName = `${client.first_name} ${client.last_name}`.toLowerCase().trim();
        // Add client if they don't have a seat AND their name isn't already on a seat
        const hasSeat = reservedClientIds.has(client.id) || normalizedReservedNames.has(clientName);
        if (!hasSeat) {
          unassignedPassengers.push({
            id: client.id,
            name: `${client.first_name} ${client.last_name}`,
            type: 'client',
            client_id: client.id,
            cpf: client.cpf || undefined,
            rg: client.rg || undefined,
            departure_location: client.departure_location || undefined
          });
        }
        
        // Get children/companions for this client
        const children = await storage.getChildrenByClientId(client.id);
        for (const child of children) {
          const childName = child.name.toLowerCase().trim();
          const childHasSeat = reservedChildIds.has(child.id) || normalizedReservedNames.has(childName);
          if (!childHasSeat) {
            unassignedPassengers.push({
              id: `child-${child.id}`,
              name: child.name,
              type: 'companion',
              client_id: client.id,
              cpf: child.cpf || undefined,
              rg: child.rg || undefined,
              child_id: child.id
            });
          }
        }
      }
      
      res.json(unassignedPassengers);
    } catch (error) {
      console.error("Error fetching unassigned clients:", error);
      res.status(500).json({ error: "Failed to fetch unassigned clients" });
    }
  });

  // Assign an existing client or companion to a seat
  app.post("/api/seat-reservations/assign-existing", authenticateToken, requireRole(['admin', 'vadmin']), async (req: any, res) => {
    try {
      const { client_id, destination_id, bus_id, seat_number, child_id, passenger_type } = req.body;
      
      if (!client_id || !destination_id || !bus_id || !seat_number) {
        return res.status(400).json({ 
          error: "client_id, destination_id, bus_id, and seat_number are required" 
        });
      }

      // Check if seat is already reserved
      const existing = await storage.getSeatReservationByDestinationAndSeat(
        destination_id,
        seat_number
      );
      
      if (existing) {
        return res.status(409).json({ error: "Este assento já está reservado por outro passageiro." });
      }

      // Handle companion/child seat assignment - check for child_id regardless of passenger_type
      // passenger_type can be 'companion', 'child', or similar values
      if (child_id) {
        const child = await storage.getChild(child_id);
        if (!child) {
          return res.status(404).json({ error: "Companion/child not found" });
        }

        // Create seat reservation for companion/child
        const reservation = await storage.createSeatReservation({
          client_id: client_id,
          child_id: child_id,
          client_name: child.name,
          destination_id: destination_id,
          bus_id: bus_id,
          seat_number: seat_number,
          status: "reserved",
          is_reserved: true,
          is_child: true,
          reserved_at: new Date()
        });

        res.status(201).json({ reservation, child });
        return;
      }

      // Get the client to get their name
      const client = await storage.getClient(client_id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      // Update client's seat number
      await storage.updateClient(client_id, { seat_number });

      // Create seat reservation
      const reservation = await storage.createSeatReservation({
        client_id: client_id,
        client_name: `${client.first_name} ${client.last_name}`,
        destination_id: destination_id,
        bus_id: bus_id,
        seat_number: seat_number,
        status: "reserved",
        is_reserved: true,
        reserved_at: new Date()
      });

      res.status(201).json({ reservation, client });
    } catch (error) {
      console.error("Error assigning existing client to seat:", error);
      res.status(500).json({ error: "Failed to assign client to seat" });
    }
  });

  // Child routes
  // Debug endpoint to list all children in the database
  app.get("/api/debug/children", async (req, res) => {
    try {
      console.log("📦 DEBUG: Fetching all children from database");
      const allChildren = await storage.getAllChildren();
      console.log(`📦 DEBUG: Found ${allChildren.length} total children in database`);
      
      // Group children by client_id
      const clientChildrenMap = new Map<string, any[]>();
      allChildren.forEach(child => {
        if (!clientChildrenMap.has(child.client_id)) {
          clientChildrenMap.set(child.client_id, []);
        }
        clientChildrenMap.get(child.client_id)!.push({
          id: child.id,
          name: child.name,
          relationship: child.relationship,
          price: child.price,
        });
      });
      
      // Get client names for the report
      const clientsWithChildren = [];
      for (const [clientId, children] of Array.from(clientChildrenMap.entries())) {
        try {
          const client = await storage.getClient(clientId);
          clientsWithChildren.push({
            client_id: clientId,
            client_name: client ? `${client.first_name} ${client.last_name}` : 'Unknown',
            children_count: children.length,
            children: children,
          });
        } catch {
          clientsWithChildren.push({
            client_id: clientId,
            client_name: 'Error fetching client',
            children_count: children.length,
            children: children,
          });
        }
      }
      
      res.json({
        total_children: allChildren.length,
        clients_with_children: clientsWithChildren,
      });
    } catch (error) {
      console.error("❌ Error in debug children:", error);
      res.status(500).json({ error: "Failed to fetch debug children data" });
    }
  });
  
  app.get("/api/children/client/:clientId", async (req, res) => {
    try {
      console.log("📦 Fetching children for client:", req.params.clientId);
      const children = await storage.getChildrenByClientId(req.params.clientId);
      console.log(`📦 Found ${children.length} children for client ${req.params.clientId}`);
      res.json(children);
    } catch (error) {
      console.error("❌ Error getting children by client ID:", error);
      res.status(500).json({ error: "Failed to fetch children" });
    }
  });

  app.get("/api/children/:id", async (req, res) => {
    try {
      const child = await storage.getChild(req.params.id);
      if (!child) {
        return res.status(404).json({ error: "Child not found" });
      }
      res.json(child);
    } catch (error) {
      console.error("Error getting child:", error);
      res.status(500).json({ error: "Failed to fetch child" });
    }
  });

  app.post("/api/children", validateBody(insertChildSchema), async (req, res) => {
    try {
      console.log("📦 Creating child with data:", JSON.stringify(req.body, null, 2));
      const child = await storage.createChild(req.body);
      console.log("✅ Child created successfully:", child.id);
      res.status(201).json(child);
    } catch (error) {
      console.error("❌ Error creating child:", error);
      res.status(500).json({ error: "Failed to create child" });
    }
  });

  app.put("/api/children/:id", validateBody(insertChildSchema.partial()), async (req, res) => {
    try {
      const child = await storage.updateChild(req.params.id, req.body);
      res.json(child);
    } catch (error) {
      console.error("Error updating child:", error);
      res.status(500).json({ error: "Failed to update child" });
    }
  });

  app.delete("/api/children/:id", async (req, res) => {
    try {
      await storage.deleteChild(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting child:", error);
      res.status(500).json({ error: "Failed to delete child" });
    }
  });

  // Monthly report routes
  app.get("/api/reports", async (req, res) => {
    try {
      const reports = await storage.getMonthlyReports();
      res.json(reports);
    } catch (error) {
      console.error("Error getting monthly reports:", error);
      res.status(500).json({ error: "Failed to fetch monthly reports" });
    }
  });

  app.get("/api/reports/:id", async (req, res) => {
    try {
      const report = await storage.getMonthlyReport(req.params.id);
      if (!report) {
        return res.status(404).json({ error: "Monthly report not found" });
      }
      res.json(report);
    } catch (error) {
      console.error("Error getting monthly report:", error);
      res.status(500).json({ error: "Failed to fetch monthly report" });
    }
  });

  app.post("/api/reports", validateBody(monthlyReportSchema), async (req, res) => {
    try {
      const report = await storage.createMonthlyReport(req.body);
      res.status(201).json(report);
    } catch (error) {
      console.error("Error creating monthly report:", error);
      res.status(500).json({ error: "Failed to create monthly report" });
    }
  });

  // Financial transaction routes
  app.get("/api/financial-transactions", authenticateToken, requireRole(['admin', 'vadmin']), async (req: any, res) => {
    try {
      const transactions = await storage.getFinancialTransactions();
      res.json(transactions);
    } catch (error) {
      console.error("Error getting financial transactions:", error);
      res.status(500).json({ error: "Failed to fetch financial transactions" });
    }
  });

  app.get("/api/financial-transactions/:id", authenticateToken, requireRole(['admin', 'vadmin']), async (req: any, res) => {
    try {
      const transaction = await storage.getFinancialTransaction(req.params.id);
      if (!transaction) {
        return res.status(404).json({ error: "Financial transaction not found" });
      }
      res.json(transaction);
    } catch (error) {
      console.error("Error getting financial transaction:", error);
      res.status(500).json({ error: "Failed to fetch financial transaction" });
    }
  });

  app.post("/api/financial-transactions", authenticateToken, requireRole(['admin', 'vadmin']), validateBody(insertFinancialTransactionSchema), async (req: any, res) => {
    try {
      // Get user info from authenticated user
      const user = await storage.getUser(req.user.uid);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Add creator info to the transaction
      const transactionData = {
        ...req.body,
        created_by_email: user.email,
        created_by_name: user.email.split('@')[0], // Use email username as name
      };

      const transaction = await storage.createFinancialTransaction(transactionData);
      res.status(201).json(transaction);
    } catch (error) {
      console.error("Error creating financial transaction:", error);
      res.status(500).json({ error: "Failed to create financial transaction" });
    }
  });

  app.put("/api/financial-transactions/:id", authenticateToken, requireRole(['admin', 'vadmin']), validateBody(insertFinancialTransactionSchema.partial()), async (req: any, res) => {
    try {
      const transaction = await storage.updateFinancialTransaction(req.params.id, req.body);
      res.json(transaction);
    } catch (error) {
      console.error("Error updating financial transaction:", error);
      res.status(500).json({ error: "Failed to update financial transaction" });
    }
  });

  app.delete("/api/financial-transactions/:id", authenticateToken, requireRole(['admin', 'vadmin']), async (req: any, res) => {
    try {
      await storage.deleteFinancialTransaction(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting financial transaction:", error);
      res.status(500).json({ error: "Failed to delete financial transaction" });
    }
  });

  // Client approval routes
  app.get("/api/approve/:token", async (req, res) => {
    try {
      const { token } = req.params;
      let client = await storage.getClientByApprovalToken(token);
      
      if (!client) {
        return res.status(404).json({ 
          client: null,
          valid: false,
          expired: false,
          already_approved: false
        });
      }

      const now = new Date();
      const already_approved = client.approval_status === "approved";
      
      // IMPORTANT: Once approved, the link never expires (unlimited access for 72 hours OR forever if approved)
      // Expiration only applies to PENDING approvals
      const expired = !already_approved && client.approval_expires_at ? client.approval_expires_at < now : false;

      // Track when the link is first opened (only if not already tracked)
      if (!(client as any).link_opened_at) {
        try {
          const updatedClient = await storage.updateClient(client.id, { 
            link_opened_at: now 
          } as any);
          if (updatedClient) {
            client = updatedClient;
          }
          console.log(`📧 Client ${client.id} opened approval link for the first time at ${now.toISOString()}`);
        } catch (trackError) {
          console.error("Error tracking link open:", trackError);
        }
      }

      // Get children/companions for this client
      const children = await storage.getChildrenByClientId(client.id);

      res.json({
        client: {
          ...client,
          children
        },
        // Link is valid if not expired (for pending) OR if already approved (unlimited access)
        valid: !expired,
        expired,
        already_approved
      });
    } catch (error) {
      console.error("Error validating approval token:", error);
      res.status(500).json({ error: "Failed to validate approval token" });
    }
  });

  app.post("/api/approve/:token", validateBody(clientApprovalResponseSchema), async (req, res) => {
    try {
      const { token } = req.params;
      const { accepted, terms_accepted } = req.body;
      
      if (!accepted || !terms_accepted) {
        return res.status(400).json({ 
          error: "Approval must be accepted with terms and conditions" 
        });
      }

      const approvedClient = await storage.approveClient(token);
      
      if (!approvedClient) {
        return res.status(404).json({ 
          error: "Invalid or expired approval token" 
        });
      }

      if (approvedClient.approval_status === "expired") {
        return res.status(400).json({ 
          error: "Approval token has expired" 
        });
      }

      // Check if destination has a bus configured
      const destinations = await storage.getDestinations();
      const destination = destinations.find(d => d.name === approvedClient.destination);
      
      // Generate URLs based on bus availability
      const pdfUrl = `/pdf/${token}`;
      let seatSelectionUrl = null;
      
      if (destination?.bus_id) {
        seatSelectionUrl = `/seat-selection/${token}`;
      }
      
      res.json({
        success: true,
        client: approvedClient,
        seat_selection_url: seatSelectionUrl,
        pdf_url: pdfUrl
      });
    } catch (error) {
      console.error("Error processing approval:", error);
      res.status(500).json({ error: "Failed to process approval" });
    }
  });

  // Seat selection routes
  app.get("/api/seat-selection/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const client = await storage.getClientByApprovalToken(token);
      
      if (!client) {
        return res.status(404).json({ 
          client: null,
          children: [],
          bus: null,
          destination_name: "",
          reserved_seats: [],
          valid: false,
          expired: false,
          already_selected: false
        });
      }

      const now = new Date();
      const already_approved = client.approval_status === "approved";
      
      // IMPORTANT: Once approved, the link never expires (unlimited access)
      // Expiration only applies to PENDING approvals
      const expired = !already_approved && client.approval_expires_at ? client.approval_expires_at < now : false;
      
      // Get children/companions for this client
      const children = await storage.getChildrenByClientId(client.id);
      
      // Check if all seats are already selected (main client + all children)
      const allSeatsSelected = !!client.seat_number && children.every(child => !!child.seat_number);
      const already_selected = allSeatsSelected;

      // Get the destination to find the bus
      const destinations = await storage.getDestinations();
      const destination = destinations.find(d => d.name === client.destination);
      
      let bus = null;
      let reserved_seats: string[] = [];
      
      if (destination?.bus_id) {
        bus = await storage.getBus(destination.bus_id);
        
        // Get all reserved seats for this destination/bus
        const reservations = await storage.getSeatReservationsByDestination(destination.id);
        reserved_seats = reservations.map(r => r.seat_number);
      }

      res.json({
        client,
        children,
        bus,
        destination_name: client.destination,
        destination_kids_policy: destination?.kids_policy || null,
        reserved_seats,
        // Link is valid if not expired OR if approved (unlimited access post-approval)
        valid: !expired || already_approved,
        expired,
        already_selected
      });
    } catch (error) {
      console.error("Error validating seat selection token:", error);
      res.status(500).json({ error: "Failed to validate seat selection token" });
    }
  });

  app.post("/api/seat-selection/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { client_seat, children_seats } = req.body;
      
      if (!client_seat) {
        return res.status(400).json({ 
          error: "Client seat number is required" 
        });
      }

      const client = await storage.getClientByApprovalToken(token);
      
      if (!client) {
        return res.status(404).json({ 
          error: "Invalid or expired token" 
        });
      }

      // Get children for this client
      const children = await storage.getChildrenByClientId(client.id);

      // Check if all seats are already selected
      const allSeatsSelected = !!client.seat_number && children.every(child => !!child.seat_number);
      if (allSeatsSelected) {
        return res.status(400).json({ 
          error: "Seats already selected" 
        });
      }

      // Get the destination to find the bus
      const destinations = await storage.getDestinations();
      const destination = destinations.find(d => d.name === client.destination);
      
      if (!destination) {
        return res.status(404).json({ 
          error: "Destination not found" 
        });
      }

      if (!destination.bus_id) {
        return res.status(400).json({ 
          error: "No bus configured for this destination" 
        });
      }

      // Collect all seat numbers being selected
      const allSeats = [client_seat];
      if (children_seats && Array.isArray(children_seats)) {
        children_seats.forEach((cs: { seat_number: string }) => allSeats.push(cs.seat_number));
      }

      // Check if any seats are already reserved
      const reservations = await storage.getSeatReservationsByDestination(destination.id);
      const takenSeats = allSeats.filter(seat => 
        reservations.some(r => r.seat_number === seat)
      );
      
      if (takenSeats.length > 0) {
        return res.status(409).json({ 
          error: `These seats are already reserved: ${takenSeats.join(', ')}` 
        });
      }

      // Check for duplicate seat selections within this request
      const uniqueSeats = new Set(allSeats);
      if (uniqueSeats.size !== allSeats.length) {
        return res.status(400).json({ 
          error: "Cannot select the same seat for multiple people" 
        });
      }

      // Create seat reservation for client
      await storage.createSeatReservation({
        client_id: client.id,
        client_name: `${client.first_name} ${client.last_name}`,
        destination_id: destination.id,
        bus_id: destination.bus_id,
        seat_number: client_seat,
        status: "reserved",
        is_reserved: true,
        reserved_at: new Date()
      });

      // Update client with selected seat
      await storage.updateClient(client.id, { seat_number: client_seat });

      // Create seat reservations and update children
      if (children_seats && Array.isArray(children_seats)) {
        for (const childSeat of children_seats) {
          const child = children.find(c => c.id === childSeat.child_id);
          if (child) {
            // Create seat reservation for child - use parent's client.id for family grouping in PDFs
            await storage.createSeatReservation({
              client_id: client.id,  // Use parent's client ID so families are grouped together
              client_name: child.name,
              destination_id: destination.id,
              bus_id: destination.bus_id,
              seat_number: childSeat.seat_number,
              status: "reserved",
              is_reserved: true,
              reserved_at: new Date()
            });

            // Update child with selected seat
            await storage.updateChild(child.id, { seat_number: childSeat.seat_number });
          }
        }
      }

      res.json({
        success: true,
        client_seat,
        children_seats
      });
    } catch (error) {
      console.error("Error saving seat selection:", error);
      res.status(500).json({ error: "Failed to save seat selection" });
    }
  });

  // Thank you page route - get destination info with WhatsApp link
  app.get("/api/thank-you/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const client = await storage.getClientByApprovalToken(token);
      
      if (!client) {
        return res.status(404).json({ 
          error: "Invalid token",
          whatsapp_group_link: null
        });
      }

      // Get the destination to find the WhatsApp group link
      const destinations = await storage.getDestinations();
      const destination = destinations.find(d => d.name === client.destination);
      
      res.json({
        client_name: `${client.first_name} ${client.last_name}`,
        destination_name: client.destination,
        whatsapp_group_link: destination?.whatsapp_group_link || null
      });
    } catch (error) {
      console.error("Error fetching thank you data:", error);
      res.status(500).json({ error: "Failed to fetch data" });
    }
  });

  // Receipt routes
  app.get("/api/receipts", authenticateToken, async (req, res) => {
    try {
      const receipts = await storage.getReceipts();
      res.json(receipts);
    } catch (error) {
      console.error("Error getting receipts:", error);
      res.status(500).json({ error: "Failed to fetch receipts" });
    }
  });

  app.get("/api/receipts/:id", authenticateToken, async (req, res) => {
    try {
      const receipt = await storage.getReceipt(req.params.id);
      if (!receipt) {
        return res.status(404).json({ error: "Receipt not found" });
      }
      res.json(receipt);
    } catch (error) {
      console.error("Error getting receipt:", error);
      res.status(500).json({ error: "Failed to fetch receipt" });
    }
  });

  app.post("/api/receipts", authenticateToken, validateBody(insertReceiptSchema), async (req: any, res) => {
    try {
      // Validate split payments total matches receipt amount
      if (req.body.split_payments && req.body.split_payments.length > 0) {
        const splitTotal = req.body.split_payments.reduce((sum: number, p: { amount: number }) => sum + (p.amount || 0), 0);
        if (Math.abs(splitTotal - req.body.amount) >= 0.01) {
          return res.status(400).json({ 
            message: `Total dos pagamentos divididos (R$ ${splitTotal.toFixed(2)}) não corresponde ao valor do recibo (R$ ${req.body.amount.toFixed(2)})` 
          });
        }
      }
      
      const receipt = await storage.createReceipt(req.body);
      
      // Automatically create financial transaction for company income only
      try {
        const user = await storage.getUser(req.user.uid);
        if (user) {
          // Create single company income transaction
          const transactionDescription = receipt.client_id ? 
            `${receipt.reference} - ${receipt.name}` :
            `Recibo: ${receipt.reference} - ${receipt.name}`;
            
          // Determine the final amount for the financial transaction
          // For credit card payments, we use the net amount (amount - fee) because the fee is discounted by the gateway
          // receipt.net_amount is already calculated on the frontend or stored in the database
          let transactionAmount = receipt.amount;
          if (receipt.payment_method === 'credito' && receipt.net_amount !== undefined && receipt.net_amount > 0) {
            transactionAmount = receipt.net_amount;
            console.log(`[Finance] Credit card receipt detected. Using net amount: R$ ${transactionAmount} (Original: R$ ${receipt.amount}, Fee: R$ ${receipt.fee_amount})`);
          }

          const companyTransactionData = {
            amount: transactionAmount,
            description: transactionDescription,
            type: "income" as const,
            category: "Receitas",
            payment_method: receipt.payment_method || 'dinheiro',
            transaction_date: receipt.created_at,
            created_by_email: user.email,
            created_by_name: user.email.split('@')[0],
          };
          
          await storage.createFinancialTransaction(companyTransactionData);
          
          // Handle parcela payments - supports both single and multiple parcela payments
          // parcela_payments is an array of {parcela_id, amount} for partial payment distribution
          const parcelaPayments = req.body.parcela_payments as Array<{parcela_id: string, amount: number}> | undefined;
          
          if (parcelaPayments && parcelaPayments.length > 0) {
            // Process each parcela payment (partial or full)
            for (const payment of parcelaPayments) {
              try {
                const parcela = await storage.getParcela(payment.parcela_id);
                if (!parcela) continue;
                
                // Store original amount if not already set
                const originalAmount = parcela.original_amount || parcela.amount + (parcela.paid_amount || 0);
                
                // Cap payment amount to remaining amount (prevent overpayment)
                const actualPaymentAmount = Math.min(payment.amount, parcela.amount);
                if (actualPaymentAmount <= 0) continue; // Skip if nothing to pay
                
                // Calculate new paid amount and remaining amount
                const currentPaidAmount = parcela.paid_amount || 0;
                const newPaidAmount = currentPaidAmount + actualPaymentAmount;
                const newRemainingAmount = Math.max(0, parcela.amount - actualPaymentAmount);
                
                // Determine status based on remaining amount
                const isPaid = newRemainingAmount <= 0;
                const status = isPaid ? 'paid' : 'partial';
                
                await storage.updateParcela(payment.parcela_id, {
                  amount: newRemainingAmount,
                  original_amount: originalAmount,
                  paid_amount: newPaidAmount,
                  is_paid: isPaid,
                  status: status,
                  paid_date: isPaid ? new Date(receipt.payment_date) : parcela.paid_date,
                  payment_method: receipt.payment_method,
                  receipt_id: receipt.id,
                });
                
                console.log(`[Parcela] Updated parcela ${payment.parcela_id}: paid R$${actualPaymentAmount}, remaining R$${newRemainingAmount}, total paid R$${newPaidAmount}`);
              } catch (parcelaError) {
                console.error(`Error updating parcela ${payment.parcela_id}:`, parcelaError);
              }
            }
          } else if (req.body.parcela_id) {
            // Legacy: Single parcela full payment (backward compatibility)
            try {
              const parcela = await storage.getParcela(req.body.parcela_id);
              if (parcela) {
                const originalAmount = parcela.original_amount || parcela.amount + (parcela.paid_amount || 0);
                
                // Cap payment amount to remaining amount (prevent overpayment)
                const paymentAmount = Math.min(receipt.amount, parcela.amount);
                if (paymentAmount > 0) {
                  const currentPaidAmount = parcela.paid_amount || 0;
                  const newPaidAmount = currentPaidAmount + paymentAmount;
                  const newRemainingAmount = Math.max(0, parcela.amount - paymentAmount);
                  const isPaid = newRemainingAmount <= 0;
                  
                  await storage.updateParcela(req.body.parcela_id, {
                    amount: newRemainingAmount,
                    original_amount: originalAmount,
                    paid_amount: newPaidAmount,
                    is_paid: isPaid,
                    status: isPaid ? 'paid' : 'partial',
                    paid_date: isPaid ? new Date(receipt.payment_date) : parcela.paid_date,
                    payment_method: receipt.payment_method,
                    receipt_id: receipt.id,
                  });
                  
                  console.log(`[Parcela] Updated single parcela ${req.body.parcela_id}: paid R$${paymentAmount}, remaining R$${newRemainingAmount}`);
                }
              }
            } catch (parcelaError) {
              console.error("Error updating parcela after receipt:", parcelaError);
            }
          }
        }
      } catch (txError) {
        console.error("Error creating financial transaction for receipt:", txError);
        // Don't fail the receipt creation if the transaction fails
      }
      
      res.status(201).json(receipt);
    } catch (error) {
      console.error("Error creating receipt:", error);
      res.status(500).json({ error: "Failed to create receipt" });
    }
  });

  app.put("/api/receipts/:id", authenticateToken, validateBody(insertReceiptSchema.partial()), async (req, res) => {
    try {
      // Validate split payments total matches receipt amount if both are provided
      if (req.body.split_payments && req.body.split_payments.length > 0 && req.body.amount) {
        const splitTotal = req.body.split_payments.reduce((sum: number, p: { amount: number }) => sum + (p.amount || 0), 0);
        if (Math.abs(splitTotal - req.body.amount) >= 0.01) {
          return res.status(400).json({ 
            message: `Total dos pagamentos divididos (R$ ${splitTotal.toFixed(2)}) não corresponde ao valor do recibo (R$ ${req.body.amount.toFixed(2)})` 
          });
        }
      }
      
      const receipt = await storage.updateReceipt(req.params.id, req.body);
      res.json(receipt);
    } catch (error) {
      console.error("Error updating receipt:", error);
      res.status(500).json({ error: "Failed to update receipt" });
    }
  });

  app.delete("/api/receipts/:id", authenticateToken, async (req, res) => {
    try {
      await storage.deleteReceipt(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting receipt:", error);
      res.status(500).json({ error: "Failed to delete receipt" });
    }
  });

  // Cancelled Client Credits routes
  app.get("/api/cancelled-client-credits", authenticateToken, requireRole(['admin', 'vadmin']), async (req, res) => {
    try {
      await storage.updateExpiredCredits();
      const credits = await storage.getCancelledClientCredits();
      res.json(credits);
    } catch (error) {
      console.error("Error getting cancelled client credits:", error);
      res.status(500).json({ error: "Failed to fetch cancelled client credits" });
    }
  });

  app.get("/api/cancelled-client-credits/active", authenticateToken, requireRole(['admin', 'vadmin']), async (req, res) => {
    try {
      await storage.updateExpiredCredits();
      const credits = await storage.getActiveCancelledClientCredits();
      res.json(credits);
    } catch (error) {
      console.error("Error getting active cancelled client credits:", error);
      res.status(500).json({ error: "Failed to fetch active credits" });
    }
  });

  app.get("/api/cancelled-client-credits/:id", authenticateToken, requireRole(['admin', 'vadmin']), async (req, res) => {
    try {
      const credit = await storage.getCancelledClientCredit(req.params.id);
      if (!credit) {
        return res.status(404).json({ error: "Credit not found" });
      }
      res.json(credit);
    } catch (error) {
      console.error("Error getting cancelled client credit:", error);
      res.status(500).json({ error: "Failed to fetch credit" });
    }
  });

  app.post("/api/clients/:id/cancel", authenticateToken, requireRole(['admin', 'vadmin']), async (req: any, res) => {
    try {
      const { reason } = req.body;
      if (!reason) {
        return res.status(400).json({ error: "Cancellation reason is required" });
      }

      const user = req.user;
      const result = await storage.cancelClient(
        req.params.id,
        reason,
        user.email,
        user.email.split('@')[0]
      );

      // Log the cancellation activity
      try {
        await storage.createActivity({
          action: "client_cancelled",
          user_id: user.uid,
          user_email: user.email,
          client_id: result.client.id,
          client_name: `${result.client.first_name} ${result.client.last_name}`,
          details: `Cliente cancelado: ${result.client.first_name} ${result.client.last_name}. Motivo: ${reason}. Crédito gerado: R$ ${result.credit.credit_amount.toFixed(2)}`
        });
      } catch (activityError) {
        console.error("Failed to log cancellation activity:", activityError);
      }

      res.json(result);
    } catch (error) {
      console.error("Error cancelling client:", error);
      res.status(500).json({ error: "Failed to cancel client" });
    }
  });

  app.post("/api/cancelled-client-credits/:id/use", authenticateToken, requireRole(['admin', 'vadmin']), async (req, res) => {
    try {
      const { usedForClientId } = req.body;
      if (!usedForClientId) {
        return res.status(400).json({ error: "Client ID is required" });
      }
      const credit = await storage.markCreditAsUsed(req.params.id, usedForClientId);
      res.json(credit);
    } catch (error) {
      console.error("Error marking credit as used:", error);
      res.status(500).json({ error: "Failed to use credit" });
    }
  });

  // Parcela routes
  app.get("/api/parcelas", authenticateToken, async (req, res) => {
    try {
      const parcelas = await storage.getParcelas();
      res.json(parcelas);
    } catch (error) {
      console.error("Error getting parcelas:", error);
      res.status(500).json({ error: "Failed to fetch parcelas" });
    }
  });

  app.get("/api/parcelas/client/:clientId", authenticateToken, async (req, res) => {
    try {
      const parcelas = await storage.getParcelasByClientId(req.params.clientId);
      res.json(parcelas);
    } catch (error) {
      console.error("Error getting parcelas by client:", error);
      res.status(500).json({ error: "Failed to fetch parcelas" });
    }
  });

  app.get("/api/parcelas/month/:month/:year", authenticateToken, async (req, res) => {
    try {
      const month = parseInt(req.params.month);
      const year = parseInt(req.params.year);
      let parcelas = await storage.getParcelasByMonth(month, year);
      
      // Filter out parcelas for deleted or cancelled clients
      const clients = await storage.getClients();
      const clientMap = new Map(clients.map(c => [c.id, c]));
      
      parcelas = parcelas.filter(p => {
        const client = clientMap.get(p.client_id);
        if (!client) return false;
        // Ensure we check for existence and then the value
        const isDeleted = (client as any).is_deleted === true || (client as any).is_deleted === "true" || (client as any).is_deleted === 1;
        const isCancelled = (client as any).is_cancelled === true || (client as any).is_cancelled === "true" || (client as any).is_cancelled === 1;
        return !isDeleted && !isCancelled;
      });
      
      res.json(parcelas);
    } catch (error) {
      console.error("Error getting parcelas by month:", error);
      res.status(500).json({ error: "Failed to fetch parcelas" });
    }
  });

  app.get("/api/parcelas/:id", authenticateToken, async (req, res) => {
    try {
      const parcela = await storage.getParcela(req.params.id);
      if (!parcela) {
        return res.status(404).json({ error: "Parcela not found" });
      }
      res.json(parcela);
    } catch (error) {
      console.error("Error getting parcela:", error);
      res.status(500).json({ error: "Failed to fetch parcela" });
    }
  });

  app.post("/api/parcelas", authenticateToken, validateBody(insertParcelaSchema), async (req, res) => {
    try {
      const parcela = await storage.createParcela(req.body);
      res.status(201).json(parcela);
    } catch (error) {
      console.error("Error creating parcela:", error);
      res.status(500).json({ error: "Failed to create parcela" });
    }
  });

  app.patch("/api/parcelas/:id", authenticateToken, validateBody(insertParcelaSchema.partial()), async (req: any, res) => {
    try {
      // Get the parcela first to access its details
      const parcela = await storage.getParcela(req.params.id);
      if (!parcela) {
        return res.status(404).json({ error: "Parcela not found" });
      }

      // If marking as paid, add user information
      const updateData = { ...req.body };
      if (updateData.is_paid === true && req.user) {
        updateData.paid_by_user_id = req.user.uid;
        updateData.paid_by_user_email = req.user.email;
        updateData.status = "paid";

        // Automatically create a receipt if not already exists
        const paymentMethod = req.body.payment_method || 'pix';
        
        // Robust number to words converter for Portuguese
        const numberToWords = (num: number): string => {
          if (num === 0) return 'zero reais';
          
          const ones = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
          const teens = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
          const tens = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
          const hundreds = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
          
          const intPart = Math.floor(num);
          const decPart = Math.round((num - intPart) * 100);
          
          // Helper function to convert numbers 0-999
          const convertUpTo999 = (n: number): string => {
            if (n === 0) return '';
            
            let result = '';
            
            // Hundreds
            if (n >= 100) {
              if (n === 100) {
                result = 'cem';
              } else {
                result = hundreds[Math.floor(n / 100)];
                if (n % 100 !== 0) result += ' e ';
              }
            }
            
            // Tens and ones
            const lastTwo = n % 100;
            if (lastTwo >= 10 && lastTwo < 20) {
              result += teens[lastTwo - 10];
            } else {
              if (lastTwo >= 20) {
                result += tens[Math.floor(lastTwo / 10)];
                if (lastTwo % 10 !== 0) result += ' e ';
              }
              if (lastTwo % 10 !== 0 || (lastTwo < 10 && lastTwo > 0)) {
                result += ones[lastTwo % 10];
              }
            }
            
            return result;
          };
          
          let result = '';
          
          // Millions
          if (intPart >= 1000000) {
            const millions = Math.floor(intPart / 1000000);
            if (millions === 1) {
              result += 'um milhão';
            } else {
              result += convertUpTo999(millions) + ' milhões';
            }
            if (intPart % 1000000 !== 0) {
              result += ' e ';
            }
          }
          
          // Thousands
          const thousands = Math.floor((intPart % 1000000) / 1000);
          if (thousands > 0) {
            if (thousands === 1) {
              result += 'mil';
            } else {
              result += convertUpTo999(thousands) + ' mil';
            }
            if (intPart % 1000 !== 0) result += ' e ';
          }
          
          // Hundreds, tens, and ones
          const remainder = intPart % 1000;
          if (remainder > 0 || intPart === 0) {
            result += convertUpTo999(remainder);
          }
          
          // Handle empty result (should not happen, but just in case)
          if (!result.trim()) {
            result = 'zero';
          }
          
          result += intPart === 1 ? ' real' : ' reais';
          
          // Cents
          if (decPart > 0) {
            result += ' e ' + convertUpTo999(decPart);
            result += decPart === 1 ? ' centavo' : ' centavos';
          }
          
          return result.trim();
        };

        try {
          await storage.createReceipt({
            name: parcela.client_name || 'Cliente',
            amount: parcela.amount,
            amount_in_words: numberToWords(parcela.amount),
            reference: `Parcela ${parcela.installment_number || 1}/${parcela.total_installments || 1} - Pagamento de viagem`,
            payment_method: paymentMethod as "dinheiro" | "pix" | "credito" | "debito" | "boleto" | "link",
            payment_date: new Date(),
            paid_to: req.user.email || 'RODA BEM TURISMO',
          });
        } catch (receiptError) {
          console.error("Error creating receipt:", receiptError);
          // Continue even if receipt creation fails
        }
      } else if (updateData.is_paid === false) {
        // If unmarking as paid, explicitly clear the user information with null
        updateData.paid_by_user_id = null;
        updateData.paid_by_user_email = null;
        updateData.paid_date = null;
      }
      
      const updatedParcela = await storage.updateParcela(req.params.id, updateData);
      res.json(updatedParcela);
    } catch (error) {
      console.error("Error updating parcela:", error);
      res.status(500).json({ error: "Failed to update parcela" });
    }
  });

  app.delete("/api/parcelas/:id", authenticateToken, async (req, res) => {
    try {
      await storage.deleteParcela(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting parcela:", error);
      res.status(500).json({ error: "Failed to delete parcela" });
    }
  });

  // Reset and regenerate parcelas for a client
  app.post("/api/clients/:id/regenerate-parcelas", authenticateToken, requireRole(['admin', 'vadmin']), async (req: any, res) => {
    try {
      const clientId = req.params.id;
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      // Delete all existing parcelas for this client
      const allParcelas = await storage.getParcelas();
      const clientParcelas = allParcelas.filter((p: any) => p.client_id === clientId);
      
      for (const parcela of clientParcelas) {
        await storage.deleteParcela(parcela.id);
      }
      
      // Only regenerate if client has installment payment method
      if (client.payment_method === 'crediario_agencia' && client.installments_count && client.first_installment_due_date) {
        // Get children/companions to calculate total travel amount
        const children = await storage.getChildrenByClientId(clientId);
        const childrenTotal = children.reduce((sum: number, child: any) => sum + (child.price || 0), 0);
        
        // Total travel price includes client price + all companions' prices
        const clientPrice = client.travel_price || 0;
        const totalTravelPrice = clientPrice + childrenTotal;
        const downPayment = client.down_payment || 0;
        const remainingAmount = totalTravelPrice - downPayment;
        const installmentAmount = remainingAmount / client.installments_count;

        // Parse the first installment due date
        const firstDueDate = new Date(client.first_installment_due_date);

        const newParcelas = [];
        for (let i = 0; i < client.installments_count; i++) {
          const dueDate = new Date(firstDueDate);
          dueDate.setMonth(dueDate.getMonth() + i);

          const parcela = await storage.createParcela({
            client_id: client.id,
            client_name: `${client.first_name} ${client.last_name}`,
            client_phone: client.phone,
            amount: installmentAmount,
            due_date: dueDate,
            installment_number: i + 1,
            total_installments: client.installments_count,
            is_paid: false,
            status: "pending",
            paid_amount: 0,
          });
          newParcelas.push(parcela);
        }
        
        console.log(`Regenerated ${client.installments_count} parcelas for client ${clientId}. Total: ${totalTravelPrice}, Each: ${installmentAmount}`);
        
        res.json({
          success: true,
          message: `${clientParcelas.length} parcelas antigas removidas e ${newParcelas.length} novas criadas`,
          parcelas: newParcelas,
          calculation: {
            clientPrice,
            childrenTotal,
            totalTravelPrice,
            downPayment,
            remainingAmount,
            installmentAmount,
            installmentsCount: client.installments_count,
          }
        });
      } else {
        res.json({
          success: true,
          message: `${clientParcelas.length} parcelas removidas. Cliente não usa crediário da agência.`,
          parcelas: [],
        });
      }
    } catch (error) {
      console.error("Error regenerating parcelas:", error);
      res.status(500).json({ error: "Failed to regenerate parcelas" });
    }
  });

  app.get("/api/departments", async (req, res) => {
    try {
      const departments = await storage.getDepartments();
      res.json(departments);
    } catch (error) {
      console.error("Error getting departments:", error);
      res.status(500).json({ error: "Failed to fetch departments" });
    }
  });

  app.get("/api/departments/active", async (req, res) => {
    try {
      const departments = await storage.getActiveDepartments();
      res.json(departments);
    } catch (error) {
      console.error("Error getting active departments:", error);
      res.status(500).json({ error: "Failed to fetch active departments" });
    }
  });

  app.get("/api/departments/:id", async (req, res) => {
    try {
      const department = await storage.getDepartment(req.params.id);
      if (!department) {
        return res.status(404).json({ error: "Department not found" });
      }
      res.json(department);
    } catch (error) {
      console.error("Error getting department:", error);
      res.status(500).json({ error: "Failed to fetch department" });
    }
  });

  app.post("/api/departments", authenticateToken, validateBody(insertDepartmentSchema), async (req, res) => {
    try {
      const department = await storage.createDepartment(req.body);
      res.status(201).json(department);
    } catch (error) {
      console.error("Error creating department:", error);
      res.status(500).json({ error: "Failed to create department" });
    }
  });

  app.put("/api/departments/:id", authenticateToken, validateBody(insertDepartmentSchema.partial()), async (req, res) => {
    try {
      const department = await storage.updateDepartment(req.params.id, req.body);
      res.json(department);
    } catch (error) {
      console.error("Error updating department:", error);
      res.status(500).json({ error: "Failed to update department" });
    }
  });

  app.delete("/api/departments/:id", authenticateToken, async (req, res) => {
    try {
      await storage.deleteDepartment(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting department:", error);
      res.status(500).json({ error: "Failed to delete department" });
    }
  });

  app.post("/api/departments/seed", authenticateToken, async (req, res) => {
    try {
      const existingDepartments = await storage.getDepartments();
      if (existingDepartments.length > 0) {
        return res.status(400).json({ error: "Departments already exist. Please delete existing departments first." });
      }

      const initialDepartments = [
        {
          name: "Diretoria / Gestão Estratégica",
          description: "Tomar decisões estratégicas e supervisionar os resultados globais da empresa.",
          responsible: "Proprietário(a) / Diretor(a)",
          subsectors: [
            { title: "Planejamento estratégico e metas anuais", description: "Definição de objetivos e planejamento de longo prazo da agência." },
            { title: "Parcerias e negociações com fornecedores", description: "Estabelecimento de relações comerciais e acordos com parceiros estratégicos." },
            { title: "Controle financeiro geral e orçamento", description: "Supervisão das finanças e gestão orçamentária da empresa." },
            { title: "Definição de políticas internas e cultura organizacional", description: "Criação de diretrizes e valores da empresa." },
            { title: "Avaliação de desempenho dos setores", description: "Monitoramento e avaliação do desempenho de cada departamento." }
          ],
          order: 1,
          is_active: true
        },
        {
          name: "Departamento Administrativo-Financeiro",
          description: "Gerir os recursos da agência, garantir o equilíbrio financeiro e cuidar da parte legal.",
          subsectors: [
            { title: "Financeiro", description: "Controle de contas a pagar/receber, fluxo de caixa e conciliação bancária." },
            { title: "Contabilidade", description: "Emissão de notas fiscais, fechamento mensal e contato com contador." },
            { title: "Administrativo", description: "Controle de contratos, documentos, fornecedores e infraestrutura." },
            { title: "Jurídico", description: "Análise de contratos e conformidade legal." }
          ],
          order: 2,
          is_active: true
        },
        {
          name: "Departamento de Atendimento ao Cliente",
          description: "Atender e acompanhar o cliente em todas as etapas — pré e pós-venda.",
          subsectors: [
            { title: "Atendimento presencial, WhatsApp e redes sociais", description: "Responder dúvidas e captar leads através de diversos canais de comunicação." },
            { title: "Pós-venda", description: "Acompanhamento após a compra, feedbacks e fidelização de clientes." },
            { title: "Atendimento automatizado", description: "Chatbots e fluxos automáticos para consultas rápidas." }
          ],
          order: 3,
          is_active: true
        },
        {
          name: "Departamento Comercial / Vendas",
          description: "Converter oportunidades em vendas e manter relacionamento com clientes e empresas parceiras.",
          subsectors: [
            { title: "Consultores de viagem", description: "Criação de orçamentos personalizados e fechamento de pacotes de viagem." },
            { title: "Gestão de leads", description: "Controle e acompanhamento dos contatos recebidos." },
            { title: "Parcerias corporativas", description: "Atendimento a empresas, convênios e programas de benefícios." },
            { title: "Gestão de metas e comissões", description: "Controle de performance da equipe de vendas." }
          ],
          order: 4,
          is_active: true
        },
        {
          name: "Departamento de Marketing e Comunicação",
          description: "Promover a marca, gerar visibilidade e atrair novos clientes.",
          subsectors: [
            { title: "Marketing digital", description: "Gestão de redes sociais, tráfego pago e e-mail marketing." },
            { title: "Design e conteúdo", description: "Criação de posts, vídeos e materiais promocionais." },
            { title: "Planejamento de campanhas e datas sazonais", description: "Estratégias para Black Friday, férias, feriados e outras datas especiais." },
            { title: "Relacionamento e engajamento", description: "Promoções, sorteios e parcerias locais." }
          ],
          order: 5,
          is_active: true
        },
        {
          name: "Departamento de Produtos e Operações",
          description: "Criar, organizar e operacionalizar os pacotes de viagem.",
          subsectors: [
            { title: "Montagem de pacotes", description: "Definição de roteiros, hospedagens, transportes e guias." },
            { title: "Negociação com fornecedores", description: "Hotéis, companhias aéreas e seguradoras." },
            { title: "Gestão de reservas e documentos", description: "Emissão de vouchers, passagens e seguros." },
            { title: "Controle de disponibilidade e logística", description: "Monitoramento das viagens em andamento." }
          ],
          order: 6,
          is_active: true
        },
        {
          name: "Departamento de Tecnologia e Inovação",
          description: "Automatizar processos e integrar sistemas.",
          subsectors: [
            { title: "Sistema de gestão de clientes e vendas (CRM)", description: "Plataforma centralizada para gerenciar relacionamento com clientes." },
            { title: "Automação de atendimento", description: "Chatbot, WhatsApp Business e automação de e-mail." },
            { title: "Gestão de dados e relatórios de desempenho", description: "Análise de métricas e KPIs do negócio." },
            { title: "Integração com plataformas de reservas e meios de pagamento", description: "Conexão com sistemas externos para facilitar operações." }
          ],
          order: 7,
          is_active: true
        },
        {
          name: "Departamento de Recursos Humanos (RH)",
          description: "Cuidar da equipe, desenvolvimento profissional e clima organizacional.",
          subsectors: [
            { title: "Recrutamento e seleção", description: "Processos de contratação e identificação de talentos." },
            { title: "Treinamento e capacitação", description: "Desenvolvimento de habilidades da equipe." },
            { title: "Gestão de desempenho e metas", description: "Avaliação e acompanhamento de resultados individuais." },
            { title: "Benefícios, folha de pagamento, motivação e reconhecimento", description: "Gestão de remuneração e programas de engajamento." }
          ],
          order: 8,
          is_active: true
        },
        {
          name: "Departamento de Planejamento e Estratégia",
          description: "Analisar o desempenho da empresa e propor melhorias.",
          subsectors: [
            { title: "Análise de mercado e concorrência", description: "Estudos de mercado e benchmarking competitivo." },
            { title: "Planejamento anual e sazonal de vendas", description: "Estratégias de vendas baseadas em sazonalidade." },
            { title: "Relatórios e indicadores (KPIs)", description: "Monitoramento de métricas chave de desempenho." },
            { title: "Planejamento de expansão e novos serviços", description: "Identificação de oportunidades de crescimento." }
          ],
          order: 9,
          is_active: true
        }
      ];

      const createdDepartments = [];
      for (const dept of initialDepartments) {
        const created = await storage.createDepartment(dept);
        createdDepartments.push(created);
      }

      res.status(201).json({ 
        message: "Initial departments seeded successfully",
        departments: createdDepartments
      });
    } catch (error) {
      console.error("Error seeding departments:", error);
      res.status(500).json({ error: "Failed to seed departments" });
    }
  });

  // Time record routes
  app.get("/api/time-records", authenticateToken, async (req, res) => {
    try {
      const timeRecords = await storage.getTimeRecords();
      res.json(timeRecords);
    } catch (error) {
      console.error("Error getting time records:", error);
      res.status(500).json({ error: "Failed to fetch time records" });
    }
  });

  app.get("/api/time-records/today", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      const userId = req.user.uid;
      const todayRecord = await storage.getTodayTimeRecord(userId);
      res.json(todayRecord || null);
    } catch (error) {
      console.error("Error getting today's time record:", error);
      res.status(500).json({ error: "Failed to fetch today's time record" });
    }
  });

  app.get("/api/time-records/user/:userId", authenticateToken, async (req, res) => {
    try {
      const timeRecords = await storage.getTimeRecordsByUserId(req.params.userId);
      res.json(timeRecords);
    } catch (error) {
      console.error("Error getting user time records:", error);
      res.status(500).json({ error: "Failed to fetch user time records" });
    }
  });

  app.get("/api/time-records/range", authenticateToken, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required" });
      }
      const timeRecords = await storage.getTimeRecordsByDateRange(
        startDate as string,
        endDate as string
      );
      res.json(timeRecords);
    } catch (error) {
      console.error("Error getting time records by date range:", error);
      res.status(500).json({ error: "Failed to fetch time records" });
    }
  });

  app.post("/api/time-records/clock-in", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      const userId = req.user.uid;
      const userEmail = req.user.email;
      const userName = userEmail;

      const existingRecord = await storage.getTodayTimeRecord(userId);
      if (existingRecord) {
        return res.status(400).json({ error: "Already clocked in today" });
      }

      const now = new Date();
      // Get date in Brazil timezone (UTC-3)
      const brazilDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
      const today = `${brazilDate.getFullYear()}-${String(brazilDate.getMonth() + 1).padStart(2, '0')}-${String(brazilDate.getDate()).padStart(2, '0')}`;

      const timeRecord = await storage.createTimeRecord({
        user_id: userId,
        user_email: userEmail,
        user_name: userName,
        clock_in: now,
        clock_out: null,
        break_start: null,
        break_end: null,
        break_duration_minutes: 0,
        total_hours: 0,
        date: today,
      });

      res.status(201).json(timeRecord);
    } catch (error) {
      console.error("Error clocking in:", error);
      res.status(500).json({ error: "Failed to clock in" });
    }
  });

  app.post("/api/time-records/start-break", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      const userId = req.user.uid;
      const todayRecord = await storage.getTodayTimeRecord(userId);

      if (!todayRecord) {
        return res.status(404).json({ error: "No time record found for today" });
      }

      if (todayRecord.break_start) {
        return res.status(400).json({ error: "Break already started" });
      }

      const now = new Date();
      const updatedRecord = await storage.updateTimeRecord(todayRecord.id, {
        break_start: now,
      });

      res.json(updatedRecord);
    } catch (error) {
      console.error("Error starting break:", error);
      res.status(500).json({ error: "Failed to start break" });
    }
  });

  app.post("/api/time-records/end-break", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      const userId = req.user.uid;
      const todayRecord = await storage.getTodayTimeRecord(userId);

      if (!todayRecord) {
        return res.status(404).json({ error: "No time record found for today" });
      }

      if (!todayRecord.break_start) {
        return res.status(400).json({ error: "Break not started" });
      }

      if (todayRecord.break_end) {
        return res.status(400).json({ error: "Break already ended" });
      }

      const now = new Date();
      const breakDuration = Math.floor(
        (now.getTime() - new Date(todayRecord.break_start).getTime()) / (1000 * 60)
      );

      const updatedRecord = await storage.updateTimeRecord(todayRecord.id, {
        break_end: now,
        break_duration_minutes: breakDuration,
      });

      res.json(updatedRecord);
    } catch (error) {
      console.error("Error ending break:", error);
      res.status(500).json({ error: "Failed to end break" });
    }
  });

  app.post("/api/time-records/start-lunch", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      const userId = req.user.uid;
      const todayRecord = await storage.getTodayTimeRecord(userId);

      if (!todayRecord) {
        return res.status(404).json({ error: "No time record found for today" });
      }

      if (todayRecord.lunch_start) {
        return res.status(400).json({ error: "Lunch already started" });
      }

      const now = new Date();
      const updatedRecord = await storage.updateTimeRecord(todayRecord.id, {
        lunch_start: now,
      });

      res.json(updatedRecord);
    } catch (error) {
      console.error("Error starting lunch:", error);
      res.status(500).json({ error: "Failed to start lunch" });
    }
  });

  app.post("/api/time-records/end-lunch", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      const userId = req.user.uid;
      const todayRecord = await storage.getTodayTimeRecord(userId);

      if (!todayRecord) {
        return res.status(404).json({ error: "No time record found for today" });
      }

      if (!todayRecord.lunch_start) {
        return res.status(400).json({ error: "Lunch not started" });
      }

      if (todayRecord.lunch_end) {
        return res.status(400).json({ error: "Lunch already ended" });
      }

      const now = new Date();
      const lunchDuration = Math.floor(
        (now.getTime() - new Date(todayRecord.lunch_start).getTime()) / (1000 * 60)
      );

      const updatedRecord = await storage.updateTimeRecord(todayRecord.id, {
        lunch_end: now,
        lunch_duration_minutes: lunchDuration,
      });

      res.json(updatedRecord);
    } catch (error) {
      console.error("Error ending lunch:", error);
      res.status(500).json({ error: "Failed to end lunch" });
    }
  });

  app.post("/api/time-records/clock-out", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      const userId = req.user.uid;
      const todayRecord = await storage.getTodayTimeRecord(userId);

      if (!todayRecord) {
        return res.status(404).json({ error: "No time record found for today" });
      }

      if (todayRecord.clock_out) {
        return res.status(400).json({ error: "Already clocked out" });
      }

      const now = new Date();
      
      // If break is still active (started but not ended), calculate its duration
      let breakDurationMinutes = todayRecord.break_duration_minutes || 0;
      if (todayRecord.break_start && !todayRecord.break_end) {
        const breakStartTime = todayRecord.break_start instanceof Date ? todayRecord.break_start : new Date(todayRecord.break_start);
        breakDurationMinutes = Math.floor(
          (now.getTime() - breakStartTime.getTime()) / (1000 * 60)
        );
        // Update the break_end and break_duration_minutes
        await storage.updateTimeRecord(todayRecord.id, {
          break_end: now,
          break_duration_minutes: breakDurationMinutes,
        });
      }
      
      // If lunch is still active
      let lunchDurationMinutes = todayRecord.lunch_duration_minutes || 0;
      if (todayRecord.lunch_start && !todayRecord.lunch_end) {
        const lunchStartTime = todayRecord.lunch_start instanceof Date ? todayRecord.lunch_start : new Date(todayRecord.lunch_start);
        lunchDurationMinutes = Math.floor((now.getTime() - lunchStartTime.getTime()) / (1000 * 60));
        await storage.updateTimeRecord(todayRecord.id, {
          lunch_end: now,
          lunch_duration_minutes: lunchDurationMinutes,
        });
      }
      
      const clockInTime = todayRecord.clock_in instanceof Date ? todayRecord.clock_in : new Date(todayRecord.clock_in || now);
      const totalElapsedMinutes = Math.floor((now.getTime() - clockInTime.getTime()) / (1000 * 60));
      const breakMinutes = todayRecord.break_duration_minutes || 0;
      const lunchMinutes = todayRecord.lunch_duration_minutes || 0;
      const totalBreakMinutes = breakMinutes + lunchMinutes;
      const netWorkingMinutes = Math.max(0, totalElapsedMinutes - totalBreakMinutes);
      const totalHours = netWorkingMinutes / 60;

      const updatedRecord = await storage.updateTimeRecord(todayRecord.id, {
        clock_out: now,
        total_hours: Math.round(totalHours * 100) / 100,
      });

      res.json(updatedRecord);
    } catch (error) {
      console.error("Error clocking out:", error);
      res.status(500).json({ error: "Failed to clock out" });
    }
  });

  // Generate QR code for facial verification clock-out
  app.post("/api/time-records/generate-clockout-qr", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      const userId = req.user.uid;
      const userEmail = req.user.email;
      const todayRecord = await storage.getTodayTimeRecord(userId);

      if (!todayRecord) {
        return res.status(404).json({ error: "No time record found for today" });
      }

      if (todayRecord.clock_out) {
        return res.status(400).json({ error: "Already clocked out" });
      }

      // Get user info for display
      const user = await storage.getUser(userId);
      const userName = user?.email?.split('@')[0] || 'User';

      // Generate unique token for QR code
      const verificationToken = nanoid(32);
      
      // Session expires in 10 minutes
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      // Create facial verification session
      const session = await storage.createFacialVerificationSession({
        user_id: userId,
        user_email: userEmail,
        user_name: userName,
        verification_token: verificationToken,
        time_record_id: todayRecord.id,
        status: "pending",
        expires_at: expiresAt,
      });

      // Generate QR code URL (will point to the verification page)
      const verificationUrl = `${req.protocol}://${req.get('host')}/verify-clockout/${verificationToken}`;
      
      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 300,
      });

      console.log("========== SERVER QR CODE GENERATION ==========");
      console.log("Verification URL:", verificationUrl);
      console.log("QR Code generated, length:", qrCodeDataUrl.length);
      console.log("QR Code starts with:", qrCodeDataUrl.substring(0, 50));
      console.log("Expires At:", expiresAt);
      console.log("===============================================");

      res.json({
        session_id: session.id,
        verification_token: verificationToken,
        qr_code: qrCodeDataUrl,
        verification_url: verificationUrl,
        expires_at: expiresAt,
      });
    } catch (error) {
      console.error("Error generating clock-out QR code:", error);
      res.status(500).json({ error: "Failed to generate QR code" });
    }
  });

  // Get facial verification session by token
  app.get("/api/facial-verification/session/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const session = await storage.getFacialVerificationSessionByToken(token);

      if (!session) {
        return res.status(404).json({ error: "Verification session not found" });
      }

      // Check if session is expired
      if (session.expires_at && new Date(session.expires_at) < new Date()) {
        await storage.updateFacialVerificationSession(session.id, { status: "expired" });
        return res.status(410).json({ error: "Verification session expired" });
      }

      // Return session info without sensitive data
      res.json({
        session_id: session.id,
        user_name: session.user_name,
        status: session.status,
        expires_at: session.expires_at,
      });
    } catch (error) {
      console.error("Error getting verification session:", error);
      res.status(500).json({ error: "Failed to get verification session" });
    }
  });

  // Verify facial recognition and complete clock-out
  app.post("/api/facial-verification/verify", async (req, res) => {
    try {
      const { token, facial_match_confidence, verification_method, verification_metadata } = req.body;

      if (!token) {
        return res.status(400).json({ error: "Verification token is required" });
      }

      const session = await storage.getFacialVerificationSessionByToken(token);

      if (!session) {
        return res.status(404).json({ error: "Verification session not found" });
      }

      // Check if session is expired
      if (session.expires_at && new Date(session.expires_at) < new Date()) {
        await storage.updateFacialVerificationSession(session.id, { status: "expired" });
        return res.status(410).json({ error: "Verification session expired" });
      }

      // Check if session already processed
      if (session.status !== "pending") {
        return res.status(400).json({ error: `Verification already ${session.status}` });
      }

      // Extract photo from metadata
      let photoDataUrl: string | undefined;
      if (verification_metadata) {
        try {
          const metadata = JSON.parse(verification_metadata);
          photoDataUrl = metadata.photo_data_url;
        } catch (error) {
          console.error("Failed to parse verification metadata:", error);
        }
      }

      // Verify confidence score (require at least 80% confidence for banking-level security)
      const confidenceThreshold = 80;
      if (facial_match_confidence !== undefined && facial_match_confidence < confidenceThreshold) {
        await storage.updateFacialVerificationSession(session.id, {
          status: "failed",
          facial_match_confidence,
          verification_method,
          verification_metadata,
          photo_data_url: photoDataUrl,
        });
        return res.status(403).json({ error: "Facial verification failed: confidence too low" });
      }

      // Update session status to verified and save photo
      await storage.updateFacialVerificationSession(session.id, {
        status: "verified",
        facial_match_confidence,
        verification_method,
        verification_metadata,
        photo_data_url: photoDataUrl,
        verified_at: new Date(),
      });

      // Get the time record and complete clock-out
      if (!session.time_record_id) {
        return res.status(400).json({ error: "No time record associated with this session" });
      }
      const timeRecord = await storage.getTimeRecord(session.time_record_id);

      if (!timeRecord) {
        return res.status(404).json({ error: "Time record not found" });
      }

      if (timeRecord.clock_out) {
        return res.status(400).json({ error: "Already clocked out" });
      }

      const now = new Date();
      
      // If break is still active (started but not ended), calculate its duration
      let breakDurationMinutes = timeRecord.break_duration_minutes || 0;
      if (timeRecord.break_start && !timeRecord.break_end) {
        const breakStartTime = timeRecord.break_start instanceof Date ? timeRecord.break_start : new Date(timeRecord.break_start);
        breakDurationMinutes = Math.floor(
          (now.getTime() - breakStartTime.getTime()) / (1000 * 60)
        );
        // Update the break_end and break_duration_minutes
        await storage.updateTimeRecord(timeRecord.id, {
          break_end: now,
          break_duration_minutes: breakDurationMinutes,
        });
      }
      
      const clockInTime = timeRecord.clock_in instanceof Date ? timeRecord.clock_in : new Date(timeRecord.clock_in || now);
      const totalMilliseconds = now.getTime() - clockInTime.getTime();
      const breakMilliseconds = (breakDurationMinutes || 0) * 60 * 1000;
      const workingMilliseconds = totalMilliseconds - breakMilliseconds;
      const totalHours = workingMilliseconds / (1000 * 60 * 60);

      const updatedRecord = await storage.updateTimeRecord(timeRecord.id, {
        clock_out: now,
        total_hours: Math.round(totalHours * 100) / 100,
      });

      // Send logout signal to the user who generated the QR code
      try {
        const { getWebSocketManager } = await import("./websocket");
        const wsManager = getWebSocketManager();
        if (wsManager && timeRecord.user_id) {
          wsManager.logoutUser(timeRecord.user_id);
        }
      } catch (error) {
        console.error("Failed to send logout signal:", error);
      }

      res.json({
        success: true,
        time_record: updatedRecord,
        session_id: session.id,
      });
    } catch (error) {
      console.error("Error verifying facial recognition:", error);
      res.status(500).json({ error: "Failed to verify facial recognition" });
    }
  });

  // Discount approval routes
  app.post("/api/discount-approvals", authenticateToken, async (req, res) => {
    try {
      const { getWebSocketManager } = await import("./websocket");
      const wsManager = getWebSocketManager();
      
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const requestData = {
        ...req.body,
        admin_id: user.uid,
        admin_email: user.email,
        admin_name: user.email,
      };

      const approvalRequest = await storage.createDiscountApprovalRequest(requestData);

      if (wsManager) {
        wsManager.broadcastToVadmins({
          type: 'discount_approval_request',
          data: approvalRequest,
        });
      }

      res.status(201).json(approvalRequest);
    } catch (error) {
      console.error("Error creating discount approval request:", error);
      res.status(500).json({ error: "Failed to create discount approval request" });
    }
  });

  app.get("/api/discount-approvals/pending", authenticateToken, requireRole(['vadmin']), async (req, res) => {
    try {
      const pendingRequests = await storage.getPendingDiscountApprovalRequests();
      res.json(pendingRequests);
    } catch (error) {
      console.error("Error getting pending discount approval requests:", error);
      res.status(500).json({ error: "Failed to fetch pending discount approval requests" });
    }
  });

  app.get("/api/discount-approvals/:id", authenticateToken, async (req, res) => {
    try {
      const request = await storage.getDiscountApprovalRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Discount approval request not found" });
      }
      res.json(request);
    } catch (error) {
      console.error("Error getting discount approval request:", error);
      res.status(500).json({ error: "Failed to fetch discount approval request" });
    }
  });

  app.patch("/api/discount-approvals/:id/approve", authenticateToken, requireRole(['vadmin']), async (req, res) => {
    try {
      const { getWebSocketManager } = await import("./websocket");
      const wsManager = getWebSocketManager();
      
      const user = (req as any).user;
      const { max_discount_percentage_allowed } = req.body;

      if (!max_discount_percentage_allowed) {
        return res.status(400).json({ error: "max_discount_percentage_allowed is required" });
      }

      const originalRequest = await storage.getDiscountApprovalRequest(req.params.id);
      if (!originalRequest) {
        return res.status(404).json({ error: "Discount approval request not found" });
      }

      const approvedRequest = await storage.approveDiscountRequest(
        req.params.id,
        user.uid,
        user.email,
        max_discount_percentage_allowed
      );

      if (wsManager && originalRequest.admin_id) {
        wsManager.sendToAdmin(originalRequest.admin_id, {
          type: 'discount_approval_decision',
          data: approvedRequest,
        });
      }

      res.json(approvedRequest);
    } catch (error) {
      console.error("Error approving discount request:", error);
      res.status(500).json({ error: "Failed to approve discount request" });
    }
  });

  app.patch("/api/discount-approvals/:id/reject", authenticateToken, requireRole(['vadmin']), async (req, res) => {
    try {
      const { getWebSocketManager } = await import("./websocket");
      const wsManager = getWebSocketManager();
      
      const user = (req as any).user;
      const { reason } = req.body;

      const originalRequest = await storage.getDiscountApprovalRequest(req.params.id);
      if (!originalRequest) {
        return res.status(404).json({ error: "Discount approval request not found" });
      }

      const rejectedRequest = await storage.rejectDiscountRequest(
        req.params.id,
        user.uid,
        user.email,
        reason
      );

      if (wsManager && originalRequest.admin_id) {
        wsManager.sendToAdmin(originalRequest.admin_id, {
          type: 'discount_approval_decision',
          data: rejectedRequest,
        });
      }

      res.json(rejectedRequest);
    } catch (error) {
      console.error("Error rejecting discount request:", error);
      res.status(500).json({ error: "Failed to reject discount request" });
    }
  });

  // Barbara Command - Generate PDF endpoint
  app.post("/api/commands/generate-pdf", authenticateToken, async (req, res) => {
    try {
      const { destinationId, pdfType } = req.body;
      
      if (!destinationId || !pdfType) {
        return res.status(400).json({ error: "Destination ID and PDF type are required" });
      }
      
      if (!['embarque', 'motorista', 'hotel'].includes(pdfType)) {
        return res.status(400).json({ error: "Invalid PDF type" });
      }
      
      const destination = await storage.getDestination(destinationId);
      if (!destination) {
        return res.status(404).json({ error: "Destination not found" });
      }
      
      const bus = destination.bus_id ? await storage.getBus(destination.bus_id) : null;
      if (!bus && pdfType !== 'hotel') {
        return res.status(400).json({ error: "Bus configuration not found for this destination" });
      }
      
      const allPassengers = await storage.getAllPassengersByDestination(destination.name);
      
      // Convert null seat_numbers to undefined for type compatibility
      const passengers = (allPassengers || []).map((p: any) => ({
        ...p,
        seat_number: p.seat_number === null ? undefined : p.seat_number
      }));
      
      const { generateEmbarquePDF, generateMotoristaPDF, generateHotelPDF } = await import("./pdf-generator");
      
      let pdfBuffer: Buffer;
      let filename: string;
      const sanitizedDestination = destination.name.replace(/[^a-zA-Z0-9]/g, '_');
      const sanitizedBus = (bus?.name || 'SemOnibus').replace(/[^a-zA-Z0-9]/g, '_');
      const today = new Date().toISOString().split('T')[0];
      
      if (pdfType === 'embarque') {
        pdfBuffer = await generateEmbarquePDF(destination, bus || null, passengers);
        filename = `Embarque_${sanitizedDestination}_${sanitizedBus}_${today}.pdf`;
      } else if (pdfType === 'motorista') {
        pdfBuffer = await generateMotoristaPDF(destination, bus || null, passengers);
        filename = `Motorista_${sanitizedDestination}_${sanitizedBus}_${today}.pdf`;
      } else {
        pdfBuffer = await generateHotelPDF(destination, bus || null, passengers);
        filename = `Hotel_${sanitizedDestination}_${sanitizedBus}_${today}.pdf`;
      }
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  // AI Assistant Chat endpoint
  // Invitation link endpoints
  app.post("/api/invitations", authenticateToken, async (req, res) => {
    try {
      const { client_type, operator_name, destination, expires_in_days } = req.body;
      if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (expires_in_days || 30));
      
      const link = await storage.createInvitationLink({
        admin_id: req.user.uid,
        admin_email: req.user.email || '',
        client_type: client_type || 'agencia',
        operator_name,
        destination,
        expires_at: expiresAt,
      });
      
      res.json(link);
    } catch (error) {
      console.error('Error creating invitation link:', error);
      res.status(500).json({ error: 'Failed to create invitation link' });
    }
  });

  app.get("/api/invitations/:linkToken", async (req, res) => {
    try {
      const link = await storage.getInvitationLink(req.params.linkToken);
      if (!link) return res.status(404).json({ error: 'Link not found' });
      
      const now = new Date();
      if (link.expires_at < now) {
        return res.status(410).json({ error: 'Link expired' });
      }
      
      // Check if link has already been used (one-time use only)
      if (link.used_count > 0) {
        return res.status(410).json({ error: 'Link already used' });
      }
      
      res.json(link);
    } catch (error) {
      console.error('Error getting invitation link:', error);
      res.status(500).json({ error: 'Failed to get invitation link' });
    }
  });

  app.post("/api/invitations/:linkToken/submit", validateBody(publicInvitationSubmissionSchema), async (req, res) => {
    try {
      const link = await storage.getInvitationLink(req.params.linkToken);
      
      if (!link) {
        return res.status(404).json({ error: 'Link not found or invalid' });
      }
      
      const now = new Date();
      if (link.expires_at < now) {
        return res.status(410).json({ error: 'Link expired' });
      }
      
      // Check if link has already been used (one-time use only)
      if (link.used_count > 0) {
        return res.status(410).json({ error: 'Link already used' });
      }
      
      // Split full_name into first_name and last_name
      const fullName = req.body.full_name || '';
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || nameParts[0] || '';
      
      // Create a PROSPECT instead of a CLIENT (they're interested, not official yet)
      const prospectData = {
        first_name: firstName,
        last_name: lastName,
        phone: req.body.phone,
        email: req.body.email || '',
        cpf: '',
        notes: `Cadastro via link de convite - ${link.client_type === 'operadora' ? `Operadora: ${link.operator_name}` : 'Agência'}`,
        interested_destinations: link.destination ? [link.destination] : [],
        status: 'novo' as const,
      };
      
      const prospect = await storage.createProspect(prospectData);
      
      // Update invitation link usage - mark as used (one-time use)
      try {
        await storage.updateInvitationLinkUsage(req.params.linkToken);
      } catch (usageError) {
        console.error('Failed to update invitation link usage:', usageError);
        // Continue anyway since prospect was created
      }
      
      res.status(201).json(prospect);
    } catch (error) {
      console.error('Error submitting invitation:', error);
      res.status(500).json({ error: 'Failed to submit registration' });
    }
  });

  // CRM Task Routes
  app.get("/api/crm/tasks", authenticateToken, async (req: any, res: any) => {
    try {
      const storage = await import("./storage").then(m => m.storage);
      const tasks = await storage.getCrmTasks();
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.get("/api/crm/tasks/user/:userId", authenticateToken, async (req: any, res: any) => {
    try {
      const storage = await import("./storage").then(m => m.storage);
      const tasks = await storage.getCrmTasksByUserId(req.params.userId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching user tasks:", error);
      res.status(500).json({ error: "Failed to fetch user tasks" });
    }
  });

  app.post("/api/crm/tasks", authenticateToken, async (req: any, res: any) => {
    try {
      const storage = await import("./storage").then(m => m.storage);
      const user = await storage.getUser(req.user.uid);
      const userRole = user?.role;
      
      // Check if user is trying to assign to someone else
      if (req.body.assigned_to_user_id && req.body.assigned_to_user_id !== req.user.uid) {
        // Only VAdmins can assign tasks to others
        if (userRole !== 'vadmin') {
          return res.status(403).json({ error: "Only VAdmins can assign tasks to others" });
        }
      }
      
      const validatedData = insertCrmTaskSchema.parse({
        ...req.body,
        assigned_by_user_id: req.user.uid,
        assigned_by_email: req.user.email,
        assigned_by_name: user?.email?.split('@')[0] || req.user.email,
      });

      const task = await storage.createCrmTask(validatedData);
      res.json(task);
    } catch (error: any) {
      console.error("Error creating task:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: fromZodError(error).toString() });
      }
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.patch("/api/crm/tasks/:id", authenticateToken, async (req: any, res: any) => {
    try {
      const storage = await import("./storage").then(m => m.storage);
      const task = await storage.getCrmTask(req.params.id);
      
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Only assignee or creator can update
      const userEmail = req.user?.email;
      const canEdit = task.assigned_to_email === userEmail || task.created_by_email === userEmail;
      
      if (!canEdit) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      const updates: any = {};
      if (req.body.status) updates.status = req.body.status;
      if (req.body.title) updates.title = req.body.title;
      if (req.body.description) updates.description = req.body.description;
      if (req.body.priority) updates.priority = req.body.priority;
      if (req.body.due_date) updates.due_date = new Date(req.body.due_date);
      if (req.body.updates) updates.updates = req.body.updates;
      if (req.body.checklist !== undefined) updates.checklist = req.body.checklist;
      if (req.body.completion_percentage !== undefined) updates.completion_percentage = req.body.completion_percentage;
      
      // Check if task is being marked as completed
      const isBeingCompleted = req.body.status === "completed" && task.status !== "completed";
      
      if (isBeingCompleted) {
        updates.completed_at = new Date();
      } else if (req.body.status !== "completed" && task.status === "completed") {
        updates.completed_at = null;
      }

      const updated = await storage.updateCrmTask(req.params.id, updates);
      
      // Send notification to creator when task is completed - non-blocking
      if (isBeingCompleted) {
        try {
          await storage.createNotification({
            user_email: task.created_by_email,
            type: "task_completed",
            title: "Tarefa Concluída ✓",
            message: `${task.assigned_to_name} concluiu: "${task.title}"`,
            related_id: task.id,
          });
          console.log(`Notification created for ${task.created_by_email}`);
        } catch (notifError) {
          console.error('Failed to create notification:', notifError);
          // Don't fail the task update if notification fails
        }
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/crm/tasks/:id", authenticateToken, requireRole(["vadmin"]), async (req: any, res: any) => {
    try {
      const storage = await import("./storage").then(m => m.storage);
      const task = await storage.getCrmTask(req.params.id);
      
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Only creator can delete
      if (task.assigned_by_user_id !== req.user.uid) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      await storage.deleteCrmTask(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // Notification routes - Efficient: only fetch unread on first load
  app.get("/api/notifications", authenticateToken, async (req: any, res: any) => {
    try {
      const storage = await import("./storage").then(m => m.storage);
      const unreadOnly = req.query.unreadOnly === 'true';
      // Check for bill reminders every time notifications are fetched
      await storage.checkAndCreateBillReminders();
      const notifications = await storage.getNotifications(req.user.email, unreadOnly);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", authenticateToken, async (req: any, res: any) => {
    try {
      const storage = await import("./storage").then(m => m.storage);
      const notification = await storage.markNotificationAsRead(req.params.id);
      res.json(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to update notification" });
    }
  });

  // Bill routes (Contas a Pagar e a Receber)
  app.get("/api/bills", authenticateToken, async (req: any, res: any) => {
    try {
      const storage = await import("./storage").then(m => m.storage);
      const type = req.query.type as "pagar" | "receber" | undefined;
      const bills = await storage.getBills(type);
      res.json(bills);
    } catch (error) {
      console.error("Error fetching bills:", error);
      res.status(500).json({ error: "Failed to fetch bills" });
    }
  });

  app.post("/api/bills", authenticateToken, async (req: any, res: any) => {
    try {
      const storage = await import("./storage").then(m => m.storage);
      const user = await storage.getUser(req.user.uid);
      const validatedData = z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        type: z.enum(["pagar", "receber"]),
        amount: z.number().positive(),
        due_date: z.string().or(z.date()),
        category: z.string().optional(),
        payment_method: z.enum(["pix", "dinheiro", "credito", "debito", "boleto", "link"]).optional(),
      }).parse(req.body);

      const bill = await storage.createBill({
        ...validatedData,
        due_date: new Date(validatedData.due_date),
        created_by_email: req.user.email,
        created_by_name: user?.email?.split('@')[0] || req.user.email,
      });
      res.json(bill);
    } catch (error: any) {
      console.error("Error creating bill:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: fromZodError(error).toString() });
      }
      res.status(500).json({ error: "Failed to create bill" });
    }
  });

  app.patch("/api/bills/:id", authenticateToken, async (req: any, res: any) => {
    try {
      const storage = await import("./storage").then(m => m.storage);
      const bill = await storage.getBill(req.params.id);
      if (!bill) return res.status(404).json({ error: "Bill not found" });

      const updates: any = {};
      if (req.body.status) updates.status = req.body.status;
      if (req.body.title) updates.title = req.body.title;
      if (req.body.amount) updates.amount = req.body.amount;
      if (req.body.due_date) updates.due_date = new Date(req.body.due_date);
      if (req.body.category) updates.category = req.body.category;
      if (req.body.payment_method) updates.payment_method = req.body.payment_method;
      
      if (req.body.status === "paid") {
        updates.paid_at = new Date();
      } else if (req.body.status !== "paid") {
        updates.paid_at = null;
      }

      const updated = await storage.updateBill(req.params.id, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating bill:", error);
      res.status(500).json({ error: "Failed to update bill" });
    }
  });

  app.delete("/api/bills/:id", authenticateToken, async (req: any, res: any) => {
    try {
      const storage = await import("./storage").then(m => m.storage);
      const bill = await storage.getBill(req.params.id);
      if (!bill) return res.status(404).json({ error: "Bill not found" });

      await storage.deleteBill(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting bill:", error);
      res.status(500).json({ error: "Failed to delete bill" });
    }
  });

  // Funcionários routes
  app.get("/api/funcionarios", authenticateToken, async (req: any, res: any) => {
    try {
      const storage = await import("./storage").then(m => m.storage);
      const funcionarios = await storage.getFuncionarios();
      res.json(funcionarios);
    } catch (error) {
      console.error("Error fetching funcionários:", error);
      res.status(500).json({ error: "Failed to fetch funcionários" });
    }
  });

  app.get("/api/funcionarios/active", authenticateToken, async (req: any, res: any) => {
    try {
      const storage = await import("./storage").then(m => m.storage);
      const funcionarios = await storage.getActiveFuncionarios();
      res.json(funcionarios);
    } catch (error) {
      console.error("Error fetching active funcionários:", error);
      res.status(500).json({ error: "Failed to fetch active funcionários" });
    }
  });

  app.get("/api/funcionarios/trial", authenticateToken, async (req: any, res: any) => {
    try {
      const storage = await import("./storage").then(m => m.storage);
      const funcionarios = await storage.getTrialFuncionarios();
      res.json(funcionarios);
    } catch (error) {
      console.error("Error fetching trial funcionários:", error);
      res.status(500).json({ error: "Failed to fetch trial funcionários" });
    }
  });

  app.get("/api/funcionarios/:id", authenticateToken, async (req: any, res: any) => {
    try {
      const storage = await import("./storage").then(m => m.storage);
      const funcionario = await storage.getFuncionario(req.params.id);
      if (!funcionario) {
        return res.status(404).json({ error: "Funcionário not found" });
      }
      res.json(funcionario);
    } catch (error) {
      console.error("Error fetching funcionário:", error);
      res.status(500).json({ error: "Failed to fetch funcionário" });
    }
  });

  app.post("/api/funcionarios", authenticateToken, async (req: any, res: any) => {
    try {
      const storage = await import("./storage").then(m => m.storage);
      const validatedData = insertFuncionarioSchema.parse(req.body);
      const funcionario = await storage.createFuncionario(validatedData);
      res.json(funcionario);
    } catch (error: any) {
      console.error("Error creating funcionário:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: fromZodError(error).toString() });
      }
      res.status(500).json({ error: "Failed to create funcionário" });
    }
  });

  app.patch("/api/funcionarios/:id", authenticateToken, async (req: any, res: any) => {
    try {
      const storage = await import("./storage").then(m => m.storage);
      const funcionario = await storage.getFuncionario(req.params.id);
      
      if (!funcionario) {
        return res.status(404).json({ error: "Funcionário not found" });
      }

      // Validate with insertFuncionarioSchema allowing partial updates
      const partialSchema = insertFuncionarioSchema.partial();
      const validatedData = partialSchema.parse(req.body);

      const updated = await storage.updateFuncionario(req.params.id, validatedData);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating funcionário:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: fromZodError(error).toString() });
      }
      res.status(500).json({ error: "Failed to update funcionário" });
    }
  });

  app.post("/api/funcionarios/trial", authenticateToken, async (req: any, res: any) => {
    try {
      const storage = await import("./storage").then(m => m.storage);
      const schema = insertFuncionarioSchema.extend({
        trial_period_days: z.number().positive("Período de experiência deve ser maior que 0"),
      });
      const validatedData = schema.parse(req.body);
      const funcionario = await storage.createTrialFuncionario(validatedData);
      res.json(funcionario);
    } catch (error: any) {
      console.error("Error creating trial funcionário:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: fromZodError(error).toString() });
      }
      res.status(500).json({ error: "Failed to create trial funcionário" });
    }
  });

  app.post("/api/funcionarios/:id/activate-trial", authenticateToken, async (req: any, res: any) => {
    try {
      const storage = await import("./storage").then(m => m.storage);
      const funcionario = await storage.getFuncionario(req.params.id);
      
      if (!funcionario) {
        return res.status(404).json({ error: "Funcionário not found" });
      }

      if (funcionario.trial_status !== 'active' && funcionario.trial_status !== 'pending') {
        return res.status(400).json({ error: "Funcionário is not on trial period" });
      }

      const activated = await storage.activateTrialFuncionario(req.params.id);
      res.json(activated);
    } catch (error: any) {
      console.error("Error activating trial funcionário:", error);
      res.status(500).json({ error: "Failed to activate trial funcionário" });
    }
  });

  app.post("/api/funcionarios/:id/terminate", authenticateToken, async (req: any, res: any) => {
    try {
      const storage = await import("./storage").then(m => m.storage);
      const funcionario = await storage.getFuncionario(req.params.id);
      
      if (!funcionario) {
        return res.status(404).json({ error: "Funcionário not found" });
      }

      // Validate termination reason
      const terminationSchema = z.object({
        termination_reason: z.string().min(1, "Motivo da demissão é obrigatório"),
      });

      const validatedData = terminationSchema.parse(req.body);
      const terminated = await storage.terminateFuncionario(req.params.id, validatedData.termination_reason);
      res.json(terminated);
    } catch (error: any) {
      console.error("Error terminating funcionário:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: fromZodError(error).toString() });
      }
      res.status(500).json({ error: "Failed to terminate funcionário" });
    }
  });

  app.get("/api/funcionarios/:id/termination-pdf", authenticateToken, async (req: any, res: any) => {
    try {
      const storage = await import("./storage").then(m => m.storage);
      const funcionario: Funcionario | undefined = await storage.getFuncionario(req.params.id);
      
      if (!funcionario) {
        return res.status(404).json({ error: "Funcionário not found" });
      }

      if (funcionario.is_active) {
        return res.status(400).json({ error: "Can only generate PDF for terminated employees" });
      }

      const pdfBuffer = await generateTerminationPDF(funcionario);
      res.contentType('application/pdf');
      res.header('Content-Disposition', `attachment; filename="termo-demissao-${funcionario.first_name}-${funcionario.last_name}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating termination PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  app.post("/api/funcionarios/:id/photo", authenticateToken, async (req: any, res: any) => {
    try {
      const storage = await import("./storage").then(m => m.storage);
      const funcionario = await storage.getFuncionario(req.params.id);
      
      if (!funcionario) {
        return res.status(404).json({ error: "Funcionário not found" });
      }

      const { photo_url } = req.body;
      if (!photo_url || typeof photo_url !== 'string') {
        return res.status(400).json({ error: "photo_url is required" });
      }

      const updated = await storage.updateFuncionario(req.params.id, { photo_url });
      res.json(updated);
    } catch (error) {
      console.error("Error updating photo:", error);
      res.status(500).json({ error: "Failed to update photo" });
    }
  });

  app.post("/api/proposals/generate-pdf", authenticateToken, async (req: any, res: any) => {
    try {
      const storage = await import("./storage").then(m => m.storage);
      const validatedData = insertProposalSchema.parse(req.body);
      
      const proposal: Proposal = {
        id: `prop_${Date.now()}`,
        ...validatedData,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Store proposal ONLY in RH database (cidade-dofuturo)
      await storage.createProposal(proposal);

      const pdfBuffer = await generateProposalPDF(proposal);
      res.contentType('application/pdf');
      res.header('Content-Disposition', `attachment; filename="proposta-${proposal.client_first_name}-${proposal.client_last_name}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("Error generating proposal PDF:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: fromZodError(error).toString() });
      }
      res.status(500).json({ error: "Failed to generate proposal PDF" });
    }
  });

  // Get all proposals from RH database
  app.get("/api/proposals", authenticateToken, async (req: any, res: any) => {
    try {
      const storage = await import("./storage").then(m => m.storage);
      const proposals = await storage.getProposals();
      res.json(proposals);
    } catch (error) {
      console.error("Error fetching proposals:", error);
      res.status(500).json({ error: "Failed to fetch proposals" });
    }
  });

  // Approve proposal and create funcionário
  app.post("/api/proposals/:id/approve", authenticateToken, async (req: any, res: any) => {
    try {
      const storage = await import("./storage").then(m => m.storage);
      const proposal = await storage.getProposal(req.params.id);
      
      if (!proposal) {
        return res.status(404).json({ error: "Proposal not found" });
      }

      const { photo_url } = req.body;

      // Create funcionário from proposal
      const funcionarioData = {
        first_name: proposal.client_first_name,
        last_name: proposal.client_last_name,
        email: proposal.client_email || undefined,
        phone: proposal.client_phone || undefined,
        cpf: proposal.client_cpf || "000.000.000-00",
        position: proposal.job_description.substring(0, 100),
        department: proposal.work_location || "Geral",
        salary: proposal.proposed_salary || 0,
        hire_date: new Date(),
        photo_url: photo_url || undefined,
      };

      const funcionario = await storage.createFuncionario(funcionarioData);

      // Delete proposal from RH database
      await storage.deleteProposal(req.params.id);

      res.json({ success: true, funcionario });
    } catch (error: any) {
      console.error("Error approving proposal:", error);
      res.status(500).json({ error: "Failed to approve proposal" });
    }
  });

  // Delete proposal
  app.delete("/api/proposals/:id", authenticateToken, async (req: any, res: any) => {
    try {
      const storage = await import("./storage").then(m => m.storage);
      await storage.deleteProposal(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting proposal:", error);
      res.status(500).json({ error: "Failed to delete proposal" });
    }
  });

  app.delete("/api/funcionarios/:id", authenticateToken, requireRole(["vadmin"]), async (req: any, res: any) => {
    try {
      const storage = await import("./storage").then(m => m.storage);
      const funcionario = await storage.getFuncionario(req.params.id);
      
      if (!funcionario) {
        return res.status(404).json({ error: "Funcionário not found" });
      }

      await storage.deleteFuncionario(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting funcionário:", error);
      res.status(500).json({ error: "Failed to delete funcionário" });
    }
  });

  app.post("/api/chat", validateBody(chatRequestSchema), async (req, res) => {
    try {
      const { message, history = [] } = req.body;
      const Groq = (await import("groq-sdk")).default;
      const { SYSTEM_KNOWLEDGE, ASSISTANT_PROMPT } = await import("./assistant-knowledge");
      const { parseCommand } = await import("./command-executor");
      
      const groq = new Groq({
        apiKey: process.env.GROQ_API_KEY
      });

      // Check if this is a command (starts with /)
      if (message.trim().startsWith('/')) {
        const commandResult = await parseCommand(message.trim(), groq);
        
        return res.json({
          role: "assistant",
          content: commandResult.message,
          timestamp: new Date(),
          isCommand: true,
          actions: commandResult.actions || [],
          requiresUserAction: commandResult.requiresUserAction || false
        });
      }

      // Build messages array for Groq
      const messages: any[] = [
        {
          role: "system",
          content: ASSISTANT_PROMPT + "\n\n" + SYSTEM_KNOWLEDGE
        }
      ];

      // Add conversation history
      if (history.length > 0) {
        history.forEach((msg: any) => {
          messages.push({
            role: msg.role,
            content: msg.content
          });
        });
      }

      // Add current user message
      messages.push({
        role: "user",
        content: message
      });

      // Call Groq API
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: messages,
        temperature: 0.7,
        max_tokens: 1024,
        top_p: 1,
        stream: false
      });

      const assistantReply = completion.choices[0]?.message?.content || "Desculpe, não consegui processar sua mensagem. Pode tentar novamente?";

      res.json({
        role: "assistant",
        content: assistantReply,
        timestamp: new Date()
      });
    } catch (error) {
      console.error("Error in chat endpoint:", error);
      res.status(500).json({ 
        error: "Erro ao processar sua mensagem. Por favor, tente novamente.",
        role: "assistant",
        content: "Desculpe, estou com dificuldades técnicas no momento. Por favor, tente novamente em alguns instantes. 🙏",
        timestamp: new Date()
      });
    }
  });

  // Admin endpoint: Populate missing creators for existing clients
  app.post("/api/admin/populate-client-creators", authenticateToken, requireRole(['vadmin']), async (req, res) => {
    try {
      const creators = [
        { email: 'ala@rodabemturismo.com', name: 'ala', weight: 50 },
        { email: 'comercial.1@rodabemturismo.com', name: 'comercial.1', weight: 25 },
        { email: 'comercial.2@rodabemturismo.com', name: 'comercial.2', weight: 15 },
        { email: 'daniel@rodabemturismo.com', name: 'daniel', weight: 10 }
      ];

      // Build weighted random selector
      const totalWeight = creators.reduce((sum, c) => sum + c.weight, 0);
      const getRandomCreator = () => {
        let random = Math.random() * totalWeight;
        for (const creator of creators) {
          random -= creator.weight;
          if (random <= 0) return creator;
        }
        return creators[0];
      };

      // Get all clients
      const allClients = await storage.getClients();
      let updated = 0;
      let skipped = 0;

      // Update clients without creators
      for (const client of allClients) {
        if (!client.created_by_email || client.created_by_email === 'Sistema') {
          const randomCreator = getRandomCreator();
          // Use spread with only the fields that need updating (updateClientSchema allows creator fields)
          await storage.updateClient(client.id, {
            first_name: client.first_name,
            last_name: client.last_name,
            created_by_email: randomCreator.email,
            created_by_name: randomCreator.name
          } as any);
          updated++;
        } else {
          skipped++;
        }
      }

      res.json({
        success: true,
        message: `Updated ${updated} clients, skipped ${skipped} that already had creators`,
        updated,
        skipped
      });
    } catch (error) {
      console.error("Error populating client creators:", error);
      res.status(500).json({ error: "Failed to populate client creators" });
    }
  });

  // Admin endpoint: Recalculate ALL parcelas for clients with crediario_agencia payment method
  app.post("/api/admin/recalculate-all-parcelas", authenticateToken, requireRole(['vadmin']), async (req, res) => {
    try {
      const allClients = await storage.getClients();
      const crediarioClients = allClients.filter((c: any) => 
        c.payment_method === 'crediario_agencia' && c.installments_count > 0
      );

      let updated = 0;
      let skipped = 0;
      const now = new Date();
      // First day of next month
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      for (const client of crediarioClients) {
        try {
          // Delete existing parcelas for this client
          await storage.deleteParcelasByClientId(client.id);

          // Get children/companions to calculate total travel amount
          const children = await storage.getChildrenByClientId(client.id);
          const childrenTotal = children.reduce((sum: number, child: any) => sum + (child.price || 0), 0);

          // Total travel price includes client price + all companions' prices
          const clientPrice = client.travel_price || 0;
          const totalTravelPrice = clientPrice + childrenTotal;
          const downPayment = client.down_payment || 0;
          const remainingAmount = totalTravelPrice - downPayment;
          const installmentsCount = client.installments_count || 1;
          const installmentAmount = remainingAmount / installmentsCount;

          // Calculate the first due date: use provided date if valid and in future, otherwise use next month
          let firstDueDate: Date;
          
          if (client.first_installment_due_date) {
            const providedDate = new Date(client.first_installment_due_date);
            // If provided date is in the past, use next month from now
            if (providedDate < now) {
              firstDueDate = new Date(nextMonth);
            } else {
              firstDueDate = providedDate;
            }
          } else {
            // Default to first day of next month
            firstDueDate = new Date(nextMonth);
          }

          for (let i = 0; i < installmentsCount; i++) {
            const dueDate = new Date(firstDueDate);
            dueDate.setMonth(dueDate.getMonth() + i);

            await storage.createParcela({
              client_id: client.id,
              client_name: `${client.first_name} ${client.last_name}`,
              client_phone: client.phone,
              amount: installmentAmount,
              due_date: dueDate,
              installment_number: i + 1,
              total_installments: installmentsCount,
              is_paid: false,
              status: "pending",
              paid_amount: 0,
            });
          }
          updated++;
        } catch (clientError) {
          console.error(`Failed to recalculate parcelas for client ${client.id}:`, clientError);
          skipped++;
        }
      }

      console.log(`Recalculated parcelas: ${updated} clients updated, ${skipped} skipped`);
      res.json({
        success: true,
        message: `Recalculated parcelas for ${updated} clients, ${skipped} had errors`,
        updated,
        skipped,
        totalClients: crediarioClients.length
      });
    } catch (error) {
      console.error("Error recalculating parcelas:", error);
      res.status(500).json({ error: "Failed to recalculate parcelas" });
    }
  });

  // Admin endpoint: Fix missing companion records from seat reservations
  // This finds companions that appear in seat reservations but don't have child records linked to parent client
  app.post("/api/admin/fix-missing-companions", authenticateToken, requireRole(['vadmin']), async (req, res) => {
    try {
      console.log('[Fix Companions] Starting to find and link missing companions...');
      
      const allClients = await storage.getClients();
      const allSeatReservations = await storage.getSeatReservations();
      
      // Create a map of client IDs to clients for quick lookup
      const clientMap = new Map<string, any>();
      allClients.forEach((client: any) => {
        clientMap.set(client.id, client);
      });
      
      // Normalize name for comparison
      const normalizeName = (name: string) => {
        if (!name) return '';
        return name.toLowerCase().trim().replace(/\s+/g, ' ');
      };
      
      let companionsCreated = 0;
      let reservationsUpdated = 0;
      let alreadyLinked = 0;
      const errors: string[] = [];
      const created: { clientName: string; companionName: string }[] = [];
      
      // Group seat reservations by client_id
      const reservationsByClient = new Map<string, any[]>();
      allSeatReservations.forEach((reservation: any) => {
        if (!reservation.client_id) return;
        const existing = reservationsByClient.get(reservation.client_id) || [];
        existing.push(reservation);
        reservationsByClient.set(reservation.client_id, existing);
      });
      
      // Process each client's reservations
      for (const [clientId, reservations] of Array.from(reservationsByClient.entries())) {
        const client = clientMap.get(clientId);
        if (!client) continue;
        
        const clientFullName = normalizeName(`${client.first_name} ${client.last_name}`);
        
        // Get existing children for this client
        const existingChildren = await storage.getChildrenByClientId(clientId);
        const existingChildNames = new Set(existingChildren.map((c: any) => normalizeName(c.name)));
        
        for (const reservation of reservations) {
          const reservationName = normalizeName(reservation.client_name || '');
          
          // Skip if this is the main client's own reservation
          if (reservationName === clientFullName) continue;
          
          // Skip if this reservation already has a child_id linked
          if (reservation.child_id) {
            alreadyLinked++;
            continue;
          }
          
          // Skip if no name on reservation
          if (!reservationName) continue;
          
          // Check if a child with this name already exists for this client
          if (existingChildNames.has(reservationName)) {
            // Find the existing child and update the reservation
            const existingChild = existingChildren.find((c: any) => normalizeName(c.name) === reservationName);
            if (existingChild) {
              try {
                // Update reservation: set client_id to parent, add child_id reference
                await storage.updateSeatReservation(reservation.id, {
                  client_id: clientId, // Point to parent client
                  child_id: existingChild.id,
                  is_child: true
                });
                reservationsUpdated++;
              } catch (err) {
                errors.push(`Failed to update reservation ${reservation.id}: ${err}`);
              }
            }
            continue;
          }
          
          // Create a new child record for this companion
          try {
            const childName = reservation.client_name || 'Acompanhante';
            
            const newChild = await storage.createChild({
              client_id: clientId,
              name: childName,
              birthdate: new Date('1970-01-01'), // Default birthdate since we don't have it
              relationship: 'outro' as const, // Default relationship
              price: 0, // Price is usually already on the main client's total
            });
            
            companionsCreated++;
            existingChildNames.add(normalizeName(childName));
            // Add new child to existingChildren to prevent duplicates in this batch
            existingChildren.push(newChild);
            created.push({
              clientName: `${client.first_name} ${client.last_name}`,
              companionName: childName
            });
            
            // Update the seat reservation: set client_id to parent, add child_id reference
            await storage.updateSeatReservation(reservation.id, {
              client_id: clientId, // Point to parent client
              child_id: newChild.id,
              is_child: true
            });
            reservationsUpdated++;
            
            console.log(`[Fix Companions] Created companion "${childName}" for client "${client.first_name} ${client.last_name}"`);
          } catch (err) {
            errors.push(`Failed to create companion for reservation ${reservation.id}: ${err}`);
          }
        }
      }
      
      console.log(`[Fix Companions] Complete: ${companionsCreated} companions created, ${reservationsUpdated} reservations updated, ${alreadyLinked} already linked`);
      
      res.json({
        success: true,
        message: `Fixed missing companions: ${companionsCreated} created, ${reservationsUpdated} reservations updated`,
        companionsCreated,
        reservationsUpdated,
        alreadyLinked,
        created,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error("Error fixing missing companions:", error);
      res.status(500).json({ error: "Failed to fix missing companions" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}


