// Fills a database that has no restaurants yet with realistic demo data.
//   pnpm --filter @dawry/api db:seed
// Every demo account uses SEED_PASSWORD, or DEV_PASSWORD below when unset.
// The super-admin "admin" is only created when the database has no users at all.
// On a live server (NODE_ENV=production) SEED_PASSWORD is required, because
// DEV_PASSWORD is public in this repo:
//   docker compose run --rm -e SEED_PASSWORD=... api node dist/cli/seed-dev.js
import { businessDay, type CreateOrderInput, type OrderStatus } from "@dawry/shared";
import { count, eq } from "drizzle-orm";
import { createAuth } from "../auth";
import { createDb } from "../db/client";
import { member, organization, user } from "../db/schema";
import { loadEnv } from "../env";
import * as admin from "../modules/admin/service";
import * as catalog from "../modules/catalog/service";
import * as customerRepo from "../modules/customer/repo";
import * as orders from "../modules/orders/service";
import * as publicRepo from "../modules/public/repo";
import * as settings from "../modules/settings/service";
import * as staff from "../modules/staff/service";
import { createAccount } from "../modules/accounts/service";

const DEV_PASSWORD = "dawry-dev-123";
const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "";

if (process.env.NODE_ENV === "production" && SEED_PASSWORD.length < 12) {
  console.error("On a live server set SEED_PASSWORD (12+ characters); the dev password is public.");
  process.exit(1);
}
const PASSWORD = SEED_PASSWORD || DEV_PASSWORD;

const env = loadEnv();
const { db, pool } = createDb(env.DATABASE_URL);
const auth = createAuth(db, {
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.WEB_ORIGIN],
  production: false,
  rateLimit: false,
});
const timeZone = env.APP_TIME_ZONE;
const MINUTE = 60_000;
const realNow = Date.now();
const clockAt = (minutesFromNow: number) => ({
  now: () => new Date(realNow + minutesFromNow * MINUTE),
  timeZone,
});

interface DemoOrder {
  invoice: string;
  /** Minutes ago it was entered. */
  enteredAgo: number;
  eta: CreateOrderInput["eta"];
  items: [string, number][];
  status?: OrderStatus;
  customerName?: string;
  table?: string;
  payment?: string;
}

