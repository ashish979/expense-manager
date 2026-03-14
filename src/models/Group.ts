import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type GroupRole = "admin" | "member";
export type GroupCategory =
  | "home"
  | "trip"
  | "couple"
  | "work"
  | "other";

export interface GroupMember {
  userId: Types.ObjectId;
  role: GroupRole;
  joinedAt: Date;
}

export interface IGroup extends Document {
  name: string;
  category: GroupCategory;
  members: GroupMember[];
  simplifyDebts: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema = new Schema<IGroup>(
  {
    name: { type: String, required: true },
    category: {
      type: String,
      enum: ["home", "trip", "couple", "work", "other"],
      default: "other",
    },
    members: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        role: { type: String, enum: ["admin", "member"], default: "member" },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    simplifyDebts: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

GroupSchema.index({ "members.userId": 1 });

const Group: Model<IGroup> =
  mongoose.models.Group ?? mongoose.model<IGroup>("Group", GroupSchema);

export default Group;
