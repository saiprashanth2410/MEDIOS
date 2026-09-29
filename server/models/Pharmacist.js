import mongoose from "mongoose";

const pharmacistSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    license: { type: String, default: "" },
    role: {
      type: String,
      enum: ["Chief Pharmacist", "Senior Pharmacist", "Pharmacist", "Trainee", "Intern"],
      default: "Pharmacist",
    },
    shift: {
      type: String,
      default: "Morning (9AM - 5PM)",
    },
    status: {
      type: String,
      enum: ["active", "on-leave", "inactive"],
      default: "active",
    },
    joinDate: {
      type: String,
      default: () => new Date().toISOString().split("T")[0],
    },
  },
  { timestamps: true }
);

pharmacistSchema.index({ name: "text", email: "text", license: "text" });

export default mongoose.model("Pharmacist", pharmacistSchema);
