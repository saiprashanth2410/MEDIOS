import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    type: {
      type: String,
      enum: ["expiry", "stock", "prescription", "order", "system"],
      default: "system",
      index: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false, index: true },
    color: {
      type: String,
      enum: ["amber", "red", "blue", "emerald", "purple"],
      default: "blue",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    link: { type: String, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

notificationSchema.index({ title: "text", message: "text" });

export default mongoose.model("Notification", notificationSchema);
