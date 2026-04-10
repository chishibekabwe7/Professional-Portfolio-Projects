export type UserRole = 'admin' | 'super_admin' | 'client' | string;

export interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
  full_name?: string | null;
  phone?: string | null;
  company?: string | null;
  created_at?: string;
  [key: string]: unknown;
}

export interface Vehicle {
  id: number;
  category: string;
  vehicle_name: string;
  plate_number: string;
  tracking_enabled: boolean | number;
  [key: string]: unknown;
}

export interface Booking {
  id: number;
  booking_ref?: string;
  vehicle_id?: number;
  status: string;
  hub?: string;
  total_amount?: number | string;
  dispatcher_name?: string;
  eta?: string;
  status_notes?: string;
  [key: string]: unknown;
}

export interface AdminStats {
  total_users?: number | string;
  total_bookings?: number | string;
  active_bookings?: number | string;
  total_revenue?: number | string;
  pending_revenue?: number | string;
  [key: string]: unknown;
}

export interface Transaction {
  id: number;
  booking_id: number;
  booking_ref?: string;
  status: string;
  amount?: number | string;
  [key: string]: unknown;
}

export interface NotificationEvent {
  id: number;
  status: string;
  channel?: string;
  event_type?: string;
  provider?: string;
  error_text?: string;
  [key: string]: unknown;
}
