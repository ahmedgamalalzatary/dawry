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
  /** Who entered it (only on the single-order endpoint). */
  createdBy?: { id: string; name: string } | null;
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

/** Report windows the API accepts (days back from today, inclusive). */
export const REPORT_RANGES = [7, 30, 90] as const;
export type ReportRange = (typeof REPORT_RANGES)[number];

export interface ReportTotals {
  orders: number;
  delivered: number;
  cancelled: number;
  /** Still preparing or out. */
  open: number;
  /** Went out after their ETA, or are still preparing past it. */
  late: number;
  /** Share of orders that went out by their ETA (0..1), of those that went out. */
  onTimeRate: number | null;
  /** Average minutes from entry to out-for-delivery. */
  avgPrepMinutes: number | null;
  /** Average minutes late (negative = early) when going out. */
  avgDelayMinutes: number | null;
  /** Average minutes from out-for-delivery to delivered. */
  avgDeliveryMinutes: number | null;
}

export interface ReportDay extends ReportTotals {
  day: string;
}

export interface ReportPerson {
  id: string;
  name: string;
  orders: number;
  delivered: number;
  cancelled: number;
  onTimeRate: number | null;
  avgPrepMinutes: number | null;
}

export interface ReportItem {
  name: string;
  quantity: number;
  /** Orders that contained the item. */
  orders: number;
}

export interface RestaurantReport {
  range: { from: string; to: string; days: number };
  totals: ReportTotals;
  /** Newest day first; days without orders are left out. */
  days: ReportDay[];
  /** Orders by hour of entry (0..23, restaurant time zone). */
  hours: { hour: number; orders: number }[];
  /** Orders by weekday of the business day (0 = Sunday). */
  weekdays: { weekday: number; orders: number }[];
  /** Most ordered first. */
  items: ReportItem[];
  /** Who entered the orders, busiest first. */
  people: ReportPerson[];
  etaModes: { mode: EtaMode; orders: number }[];
  /** Entry → out, in minute buckets: [0,10), [10,20), [20,30), [30,45), [45,60), 60+. */
  prepBuckets: { from: number; to: number | null; orders: number }[];
}

export interface PlatformRestaurantRow {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  orders: number;
  delivered: number;
  cancelled: number;
  onTimeRate: number | null;
  avgPrepMinutes: number | null;
}

export interface PlatformReport {
  range: { from: string; to: string; days: number };
  totals: ReportTotals & { newCustomers: number; newRestaurants: number; activeRestaurants: number };
  days: ReportDay[];
  hours: { hour: number; orders: number }[];
  weekdays: { weekday: number; orders: number }[];
  restaurants: PlatformRestaurantRow[];
  items: ReportItem[];
  etaModes: { mode: EtaMode; orders: number }[];
}

/** The longest period one report may cover. */
export const REPORT_MAX_DAYS = 366;

/** One order as the reports page receives it; every tab is computed from these. */
export interface ReportOrderRow {
  id: string;
  restaurantId: string;
  invoiceNumber: string;
  businessDay: string;
  /** Hour of entry (0..23) in the restaurant's time zone. */
  hour: number;
  status: OrderStatus;
  etaMode: EtaMode;
  customerName: string;
  createdById: string | null;
  createdAt: string;
  etaAt: string;
  outAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
}

export interface ReportItemLine {
  orderId: string;
  name: string;
  quantity: number;
}

/** Raw rows for one period (from..to, business days, inclusive). */
export interface ReportData {
  from: string;
  to: string;
  /** Server time when the rows were read (lateness of open orders is judged at it). */
  now: string;
  restaurants: { id: string; name: string; slug: string; active: boolean }[];
  people: { id: string; name: string; restaurantId: string }[];
  orders: ReportOrderRow[];
  items: ReportItemLine[];
  /** Platform reports only. */
  growth?: { newCustomers: number; newRestaurants: number };
}

/** A short order line for histories (staff page, restaurant page). */
export interface OrderSummary {
  id: string;
  invoiceNumber: string;
  businessDay: string;
  status: OrderStatus;
  etaAt: string;
  late: boolean;
  createdAt: string;
  outAt: string | null;
  itemCount: number;
  customerName: string;
}

export interface StaffMemberDetail {
  member: StaffMember & { role: "owner" | "member" };
  stats: Omit<ReportPerson, "id" | "name">;
  recent: OrderSummary[];
}

export interface MenuItemDetail {
  item: MenuItem;
  quantity: number;
  orders: number;
  lastOrderedAt: string | null;
  days: { day: string; quantity: number }[];
}

export interface AdminRestaurantDetail {
  restaurant: AdminRestaurant & { phone: string; logoUrl: string };
  staff: StaffMember[];
  report: RestaurantReport;
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