async function seedRestaurant(input: {
  name: string;
  slug: string;
  ownerName: string;
  ownerPhone: string;
  phone: string;
  staff: [string, string][];
  menu: string[];
  orders: DemoOrder[];
  pastDays?: number;
}) {
  const r = await admin.createRestaurant(auth, db, {
    name: input.name,
    slug: input.slug,
    ownerName: input.ownerName,
    ownerPhone: input.ownerPhone,
    ownerPassword: PASSWORD,
  });
  await settings.updateSettings(db, r.id, { name: input.name, phone: input.phone, logoUrl: "" });

  let creatorId = "";
  for (const [name, username] of input.staff) {
    creatorId = (await staff.createStaff(auth, db, r.id, { name, username, password: PASSWORD })).id;
  }
  const [owner] = await db
    .select({ id: member.userId })
    .from(member)
    .where(eq(member.organizationId, r.id))
    .limit(1);
  creatorId ||= owner!.id;

  const menuIds = new Map<string, string>();
  for (const name of input.menu) {
    menuIds.set(name, (await catalog.createMenuItem(db, r.id, { name, active: true })).id);
  }
  const table = await catalog.createField(db, r.id, {
    label: "رقم الطاولة",
    required: false,
    public: true,
    active: true,
  });
  const payment = await catalog.createField(db, r.id, {
    label: "طريقة الدفع",
    required: false,
    public: false,
    active: true,
  });

  // Earlier days, for the reports page.
  for (let day = input.pastDays ?? 0; day >= 1; day--) {
    const perDay = 6 + ((day * 7) % 9);
    for (let i = 0; i < perDay; i++) {
      const enteredAgo = day * 24 * 60 - i * 37;
      const eta = 15 + ((i * 11) % 25);
      const created = await orders.createOrder(
        db,
        r.id,
        creatorId,
        {
          invoiceNumber: String(i + 1),
          eta: { mode: "countdown", minutes: eta },
          items: [{ menuItemId: menuIds.get(input.menu[i % input.menu.length]!), name: input.menu[i % input.menu.length]!, quantity: 1 + (i % 3) }],
          customerName: "",
          customerPhone: "",
          address: "",
          notes: "",
          fields: [],
        },
        clockAt(-enteredAgo),
      );
      const outAfter = eta + ((i * 5) % 13) - 4;
      if (i % 8 === 7) {
        await orders.updateStatus(db, r.id, created.id, "cancelled", clockAt(-enteredAgo + 5));
      } else {
        await orders.updateStatus(db, r.id, created.id, "out_for_delivery", clockAt(-enteredAgo + outAfter));
        await orders.updateStatus(db, r.id, created.id, "delivered", clockAt(-enteredAgo + outAfter + 20));
      }
    }
  }

  // Today.
  const ids = new Map<string, string>();
  for (const o of input.orders) {
    const fields = [
      ...(o.table ? [{ fieldId: table.id, value: o.table }] : []),
      ...(o.payment ? [{ fieldId: payment.id, value: o.payment }] : []),
    ];
    const created = await orders.createOrder(
      db,
      r.id,
      creatorId,
      {
        invoiceNumber: o.invoice,
        eta: o.eta,
        items: o.items.map(([name, quantity]) => ({ menuItemId: menuIds.get(name), name, quantity })),
        customerName: o.customerName ?? "",
        customerPhone: "",
        address: "",
        notes: "",
        fields,
      },
      clockAt(-o.enteredAgo),
    );
    ids.set(o.invoice, created.id);
    const later = clockAt(-Math.max(o.enteredAgo - 15, 1));
    if (o.status === "out_for_delivery" || o.status === "delivered") {
      await orders.updateStatus(db, r.id, created.id, "out_for_delivery", later);
    }
    if (o.status === "delivered") {
      await orders.updateStatus(db, r.id, created.id, "delivered", clockAt(-Math.max(o.enteredAgo - 30, 0)));
    }
    if (o.status === "cancelled") {
      await orders.updateStatus(db, r.id, created.id, "cancelled", later);
    }
  }
  return { id: r.id, ids };
}

