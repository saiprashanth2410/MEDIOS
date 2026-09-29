import mongoose from "mongoose";

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    dosage: { type: String, default: "" },
    frequency: { type: String, default: "" },
    duration: { type: String, default: "" },
    instructions: { type: String, default: "" },
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    patientName: { type: String, required: true, index: true },
    patientAge: { type: String, default: "" },
    patientGender: { type: String, default: "" },
    patientPhone: { type: String, default: "" },
    patientEmail: { type: String, default: "" },
    patientAddress: { type: String, default: "" },
    doctorName: { type: String, required: true, index: true },
    doctorReg: { type: String, default: "" },
    doctorSpecialization: { type: String, default: "" },
    hospital: { type: String, default: "" },
    date: {
      type: String,
      default: () => new Date().toISOString().split("T")[0],
    },
    diagnosis: { type: String, default: "" },
    notes: { type: String, default: "" },
    medicines: { type: [medicineSchema], default: [] },
    aiAssisted: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["pending", "dispensed", "cancelled"],
      default: "pending",
    },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: true }
);

prescriptionSchema.index({
  patientName: "text",
  doctorName: "text",
  id: "text",
});

export default mongoose.model("Prescription", prescriptionSchema);