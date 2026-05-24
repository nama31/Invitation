import type { GuestStatus } from "./types";

export interface AdminStats {
  total: number;
  confirmed: number;
  declined: number;
  pending: number;
  tables_count: number;
}

export interface TableReadBasic {
  id: number;
  table_name: string;
  max_seats: number;
}

export interface GuestAdminRead {
  id: number;
  first_name: string;
  last_name: string;
  status: GuestStatus;
  table_id: number | null;
  table: TableReadBasic | null;
}

export interface GuestAdminCreate {
  first_name: string;
  last_name: string;
}

export interface GuestAdminUpdate {
  first_name: string;
  last_name: string;
  status: GuestStatus;
}

export interface TableCreate {
  table_name: string;
  max_seats: number;
}

export interface TableAdminRead extends TableReadBasic {
  guest_count: number;
  guests: GuestAdminRead[];
}
