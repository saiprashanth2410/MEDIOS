import mongoose from "mongoose";

const medicineSchema = new mongoose.Schema(
  {
    code: { type: String, index: true },
    name: { type: String, required: true, index: true },
    fullName: { type: String, default: "" },
    brand: { type: String, default: "" },
    category: { type: String, default: "Pharmaceutical" },
    composition: { type: String, default: "" },
    generic: { type: String, default: "" },
    packSize: { type: String, default: "" },
    mrp: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    hsnCode: { type: String, default: "" },
    gst: { type: Number, default: 12 },
    supplierCode: { type: String, default: "", index: true },
    supplierName: { type: String, default: "" },
    stock: { type: Number, default: 0 },
    quantity: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 10 },
    batch: { type: String, default: "" },
    rack: { type: String, default: "" },
    schedule: { type: String, default: "H" },
    expiry: { type: String, default: "" },
  },
  { timestamps: true }
);

// Keep aliases synced before save
medicineSchema.pre("save", function (next) {
  if (!this.generic && this.composition) this.generic = this.composition;
  if (!this.composition && this.generic) this.composition = this.generic;
  if (!this.price && this.sellingPrice) this.price = this.sellingPrice;
  if (!this.sellingPrice && this.price) this.sellingPrice = this.price;
  if (!this.stock && this.quantity) this.stock = this.quantity;
  if (!this.quantity && this.stock) this.quantity = this.stock;
  next();
});

medicineSchema.index({ name: "text", composition: "text", generic: "text", fullName: "text" });

export default mongoose.model("Medicine", medicineSchema);