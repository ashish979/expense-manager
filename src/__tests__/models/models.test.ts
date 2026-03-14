import mongoose from "mongoose";
import { setupTestDB, teardownTestDB, clearCollections } from "../helpers/db";
import User from "@/models/User";
import FriendRequest from "@/models/FriendRequest";
import Friendship from "@/models/Friendship";
import Group from "@/models/Group";
import Expense from "@/models/Expense";
import Settlement from "@/models/Settlement";
import Activity from "@/models/Activity";

beforeAll(async () => {
  await setupTestDB();
});

afterAll(async () => {
  await teardownTestDB();
});

afterEach(async () => {
  await clearCollections();
});

// ---------------------------------------------------------------------------
// Helper: create a saved User document
// ---------------------------------------------------------------------------
async function createUser(overrides: Partial<{ email: string; name: string; image: string; googleId: string; currency: string }> = {}) {
  return User.create({
    email: overrides.email ?? `user-${new mongoose.Types.ObjectId()}@test.com`,
    name: overrides.name ?? "Test User",
    ...overrides,
  });
}

// ===========================================================================
// User Model
// ===========================================================================
describe("User model", () => {
  it("creates a user with valid data", async () => {
    const user = await User.create({
      email: "alice@example.com",
      name: "Alice",
      image: "https://img.example.com/alice.png",
      googleId: "g-123",
    });

    expect(user._id).toBeDefined();
    expect(user.email).toBe("alice@example.com");
    expect(user.name).toBe("Alice");
    expect(user.image).toBe("https://img.example.com/alice.png");
    expect(user.googleId).toBe("g-123");
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });

  it("defaults currency to INR", async () => {
    const user = await User.create({ email: "bob@example.com", name: "Bob" });
    expect(user.currency).toBe("INR");
  });

  it("lowercases email", async () => {
    const user = await User.create({ email: "UPPER@EXAMPLE.COM", name: "Upper" });
    expect(user.email).toBe("upper@example.com");
  });

  it("rejects missing email", async () => {
    await expect(User.create({ name: "NoEmail" })).rejects.toThrow(
      mongoose.Error.ValidationError
    );
  });

  it("rejects missing name", async () => {
    await expect(User.create({ email: "noname@test.com" })).rejects.toThrow(
      mongoose.Error.ValidationError
    );
  });

  it("rejects duplicate email", async () => {
    await User.create({ email: "dup@test.com", name: "First" });
    await expect(
      User.create({ email: "dup@test.com", name: "Second" })
    ).rejects.toThrow(/duplicate key/i);
  });
});

// ===========================================================================
// FriendRequest Model
// ===========================================================================
describe("FriendRequest model", () => {
  it("creates a friend request with valid data", async () => {
    const from = await createUser({ email: "fr-from@test.com" });
    const to = await createUser({ email: "fr-to@test.com" });

    const req = await FriendRequest.create({ from: from._id, to: to._id });

    expect(req._id).toBeDefined();
    expect(req.from.toString()).toBe(from._id.toString());
    expect(req.to.toString()).toBe(to._id.toString());
  });

  it("defaults status to pending", async () => {
    const from = await createUser();
    const to = await createUser();
    const req = await FriendRequest.create({ from: from._id, to: to._id });
    expect(req.status).toBe("pending");
  });

  it("rejects missing from", async () => {
    const to = await createUser();
    await expect(FriendRequest.create({ to: to._id })).rejects.toThrow(
      mongoose.Error.ValidationError
    );
  });

  it("rejects missing to", async () => {
    const from = await createUser();
    await expect(FriendRequest.create({ from: from._id })).rejects.toThrow(
      mongoose.Error.ValidationError
    );
  });

  it("rejects duplicate {from, to} pair", async () => {
    const from = await createUser();
    const to = await createUser();
    await FriendRequest.create({ from: from._id, to: to._id });
    await expect(
      FriendRequest.create({ from: from._id, to: to._id })
    ).rejects.toThrow(/duplicate key/i);
  });

  it("populates from and to with User documents", async () => {
    const from = await createUser({ email: "pop-from@test.com", name: "From" });
    const to = await createUser({ email: "pop-to@test.com", name: "To" });
    await FriendRequest.create({ from: from._id, to: to._id });

    const populated = await FriendRequest.findOne({}).populate("from").populate("to");
    expect((populated!.from as any).name).toBe("From");
    expect((populated!.to as any).name).toBe("To");
  });
});

