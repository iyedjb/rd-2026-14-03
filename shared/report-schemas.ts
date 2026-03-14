import { z } from "zod";

// Enhanced Monthly Report Schema with destination breakdown
export const enhancedMonthlyReportSchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number(),
  destinations: z.array(z.object({
    name: z.string(),
    clients_count: z.number(),
    departures_count: z.number(),
    revenue: z.number(),
  })),
  total_new_clients: z.number(),
  total_departures: z.number(),
  total_revenue: z.number(),
});

// Trip Destination Report - payments and receipts
export const tripDestinationReportSchema = z.object({
  destination_id: z.string(),
  destination_name: z.string(),
  period_start: z.date(),
  period_end: z.date(),
  payments: z.array(z.object({
    client_name: z.string(),
    amount: z.number(),
    payment_method: z.string(),
    reference: z.string(),
    date: z.date(),
  })),
  receipts: z.array(z.object({
    client_name: z.string(),
    amount: z.number(),
    payment_method: z.string(),
    reference: z.string(),
    date: z.date(),
  })),
  total_paid: z.number(),
  total_received: z.number(),
  balance: z.number(),
});

// Accounts Payable/Receivable schema
export const accountSchema = z.object({
  id: z.string(),
  type: z.enum(["payable", "receivable"]),
  description: z.string(),
  amount: z.number(),
  due_date: z.date(),
  payment_date: z.date().optional(),
  reference: z.string().optional(),
  status: z.enum(["pending", "paid", "overdue"]),
  forecast_date: z.date().optional(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const insertAccountSchema = accountSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type EnhancedMonthlyReport = z.infer<typeof enhancedMonthlyReportSchema>;
export type TripDestinationReport = z.infer<typeof tripDestinationReportSchema>;
export type Account = z.infer<typeof accountSchema>;
export type InsertAccount = z.infer<typeof insertAccountSchema>;
