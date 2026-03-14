import type { 
  Client, 
  Child, 
  MonthlyReport, 
  InsertClient, 
  InsertChild, 
  Prospect,
  InsertProspect,
  UpdateProspect,
  InactiveClient,
  InsertInactiveClient,
  UpdateInactiveClient
} from '@shared/schema';

export type { 
  Client, 
  Child, 
  MonthlyReport, 
  InsertClient, 
  InsertChild, 
  Prospect,
  InsertProspect,
  UpdateProspect,
  InactiveClient,
  InsertInactiveClient,
  UpdateInactiveClient
};

export interface ClientWithChildren extends Client {
  children: Child[];
}

export interface DashboardStats {
  totalClients: number;
  activeDestinations: number;
  monthlyRevenue: number;
  conversionRate?: number;
  satisfactionRate?: number;
  retentionRate?: number;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string;
    fill?: boolean;
  }[];
}

export interface FilterOptions {
  search?: string;
  destination?: string;
  status?: string;
  client_type?: 'agencia' | 'operadora' | 'all';
  sortBy?: 'name' | 'travel_date' | 'created_at';
  page?: number;
  limit?: number;
  showIncomplete?: boolean;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}