// ===========================================================================
// Friendship Model
// ===========================================================================
describe("Friendship model", () => {
  it("creates a friendship with two users", async () => {
    const u1 = await createUser();
    const u2 = await createUser();
    const fs = await Friendship.create({ users: [u1._id, u2._id] });

    expect(fs._id).toBeDefined();
    expect(fs.users).toHaveLength(2);
    expect(fs.createdAt).toBeInstanceOf(Date);
  });

  it("validates exactly 2 users required", async () => {
    const u1 = await createUser();
    await expect(Friendship.create({ users: [u1._id] })).rejects.toThrow(
      mongoose.Error.ValidationError
    );
  });

  it("rejects empty users array", async () => {
    await expect(Friendship.create({ users: [] })).rejects.toThrow(
      mongoose.Error.ValidationError
    );
  });

  it("rejects duplicate user pair (unique index)", async () => {
    const u1 = await createUser();
    const u2 = await createUser();
    await Friendship.create({ users: [u1._id, u2._id] });
    await expect(
      Friendship.create({ users: [u1._id, u2._id] })
    ).rejects.toThrow(/duplicate key/i);
  });

  it("populates users with User documents", async () => {
    const u1 = await createUser({ email: "fs1@test.com", name: "FS1" });
    const u2 = await createUser({ email: "fs2@test.com", name: "FS2" });
    await Friendship.create({ users: [u1._id, u2._id] });

    const populated = await Friendship.findOne({}).populate("users");
    const names = (populated!.users as any[]).map((u) => u.name);
    expect(names).toContain("FS1");
    expect(names).toContain("FS2");
  });
});

