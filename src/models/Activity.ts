import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type ActivityType =
  | "expense_created"
  | "expense_updated"
  | "expense_deleted"
  | "settlement_created"
  | "settlement_deleted"
  | "friend_added"
  | "group_created"
  | "group_member_added"
  | "group_member_removed";

export type ActivityEntityType = "expense" | "settlement" | "friendship" | "group";

export interface IActivity extends Document {
  actorId: Types.ObjectId;
  type: ActivityType;
  entityType: ActivityEntityType;
  entityId: Types.ObjectId;
  groupId?: Types.ObjectId;
  involvedUsers: Types.ObjectId[];
  metadata: Record<string, unknown>;
  createdAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: [
        "expense_created", "expense_updated", "expense_deleted",
        "settlement_created", "settlement_deleted",
        "friend_added", "group_created", "group_member_added", "group_member_removed",
      ],
      required: true,
    },
    entityType: {
      type: String,
      enum: ["expense", "settlement", "friendship", "group"],
      required: true,
    },
    entityId: { type: Schema.Types.ObjectId, required: true },
    groupId: { type: Schema.Types.ObjectId, ref: "Group" },
    involvedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ActivitySchema.index({ actorId: 1, createdAt: -1 });
ActivitySchema.index({ involvedUsers: 1, createdAt: -1 });
ActivitySchema.index({ groupId: 1, createdAt: -1 });

const Activity: Model<IActivity> =
  mongoose.models.Activity ??
  mongoose.model<IActivity>("Activity", ActivitySchema);

export default Activity;
