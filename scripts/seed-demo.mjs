// Seeds a local MongoDB with fictional demo data and creates a ready-to-use
// login session, so the app can be explored without Google OAuth.
//
//   MONGODB_URI=mongodb://127.0.0.1:27017/expense-manager node scripts/seed-demo.mjs
//
// Prints the session token; set it as the `authjs.session-token` cookie.
import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/expense-manager";
const SESSION_TOKEN = "demo-session-token-0000";
const client = new MongoClient(uri);
await client.connect();
const db = client.db();
await db.dropDatabase();

const day = 86400000;
const ago = (d, h = 0) => new Date(Date.now() - d * day - h * 3600000);
const id = () => new ObjectId();

const mk = (name, email) => ({ _id: id(), name, email, currency: "INR", createdAt: ago(90), updatedAt: ago(90) });
const me = mk("Aarav Sharma", "aarav@example.com");
const priya = mk("Priya Nair", "priya@example.com");
const rohan = mk("Rohan Mehta", "rohan@example.com");
const ishita = mk("Ishita Kapoor", "ishita@example.com");
const karan = mk("Karan Verma", "karan@example.com");
const neha = mk("Neha Iyer", "neha@example.com");
const users = [me, priya, rohan, ishita, karan, neha];
await db.collection("users").insertMany(users.map((u) => ({ ...u, emailVerified: null })));
await db.collection("sessions").insertOne({ sessionToken: SESSION_TOKEN, userId: me._id, expires: new Date(Date.now() + 30 * day) });

const sorted = (a, b) => (a.toString() < b.toString() ? [a, b] : [b, a]);
await db.collection("friendships").insertMany(
  [priya, rohan, ishita, karan].map((f) => ({ users: sorted(me._id, f._id), createdAt: ago(60) }))
);
await db.collection("friendrequests").insertOne({ from: neha._id, to: me._id, status: "pending", createdAt: ago(1), updatedAt: ago(1) });

const member = (u, role = "member") => ({ userId: u._id, role, joinedAt: ago(60) });
const goa = { _id: id(), name: "Goa Trip 2026", category: "trip", simplifyDebts: true, createdBy: me._id, members: [member(me, "admin"), member(priya), member(rohan), member(ishita)], createdAt: ago(40), updatedAt: ago(2) };
const flat = { _id: id(), name: "Flat 402", category: "home", simplifyDebts: false, createdBy: priya._id, members: [member(me), member(priya, "admin"), member(karan)], createdAt: ago(80), updatedAt: ago(3) };
const lunch = { _id: id(), name: "Office Lunch Club", category: "work", simplifyDebts: true, createdBy: me._id, members: [member(me, "admin"), member(rohan), member(karan)], createdAt: ago(30), updatedAt: ago(1) };
await db.collection("groups").insertMany([goa, flat, lunch]);

const rupees = (n) => Math.round(n * 100);
const equal = (total, people) => {
  const base = Math.floor(total / people.length);
  let rem = total - base * people.length;
  return people.map((p) => ({ userId: p._id, amount: base + (rem-- > 0 ? 1 : 0) }));
};
const expenses = [];
const add = (description, amt, category, paidBy, people, daysAgo, group, split = "equal", splits) => {
  const amount = rupees(amt);
  expenses.push({
    _id: id(), description, amount, category, date: ago(daysAgo), groupId: group?._id, paidBy: paidBy._id,
    splitType: split, splits: splits ?? equal(amount, people), isDeleted: false, createdBy: paidBy._id,
    createdAt: ago(daysAgo), updatedAt: ago(daysAgo),
  });
};
const goaP = [me, priya, rohan, ishita];
add("Beachfront villa (3 nights)", 36000, "accommodation", me, goaP, 12, goa);
add("Scooter rentals", 2400, "transport", priya, goaP, 11, goa);
add("Seafood dinner at Fisherman's Cove", 5200, "food", rohan, goaP, 11, goa);
add("Water sports package", 6800, "entertainment", ishita, goaP, 10, goa);
add("Airport cab", 3200, "transport", me, goaP, 12, goa, "unequal", [
  { userId: me._id, amount: rupees(500) }, { userId: priya._id, amount: rupees(900) }, { userId: rohan._id, amount: rupees(900) }, { userId: ishita._id, amount: rupees(900) }]);
