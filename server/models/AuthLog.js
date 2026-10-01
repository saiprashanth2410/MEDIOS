import mongoose from "mongoose";

const authLogSchema = new mongoose.Schema(
  {
    userId: { type: String, default: "" },
    userName: { type: String, default: "Pharmacist" },
    email: { type: String, required: true, index: true },
    action: {
      type: String,
      enum: ["login", "logout", "oauth_login", "register"],
      default: "login",
    },
    provider: {
      type: String,
      enum: ["credentials", "google", "github"],
      default: "credentials",
    },
    entryTime: { type: Date, default: Date.now },
    logoutTime: { type: Date, default: null },
    sessionDurationSeconds: { type: Number, default: 0 },
    ip: { type: String, default: "" },
    device: { type: String, default: "Desktop Web" },
    status: { type: String, enum: ["success", "failed"], default: "success" },
  },
  { timestamps: true }
);

authLogSchema.index({ email: 1, entryTime: -1 });

export default mongoose.model("AuthLog", authLogSchema);
