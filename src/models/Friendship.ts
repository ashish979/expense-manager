import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IFriendship extends Document {
  users: [Types.ObjectId, Types.ObjectId]; // sorted ascending
  createdAt: Date;
}

const FriendshipSchema = new Schema<IFriendship>(
  {
    users: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      required: true,
      validate: (v: Types.ObjectId[]) => v.length === 2,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Unique pair (users sorted before insert)
FriendshipSchema.index({ users: 1 }, { unique: true });

const Friendship: Model<IFriendship> =
  mongoose.models.Friendship ??
  mongoose.model<IFriendship>("Friendship", FriendshipSchema);

export default Friendship;