add("Club night cover charge", 4000, "entertainment", priya, goaP, 9, goa, "percentage", [
  { userId: me._id, amount: rupees(1200), percentage: 30 }, { userId: priya._id, amount: rupees(1200), percentage: 30 },
  { userId: rohan._id, amount: rupees(800), percentage: 20 }, { userId: ishita._id, amount: rupees(800), percentage: 20 }]);
add("Groceries & snacks", 1850, "food", ishita, goaP, 9, goa);
const flatP = [me, priya, karan];
add("Monthly rent", 45000, "accommodation", priya, flatP, 14, flat);
add("Electricity bill", 3240, "utilities", karan, flatP, 8, flat);
add("Wi-Fi broadband", 1179, "utilities", me, flatP, 7, flat);
add("Cooking gas refill", 1050, "utilities", priya, flatP, 5, flat);
add("Weekly groceries", 2760, "food", karan, flatP, 3, flat, "shares", [
  { userId: me._id, amount: rupees(920), shares: 1 }, { userId: priya._id, amount: rupees(920), shares: 1 }, { userId: karan._id, amount: rupees(920), shares: 1 }]);
const lunchP = [me, rohan, karan];
add("Biryani lunch", 1260, "food", me, lunchP, 6, lunch);
add("Team coffee run", 540, "food", rohan, lunchP, 4, lunch);
add("Thali Friday", 1020, "food", karan, lunchP, 2, lunch);
add("Pizza & drinks", 1740, "food", me, lunchP, 1, lunch);
add("Movie night tickets", 1600, "entertainment", me, [me, ishita], 5, null);
add("Pharmacy", 780, "health", rohan, [me, rohan], 4, null);
add("Birthday gift for Mom", 2500, "shopping", me, [me, karan], 10, null);
add("Uber to concert", 640, "transport", karan, [me, karan], 2, null);
await db.collection("expenses").insertMany(expenses);

const settlements = [
  { _id: id(), paidBy: me._id, paidTo: priya._id, amount: rupees(3000), groupId: goa._id, date: ago(6), notes: "Goa share (UPI)", createdAt: ago(6), updatedAt: ago(6) },
  { _id: id(), paidBy: karan._id, paidTo: me._id, amount: rupees(500), date: ago(3), notes: "Cash", createdAt: ago(3), updatedAt: ago(3) },
];
await db.collection("settlements").insertMany(settlements);

const acts = [];
const act = (type, entityType, entityId, actor, involved, metadata, when, groupId) =>
  acts.push({ _id: id(), actorId: actor._id, type, entityType, entityId, groupId, involvedUsers: involved.map((u) => u._id), metadata, createdAt: when });
for (const g of [goa, flat, lunch]) act("group_created", "group", g._id, g.createdBy === me._id ? me : priya, users.filter((u) => g.members.some((m) => m.userId.equals(u._id))), { groupName: g.name }, g.createdAt, g._id);
for (const e of expenses) {
  const actor = users.find((u) => u._id.equals(e.paidBy));
  act("expense_created", "expense", e._id, actor, users.filter((u) => e.splits.some((s) => s.userId.equals(u._id))), { description: e.description, amount: e.amount }, e.createdAt, e.groupId);
}
for (const s of settlements) act("settlement_created", "settlement", s._id, users.find((u) => u._id.equals(s.paidBy)), users.filter((u) => u._id.equals(s.paidBy) || u._id.equals(s.paidTo)), { amount: s.amount }, s.createdAt, s.groupId);
await db.collection("activities").insertMany(acts);

console.log(JSON.stringify({ sessionToken: SESSION_TOKEN, groups: { goa: goa._id, flat: flat._id, lunch: lunch._id }, friend: { priya: priya._id } }, null, 2));
await client.close();
