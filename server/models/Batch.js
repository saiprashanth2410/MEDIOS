import mongoose from "mongoose";

const batchSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    medicineName: { type: String, required: true, index: true },
    batchNumber: { type: String, required: true, index: true },
    quantity: { type: Number, default: 0 },
    expiryDate: { type: String, default: "" },
    supplier: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Active", "Expiring Soon", "Expired"],
      default: "Active",
    },
  },
  { timestamps: true }
);

batchSchema.index({ medicineName: "text", batchNumber: "text" });

export default mongoose.model("Batch", batchSchema);