async function main() {
  const [{ restaurants }] = (await db.select({ restaurants: count() }).from(organization)) as [{ restaurants: number }];
  if (restaurants > 0) {
    console.error("The database already has restaurants. Seed only runs on a database without any.");
    process.exitCode = 1;
    return;
  }

  const [{ users }] = (await db.select({ users: count() }).from(user)) as [{ users: number }];
  if (users === 0) {
    await admin.createSuperAdmin(auth, db, { name: "مدير المنصة", username: "admin", password: PASSWORD });
  }

  const roma = await seedRestaurant({
    name: "بيتزا روما",
    slug: "pizza-roma",
    ownerName: "أحمد سمير",
    ownerPhone: "01001234567",
    phone: "0225551234",
    staff: [
      ["منى خالد", "mona"],
      ["كريم عادل", "karim"],
    ],
    menu: ["بيتزا مارجريتا", "بيتزا بيبروني", "بيتزا خضار", "مكرونة بالصوص الأحمر", "سلطة سيزر", "بيبسي"],
    pastDays: 9,
    orders: [
      { invoice: "120", enteredAgo: 95, eta: { mode: "countdown", minutes: 30 }, items: [["بيتزا بيبروني", 2]], status: "delivered", customerName: "سارة" },
      { invoice: "121", enteredAgo: 70, eta: { mode: "countdown", minutes: 25 }, items: [["بيتزا مارجريتا", 1], ["بيبسي", 2]], status: "delivered" },
      { invoice: "122", enteredAgo: 48, eta: { mode: "countdown", minutes: 30 }, items: [["مكرونة بالصوص الأحمر", 1]], status: "out_for_delivery", customerName: "يوسف", payment: "كاش" },
      { invoice: "123", enteredAgo: 40, eta: { mode: "countdown", minutes: 35 }, items: [["بيتزا خضار", 1]], status: "cancelled" },
      // Late: entered 38 min ago with a 30 min ETA.
      { invoice: "124", enteredAgo: 38, eta: { mode: "countdown", minutes: 30 }, items: [["بيتزا بيبروني", 1], ["سلطة سيزر", 1]], customerName: "مريم", table: "4" },
      { invoice: "125", enteredAgo: 22, eta: { mode: "countdown", minutes: 35 }, items: [["بيتزا مارجريتا", 2], ["بيبسي", 2]], customerName: "عمر", table: "7", payment: "فيزا" },
      { invoice: "126", enteredAgo: 15, eta: { mode: "minutes", minutes: 20 }, items: [["سلطة سيزر", 1]], table: "2" },
      { invoice: "127", enteredAgo: 9, eta: { mode: "countdown", minutes: 40 }, items: [["بيتزا خضار", 1], ["مكرونة بالصوص الأحمر", 1], ["بيبسي", 3]], customerName: "سارة", table: "7" },
      { invoice: "128", enteredAgo: 4, eta: { mode: "countdown", minutes: 45 }, items: [["بيتزا بيبروني", 3]], customerName: "خالد" },
    ],
  });

  const burger = await seedRestaurant({
    name: "برجر هاوس",
    slug: "burger-house",
    ownerName: "هالة محمود",
    ownerPhone: "01112223333",
    phone: "0233334444",
    staff: [["تامر", "tamer"]],
    menu: ["تشيز برجر", "دبل برجر", "بطاطس", "ميلك شيك"],
    pastDays: 4,
    orders: [
      { invoice: "55", enteredAgo: 20, eta: { mode: "countdown", minutes: 25 }, items: [["دبل برجر", 1], ["بطاطس", 1]] },
      { invoice: "56", enteredAgo: 6, eta: { mode: "minutes", minutes: 30 }, items: [["تشيز برجر", 2], ["ميلك شيك", 2]] },
    ],
  });

  await seedRestaurant({
    name: "كشري التحرير",
    slug: "koshary-tahrir",
    ownerName: "محمود فؤاد",
    ownerPhone: "01223334444",
    phone: "",
    staff: [],
    menu: ["كشري صغير", "كشري كبير", "أرز بلبن"],
    orders: [{ invoice: "9", enteredAgo: 3, eta: { mode: "countdown", minutes: 15 }, items: [["كشري كبير", 2]] }],
  });

  const old = await seedRestaurant({
    name: "كافيه زمان",
    slug: "old-cafe",
    ownerName: "سامي",
    ownerPhone: "01556667777",
    phone: "",
    staff: [],
    menu: ["قهوة"],
    orders: [],
  });
  await admin.setActive(db, old.id, false);

  // A customer with saved orders and favorites.
  const customerId = await createAccount(auth, db, {
    name: "سارة علي",
    username: "01009998888",
    password: PASSWORD,
  });
  for (const invoice of ["127", "125", "122", "120"]) {
    await publicRepo.saveOrderFor(db, customerId, roma.ids.get(invoice)!);
  }
  await publicRepo.saveOrderFor(db, customerId, burger.ids.get("56")!);
  await customerRepo.addFavorite(db, customerId, roma.id);
  await customerRepo.addFavorite(db, customerId, burger.id);

  console.log(`Seeded demo data for ${businessDay(new Date(realNow), timeZone)}.`);
  console.log(SEED_PASSWORD ? "All demo accounts use SEED_PASSWORD." : `All demo accounts use the password: ${DEV_PASSWORD}`);
  if (users === 0) console.log("  super-admin: admin");
  console.log("  owner (بيتزا روما): 01001234567   staff: mona, karim");
  console.log("  owner (برجر هاوس): 01112223333   staff: tamer");
  console.log("  customer: 01009998888");
}

try {
  await main();
} finally {
  await pool.end();
}
