import mongoose from "mongoose";

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "general_settings" },
    personal: {
      name: { type: String, default: "Sai Kumar" },
      email: { type: String, default: "sai@meditrack.in" },
      phone: { type: String, default: "+91 98765 43210" },
      role: { type: String, default: "Chief Pharmacist" },
      license: { type: String, default: "TN/PH/2026/0892" },
      qualification: { type: String, default: "M.Pharm, R.Ph" },
      experience: { type: String, default: "8 Years" },
      joinDate: { type: String, default: "January 2024" },
      avatar: { type: String, default: "" },
    },
    pharmacy: {
      name: { type: String, default: "MediTrack Pharmacy & Health Store" },
      licenseNumber: { type: String, default: "DL-TN-CH-2024-0045" },
      gstNumber: { type: String, default: "33AABCT1332L1Z4" },
      phone: { type: String, default: "+91 44 2841 4567" },
      email: { type: String, default: "contact@meditrack.in" },
      address: {
        type: String,
        default: "12, Anna Salai, Thousand Lights, Chennai, Tamil Nadu 600006",
      },
      timing: { type: String, default: "08:00 AM - 11:00 PM (All 7 Days)" },
    },
    preferences: {
      emailNotifications: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
      expiryAlerts: { type: Boolean, default: true },
      lowStockAlerts: { type: Boolean, default: true },
      theme: { type: String, default: "system" },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Setting", settingSchema);
