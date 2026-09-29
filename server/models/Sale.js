import mongoose from "mongoose";

const saleItemSchema = new mongoose.Schema(
  {
    medicineCode: { type: String, default: "" },
    medicineName: { type: String, required: true },
    batchNumber: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true },
    total: { type: Number, required: true },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    prescriptionId: { type: String, default: "" },
    patientName: { type: String, default: "Walk-in Customer" },
    patientPhone: { type: String, default: "" },
    doctorName: { type: String, default: "" },
    items: { type: [saleItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    paymentMethod: {
      type: String,
      enum: ["Cash", "Card", "UPI", "Net Banking"],
      default: "Cash",
    },
    status: {
      type: String,
      enum: ["Completed", "Refunded", "Cancelled"],
      default: "Completed",
    },
  },
  { timestamps: true }
);

saleSchema.index({ invoiceNumber: "text", patientName: "text" });

export default mongoose.model("Sale", saleSchema);
