export interface UserDTO {
  id: string;
  name: string;
  email: string;
  image?: string;
  currency: string;
}

export interface FriendRequestDTO {
  id: string;
  from: UserDTO;
  to: UserDTO;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

export interface FriendDTO {
  id: string; // friendship id
  user: UserDTO;
  balance?: number; // cents, positive = they owe you
  createdAt: string;
}

export interface GroupMemberDTO {
  userId: string;
  role: "admin" | "member";
  joinedAt: string;
  user?: UserDTO;
}

export interface GroupDTO {
  id: string;
  name: string;
  category: string;
  members: GroupMemberDTO[];
  simplifyDebts: boolean;
  createdBy: string;
  createdAt: string;
}

export interface ExpenseSplitDTO {
  userId: string;
  amount: number;
  percentage?: number;
  shares?: number;
  user?: UserDTO;
}

export interface ExpenseDTO {
  id: string;
  description: string;
  amount: number; // cents
  category: string;
  date: string;
  groupId?: string;
  paidBy: string;
  paidByUser?: UserDTO;
  splitType: "equal" | "unequal" | "percentage" | "shares";
  splits: ExpenseSplitDTO[];
  notes?: string;
  isDeleted: boolean;
  createdBy: string;
  createdAt: string;
}

export interface SettlementDTO {
  id: string;
  paidBy: string;
  paidByUser?: UserDTO;
  paidTo: string;
  paidToUser?: UserDTO;
  amount: number; // cents
  groupId?: string;
  date: string;
  notes?: string;
  createdAt: string;
}

export interface ActivityDTO {
  id: string;
  actorId: string;
  actor?: UserDTO;
  type: string;
  entityType: string;
  entityId: string;
  groupId?: string;
  involvedUsers: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface BalanceSummary {
  totalOwed: number; // cents others owe you
  totalOwe: number;  // cents you owe others
  net: number;       // totalOwed - totalOwe
}

export interface DebtDTO {
  from: string;
  fromUser?: UserDTO;
  to: string;
  toUser?: UserDTO;
  amount: number;
}
