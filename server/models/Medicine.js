const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema(
  {
    code: { type: String, index: true },
    name: { type: String, required: true, index: true },
    brand: { type: String, default: "" },
    category: { type: String, default: "" },
    composition: { type: String, default: "" },
    packSize: { type: String, default: "" },
    mrp: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    hsnCode: { type: String, default: "" },
    gst: { type: Number, default: 12 },
    supplierCode: { type: String, default: "", index: true },
    supplierName: { type: String, default: "" },
    stock: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 10 },
  },
  { timestamps: true }
);

medicineSchema.index({ name: "text", composition: "text" });

module.exports = mongoose.model("Medicine", medicineSchema);
