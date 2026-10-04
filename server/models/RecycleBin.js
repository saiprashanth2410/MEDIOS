import mongoose from "mongoose";

const recycleBinSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    originalId: { type: String, required: true },
    itemType: { type: String, default: "expiry_item" }, // 'expiry_item', 'medicine', 'batch'
    medicineName: { type: String, required: true, index: true },
    batchNumber: { type: String, default: "" },
    quantity: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    atRiskValue: { type: Number, default: 0 },
    expiryDate: { type: String, default: "" },
    daysLeft: { type: Number, default: 0 },
    supplier: { type: String, default: "" },
    location: { type: String, default: "" },
    status: { type: String, default: "Expired" },
    deletedAt: { type: Date, default: Date.now, index: true },
    deletedBy: { type: String, default: "Pharmacist Admin" },
    deletionReason: { type: String, default: "Removed from active inventory" },
    originalItem: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

recycleBinSchema.index({ deletedAt: -1 });
recycleBinSchema.index({ medicineName: "text", batchNumber: "text" });

export default mongoose.model("RecycleBin", recycleBinSchema);
