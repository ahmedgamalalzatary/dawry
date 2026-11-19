import type { EtaMode, OrderStatus } from "./schemas";

// Response shapes of the API (dates are ISO strings).

export interface ApiError {
  error: { code: string; message: string; issues?: unknown };
}

export type AccountKind = "admin" | "owner" | "staff" | "customer";

export interface Me {
  id: string;
  name: string;
  username: string;
  kind: AccountKind;
  restaurant: { id: string; name: string; slug: string; active: boolean } | null;
}

export interface PublicRestaurant {
  slug: string;
  name: string;
  logoUrl: string | null;
  phone: string | null;
}

export interface OrderItem {
  name: string;
  quantity: number;
}

export interface PublicOrder {
  restaurant: PublicRestaurant;
  invoiceNumber: string;
  businessDay: string;
  status: OrderStatus;
  etaMode: EtaMode;
  etaAt: string;
  late: boolean;
  ordersAhead: number;
  items: OrderItem[];
  fields: { label: string; value: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface StaffOrder {
  id: string;
  invoiceNumber: string;
  businessDay: string;
  status: OrderStatus;
  etaMode: EtaMode;
  etaAt: string;
  late: boolean;
  ordersAhead: number;
  items: (OrderItem & { menuItemId: string | null })[];
  customerName: string;
  customerPhone: string;
  address: string;
  notes: string;
  fields: { fieldId: string; label: string; value: string; public: boolean }[];
  createdAt: string;
  outAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
}

export interface MenuItem {
  id: string;
  name: string;
  active: boolean;
}

export interface CustomField {
  id: string;
  label: string;
  required: boolean;
  public: boolean;
  active: boolean;
}

export interface StaffMember {
  id: string;
  name: string;
  username: string;
  createdAt: string;
}

export interface RestaurantSettings {
  name: string;
  slug: string;
  phone: string;
  logoUrl: string;
}

export interface RestaurantReport {
  days: {
    day: string;
    orders: number;
    delivered: number;
    cancelled: number;
    /** Average minutes from entry to out-for-delivery. */
    avgPrepMinutes: number | null;
    /** Average minutes late (negative = early) when going out. */
    avgDelayMinutes: number | null;
  }[];
}

export interface AdminRestaurant {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  owner: { id: string; name: string; phone: string } | null;
  staffCount: number;
  ordersToday: number;
  createdAt: string;
}

export interface PlatformStats {
  restaurants: number;
  activeRestaurants: number;
  ordersToday: number;
  ordersLast30Days: number;
  customers: number;
}

export interface SavedOrder {
  slug: string;
  invoiceNumber: string;
  businessDay: string;
  restaurantName: string;
  status: OrderStatus;
  etaAt: string;
  late: boolean;
  savedAt: string;
}
