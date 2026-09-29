import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    country: { type: String, default: "" },
    contactPerson: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    address: { type: String, default: "" },
    gst: { type: String, default: "" },
    license: { type: String, default: "" },
    category: { type: String, default: "Pharmaceutical" },
    status: {
      type: String,
      enum: ["active", "pending", "inactive", "suspended"],
      default: "active",
    },
    productsCount: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    paymentTerms: { type: String, default: "Net 30" },
    joinedDate: {
      type: String,
      default: () => new Date().toISOString().split("T")[0],
    },
  },
  { timestamps: true }
);

supplierSchema.index({ name: "text", code: "text" });

export default mongoose.model("Supplier", supplierSchema);