// ===========================================================================
// Group Model
// ===========================================================================
describe("Group model", () => {
  it("creates a group with valid data", async () => {
    const creator = await createUser();
    const group = await Group.create({
      name: "Trip to Japan",
      category: "trip",
      members: [{ userId: creator._id, role: "admin" }],
      createdBy: creator._id,
    });

    expect(group._id).toBeDefined();
    expect(group.name).toBe("Trip to Japan");
    expect(group.category).toBe("trip");
    expect(group.members).toHaveLength(1);
    expect(group.members[0].role).toBe("admin");
    expect(group.members[0].joinedAt).toBeInstanceOf(Date);
    expect(group.createdBy.toString()).toBe(creator._id.toString());
  });

  it("defaults category to other", async () => {
    const creator = await createUser();
    const group = await Group.create({
      name: "Misc",
      members: [{ userId: creator._id }],
      createdBy: creator._id,
    });
    expect(group.category).toBe("other");
  });

  it("defaults simplifyDebts to false", async () => {
    const creator = await createUser();
    const group = await Group.create({
      name: "Test",
      members: [{ userId: creator._id }],
      createdBy: creator._id,
    });
    expect(group.simplifyDebts).toBe(false);
  });

  it("defaults member role to member", async () => {
    const creator = await createUser();
    const group = await Group.create({
      name: "Defaults",
      members: [{ userId: creator._id }],
      createdBy: creator._id,
    });
    expect(group.members[0].role).toBe("member");
  });

  it("rejects missing name", async () => {
    const creator = await createUser();
    await expect(
      Group.create({ members: [{ userId: creator._id }], createdBy: creator._id })
    ).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it("rejects missing createdBy", async () => {
    await expect(Group.create({ name: "NoCreator" })).rejects.toThrow(
      mongoose.Error.ValidationError
    );
  });

  it("populates members.userId and createdBy", async () => {
    const creator = await createUser({ email: "gcreator@test.com", name: "Creator" });
    const member = await createUser({ email: "gmember@test.com", name: "Member" });
    await Group.create({
      name: "Populate Test",
      members: [
        { userId: creator._id, role: "admin" },
        { userId: member._id, role: "member" },
      ],
      createdBy: creator._id,
    });

    const populated = await Group.findOne({})
      .populate("members.userId")
      .populate("createdBy");
    expect((populated!.createdBy as any).name).toBe("Creator");
    expect((populated!.members[1].userId as any).name).toBe("Member");
  });
});

// ===========================================================================
// Expense Model
// ===========================================================================
describe("Expense model", () => {
  it("creates an expense with valid data", async () => {
    const payer = await createUser();
    const splitter = await createUser();
    const expense = await Expense.create({
      description: "Dinner",
      amount: 5000,
      category: "food",
      paidBy: payer._id,
      splitType: "equal",
      splits: [
        { userId: payer._id, amount: 2500 },
        { userId: splitter._id, amount: 2500 },
      ],
      createdBy: payer._id,
    });

    expect(expense._id).toBeDefined();
    expect(expense.description).toBe("Dinner");
    expect(expense.amount).toBe(5000);
    expect(expense.splits).toHaveLength(2);
    expect(expense.date).toBeInstanceOf(Date);
  });

  it("defaults isDeleted to false", async () => {
    const user = await createUser();
    const expense = await Expense.create({
      description: "Test",
      amount: 100,
      paidBy: user._id,
      splitType: "equal",
      splits: [{ userId: user._id, amount: 100 }],
      createdBy: user._id,
    });
    expect(expense.isDeleted).toBe(false);
  });

  it("defaults category to other", async () => {
    const user = await createUser();
    const expense = await Expense.create({
      description: "Test",
      amount: 100,
      paidBy: user._id,
      splitType: "equal",
      splits: [{ userId: user._id, amount: 100 }],
      createdBy: user._id,
    });
    expect(expense.category).toBe("other");
  });

  it("rejects amount less than 1", async () => {
    const user = await createUser();
    await expect(
      Expense.create({
        description: "Zero",
        amount: 0,
        paidBy: user._id,
        splitType: "equal",
        splits: [{ userId: user._id, amount: 0 }],
        createdBy: user._id,
      })
    ).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it("rejects missing description", async () => {
    const user = await createUser();
    await expect(
      Expense.create({
        amount: 100,
        paidBy: user._id,
        splitType: "equal",
        splits: [{ userId: user._id, amount: 100 }],
        createdBy: user._id,
      })
    ).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it("rejects missing paidBy", async () => {
    const user = await createUser();
    await expect(
      Expense.create({
        description: "NoPayer",
        amount: 100,
        splitType: "equal",
        splits: [{ userId: user._id, amount: 100 }],
        createdBy: user._id,
      })
    ).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it("rejects missing splitType", async () => {
    const user = await createUser();
    await expect(
      Expense.create({
        description: "NoSplit",
        amount: 100,
        paidBy: user._id,
        splits: [{ userId: user._id, amount: 100 }],
        createdBy: user._id,
      })
    ).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it("rejects missing createdBy", async () => {
    const user = await createUser();
    await expect(
      Expense.create({
        description: "NoCreator",
        amount: 100,
        paidBy: user._id,
        splitType: "equal",
        splits: [{ userId: user._id, amount: 100 }],
      })
    ).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it("supports optional groupId", async () => {
    const user = await createUser();
    const group = await Group.create({
      name: "G",
      members: [{ userId: user._id }],
      createdBy: user._id,
    });
    const expense = await Expense.create({
      description: "Group Dinner",
      amount: 3000,
      paidBy: user._id,
      splitType: "equal",
      splits: [{ userId: user._id, amount: 3000 }],
      createdBy: user._id,
      groupId: group._id,
    });
    expect(expense.groupId!.toString()).toBe(group._id.toString());
  });

  it("populates paidBy and splits.userId", async () => {
    const payer = await createUser({ email: "payer@test.com", name: "Payer" });
    const splitter = await createUser({ email: "splitter@test.com", name: "Splitter" });
    await Expense.create({
      description: "Populate",
      amount: 2000,
      paidBy: payer._id,
      splitType: "equal",
      splits: [
        { userId: payer._id, amount: 1000 },
        { userId: splitter._id, amount: 1000 },
      ],
      createdBy: payer._id,
    });

    const populated = await Expense.findOne({})
      .populate("paidBy")
      .populate("splits.userId");
    expect((populated!.paidBy as any).name).toBe("Payer");
    expect((populated!.splits[1].userId as any).name).toBe("Splitter");
  });
});

// ===========================================================================
// Settlement Model
// ===========================================================================
describe("Settlement model", () => {
  it("creates a settlement with valid data", async () => {
    const payer = await createUser();
    const payee = await createUser();
    const settlement = await Settlement.create({
      paidBy: payer._id,
      paidTo: payee._id,
      amount: 5000,
    });

    expect(settlement._id).toBeDefined();
    expect(settlement.paidBy.toString()).toBe(payer._id.toString());
    expect(settlement.paidTo.toString()).toBe(payee._id.toString());
    expect(settlement.amount).toBe(5000);
    expect(settlement.date).toBeInstanceOf(Date);
  });

  it("rejects amount less than 1", async () => {
    const u1 = await createUser();
    const u2 = await createUser();
    await expect(
      Settlement.create({ paidBy: u1._id, paidTo: u2._id, amount: 0 })
    ).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it("rejects negative amount", async () => {
    const u1 = await createUser();
    const u2 = await createUser();
    await expect(
      Settlement.create({ paidBy: u1._id, paidTo: u2._id, amount: -100 })
    ).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it("rejects missing paidBy", async () => {
    const u = await createUser();
    await expect(
      Settlement.create({ paidTo: u._id, amount: 100 })
    ).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it("rejects missing paidTo", async () => {
    const u = await createUser();
    await expect(
      Settlement.create({ paidBy: u._id, amount: 100 })
    ).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it("rejects missing amount", async () => {
    const u1 = await createUser();
    const u2 = await createUser();
    await expect(
      Settlement.create({ paidBy: u1._id, paidTo: u2._id })
    ).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it("supports optional groupId and notes", async () => {
    const u1 = await createUser();
    const u2 = await createUser();
    const group = await Group.create({
      name: "S",
      members: [{ userId: u1._id }],
      createdBy: u1._id,
    });
    const settlement = await Settlement.create({
      paidBy: u1._id,
      paidTo: u2._id,
      amount: 250,
      groupId: group._id,
      notes: "Rent share",
    });
    expect(settlement.groupId!.toString()).toBe(group._id.toString());
    expect(settlement.notes).toBe("Rent share");
  });

  it("populates paidBy and paidTo", async () => {
    const payer = await createUser({ email: "sp@test.com", name: "SettlePayer" });
    const payee = await createUser({ email: "sr@test.com", name: "SettlePayee" });
    await Settlement.create({ paidBy: payer._id, paidTo: payee._id, amount: 100 });

    const populated = await Settlement.findOne({})
      .populate("paidBy")
      .populate("paidTo");
    expect((populated!.paidBy as any).name).toBe("SettlePayer");
    expect((populated!.paidTo as any).name).toBe("SettlePayee");
  });
});

// ===========================================================================
// Activity Model
// ===========================================================================
describe("Activity model", () => {
  it("creates an activity with valid data", async () => {
    const actor = await createUser();
    const entityId = new mongoose.Types.ObjectId();
    const activity = await Activity.create({
      actorId: actor._id,
      type: "expense_created",
      entityType: "expense",
      entityId,
      involvedUsers: [actor._id],
      metadata: { amount: 5000 },
    });

    expect(activity._id).toBeDefined();
    expect(activity.actorId.toString()).toBe(actor._id.toString());
    expect(activity.type).toBe("expense_created");
    expect(activity.entityType).toBe("expense");
    expect(activity.entityId.toString()).toBe(entityId.toString());
    expect(activity.involvedUsers).toHaveLength(1);
    expect(activity.metadata).toEqual({ amount: 5000 });
    expect(activity.createdAt).toBeInstanceOf(Date);
  });

  it("defaults metadata to empty object", async () => {
    const actor = await createUser();
    const activity = await Activity.create({
      actorId: actor._id,
      type: "friend_added",
      entityType: "friendship",
      entityId: new mongoose.Types.ObjectId(),
    });
    expect(activity.metadata).toEqual({});
  });

  it("rejects missing type", async () => {
    const actor = await createUser();
    await expect(
      Activity.create({
        actorId: actor._id,
        entityType: "expense",
        entityId: new mongoose.Types.ObjectId(),
      })
    ).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it("rejects missing entityType", async () => {
    const actor = await createUser();
    await expect(
      Activity.create({
        actorId: actor._id,
        type: "expense_created",
        entityId: new mongoose.Types.ObjectId(),
      })
    ).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it("rejects missing actorId", async () => {
    await expect(
      Activity.create({
        type: "expense_created",
        entityType: "expense",
        entityId: new mongoose.Types.ObjectId(),
      })
    ).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it("rejects missing entityId", async () => {
    const actor = await createUser();
    await expect(
      Activity.create({
        actorId: actor._id,
        type: "expense_created",
        entityType: "expense",
      })
    ).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it("rejects invalid type enum value", async () => {
    const actor = await createUser();
    await expect(
      Activity.create({
        actorId: actor._id,
        type: "invalid_type",
        entityType: "expense",
        entityId: new mongoose.Types.ObjectId(),
      })
    ).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it("rejects invalid entityType enum value", async () => {
    const actor = await createUser();
    await expect(
      Activity.create({
        actorId: actor._id,
        type: "expense_created",
        entityType: "invalid_entity",
        entityId: new mongoose.Types.ObjectId(),
      })
    ).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it("supports optional groupId", async () => {
    const actor = await createUser();
    const group = await Group.create({
      name: "AG",
      members: [{ userId: actor._id }],
      createdBy: actor._id,
    });
    const activity = await Activity.create({
      actorId: actor._id,
      type: "group_created",
      entityType: "group",
      entityId: group._id,
      groupId: group._id,
    });
    expect(activity.groupId!.toString()).toBe(group._id.toString());
  });

  it("populates actorId and involvedUsers", async () => {
    const actor = await createUser({ email: "actor@test.com", name: "Actor" });
    const involved = await createUser({ email: "involved@test.com", name: "Involved" });
    await Activity.create({
      actorId: actor._id,
      type: "expense_created",
      entityType: "expense",
      entityId: new mongoose.Types.ObjectId(),
      involvedUsers: [actor._id, involved._id],
    });

    const populated = await Activity.findOne({})
      .populate("actorId")
      .populate("involvedUsers");
    expect((populated!.actorId as any).name).toBe("Actor");
    expect((populated!.involvedUsers as any[]).map((u) => u.name)).toContain("Involved");
  });
});
