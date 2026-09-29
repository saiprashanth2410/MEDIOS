import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";

// Models
import Supplier from "./models/Supplier.js";
import Medicine from "./models/Medicine.js";
import Prescription from "./models/Prescription.js";
import Batch from "./models/Batch.js";
import Pharmacist from "./models/Pharmacist.js";
import Sale from "./models/Sale.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/meditrack";

/* =====================================================
   CORS — Allow any localhost port
===================================================== */

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || /^http:\/\/localhost:\d+$/.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-XSRF-TOKEN"],
  })
);

app.use(express.json({ limit: "50mb" }));

/* =====================================================
   HEALTH CHECK
===================================================== */

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

/* =====================================================
   SUPPLIERS
===================================================== */

app.get("/api/suppliers", async (req, res) => {
  try {
    const { page = 1, limit = 50, search = "", status = "all" } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    if (status !== "all") query.status = status;

    const total = await Supplier.countDocuments(query);
    const suppliers = await Supplier.find(query)
      .sort({ productsCount: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    res.json({
      suppliers,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/suppliers/stats", async (req, res) => {
  try {
    const [total, active, pending, productsAgg] = await Promise.all([
      Supplier.countDocuments(),
      Supplier.countDocuments({ status: "active" }),
      Supplier.countDocuments({ status: "pending" }),
      Supplier.aggregate([
        { $group: { _id: null, total: { $sum: "$productsCount" } } },
      ]),
    ]);

    res.json({
      total,
      active,
      pending,
      totalProducts: productsAgg[0]?.total || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/suppliers/:code", async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ code: req.params.code });
    if (!supplier) return res.status(404).json({ error: "Not found" });
    res.json(supplier);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/suppliers", async (req, res) => {
  try {
    const supplier = new Supplier(req.body);
    await supplier.save();
    res.status(201).json(supplier);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/suppliers/:code", async (req, res) => {
  try {
    const supplier = await Supplier.findOneAndUpdate(
      { code: req.params.code },
      req.body,
      { new: true }
    );
    if (!supplier) return res.status(404).json({ error: "Not found" });
    res.json(supplier);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/suppliers/:code", async (req, res) => {
  try {
    const result = await Supplier.findOneAndDelete({ code: req.params.code });
    if (!result) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   MEDICINES
===================================================== */

app.get("/api/medicines", async (req, res) => {
  try {
    const { page = 1, limit = 50, search = "", supplier = "" } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { fullName: { $regex: search, $options: "i" } },
        { composition: { $regex: search, $options: "i" } },
        { generic: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
        { supplierName: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
        { batch: { $regex: search, $options: "i" } },
      ];
    }

    if (supplier) query.supplierCode = supplier;

    const total = await Medicine.countDocuments(query);
    const medicines = await Medicine.find(query)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    res.json({
      medicines,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/medicines/stats", async (req, res) => {
  try {
    const [total, lowStock, outOfStock, uniqueSuppliers] = await Promise.all([
      Medicine.countDocuments(),
      Medicine.countDocuments({ $expr: { $lt: ["$stock", "$reorderLevel"] } }),
      Medicine.countDocuments({ stock: 0 }),
      Medicine.distinct("supplierCode").then((arr) => arr.length),
    ]);

    res.json({ total, lowStock, outOfStock, uniqueSuppliers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/medicines/:code", async (req, res) => {
  try {
    const isId = mongoose.isValidObjectId(req.params.code);
    const medicine = await Medicine.findOne({
      $or: [
        { code: req.params.code },
        { batch: req.params.code },
        ...(isId ? [{ _id: req.params.code }] : []),
      ],
    });
    if (!medicine) return res.status(404).json({ error: "Not found" });
    res.json(medicine);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/medicines", async (req, res) => {
  try {
    const data = { ...req.body };

    if (!data.code) {
      data.code = `MED-${Date.now()}`;
    }

    const existing = await Medicine.findOne({ code: data.code });
    if (existing) {
      return res
        .status(400)
        .json({ error: `Medicine with code ${data.code} already exists` });
    }

    if (data.supplierCode && !data.supplierName) {
      const supplier = await Supplier.findOne({ code: data.supplierCode });
      if (supplier) data.supplierName = supplier.name;
    }

    const medicine = new Medicine(data);
    await medicine.save();
    res.status(201).json(medicine);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/medicines/:code", async (req, res) => {
  try {
    const isId = mongoose.isValidObjectId(req.params.code);
    const filter = isId
      ? { $or: [{ code: req.params.code }, { _id: req.params.code }] }
      : { code: req.params.code };

    let medicine = await Medicine.findOneAndUpdate(
      filter,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!medicine) {
      const data = {
        ...req.body,
        code: req.body.code || req.params.code,
        name: req.body.name || req.body.fullName || "Medicine",
      };
      medicine = await Medicine.create(data);
    }

    res.json(medicine);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/medicines/:code", async (req, res) => {
  try {
    const isId = mongoose.isValidObjectId(req.params.code);
    const filter = isId
      ? { $or: [{ code: req.params.code }, { _id: req.params.code }] }
      : { code: req.params.code };

    const result = await Medicine.findOneAndDelete(filter);
    res.json({ success: true, deleted: result || { code: req.params.code } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   PRESCRIPTIONS
===================================================== */

app.get("/api/prescriptions", async (req, res) => {
  try {
    const { page = 1, limit = 50, search = "", status = "all" } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { id: { $regex: search, $options: "i" } },
        { patientName: { $regex: search, $options: "i" } },
        { doctorName: { $regex: search, $options: "i" } },
        { diagnosis: { $regex: search, $options: "i" } },
      ];
    }

    if (status !== "all") query.status = status;

    const total = await Prescription.countDocuments(query);
    const prescriptions = await Prescription.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    res.json({
      prescriptions,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/prescriptions/stats", async (req, res) => {
  try {
    const [total, dispensed, pending, cancelled] = await Promise.all([
      Prescription.countDocuments(),
      Prescription.countDocuments({ status: "dispensed" }),
      Prescription.countDocuments({ status: "pending" }),
      Prescription.countDocuments({ status: "cancelled" }),
    ]);

    res.json({ total, dispensed, pending, cancelled });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/prescriptions/:id", async (req, res) => {
  try {
    const rx = await Prescription.findOne({ id: req.params.id });
    if (!rx) return res.status(404).json({ error: "Not found" });
    res.json(rx);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/prescriptions", async (req, res) => {
  try {
    const data = { ...req.body };

    if (!data.id) {
      data.id = `RX-${Date.now().toString().slice(-6)}`;
    }

    const existing = await Prescription.findOne({ id: data.id });
    if (existing) {
      return res
        .status(400)
        .json({ error: `Prescription ${data.id} already exists` });
    }

    const rx = new Prescription(data);
    await rx.save();
    res.status(201).json(rx);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/prescriptions/:id", async (req, res) => {
  try {
    const rx = await Prescription.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!rx) return res.status(404).json({ error: "Not found" });

    // Auto deduct items from Medicine and Batch if marked as dispensed
    if (req.body.status === "dispensed" && Array.isArray(rx.medicines)) {
      for (const item of rx.medicines) {
        if (!item.name) continue;
        const firstWord = item.name.trim().split(" ")[0];
        const medRegex = new RegExp(firstWord, "i");

        // Calculate quantity to deduct based on frequency and duration
        let qty = 10;
        if (item.quantity && Number(item.quantity) > 0) {
          qty = Number(item.quantity);
        } else {
          let perDay = 1;
          const freq = String(item.frequency || "").trim();
          if (freq.includes("-")) {
            const parts = freq.split("-").map((p) => Number(p.trim()) || 0);
            const sum = parts.reduce((a, b) => a + b, 0);
            if (sum > 0) perDay = sum;
          }
          let days = 5;
          const durMatch = String(item.duration || "").match(/(\d+)/);
          if (durMatch) days = Number(durMatch[1]);
          qty = perDay * days;
          if (qty <= 0) qty = 10;
        }

        await Medicine.findOneAndUpdate(
          { $or: [{ name: medRegex }, { fullName: medRegex }] },
          { $inc: { stock: -qty, quantity: -qty } }
        );
        await Batch.findOneAndUpdate(
          { medicineName: medRegex, quantity: { $gt: 0 } },
          { $inc: { quantity: -qty } },
          { sort: { expiryDate: 1 } }
        );
      }
    }

    res.json(rx);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/prescriptions/:id", async (req, res) => {
  try {
    const result = await Prescription.findOneAndDelete({ id: req.params.id });
    if (!result) return res.status(404).json({ error: "Not found" });
    res.json({ success: true, deleted: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   BATCHES
===================================================== */

app.get("/api/batches", async (req, res) => {
  try {
    const { page = 1, limit = 50, search = "", status = "All" } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { medicineName: { $regex: search, $options: "i" } },
        { batchNumber: { $regex: search, $options: "i" } },
        { supplier: { $regex: search, $options: "i" } },
      ];
    }

    if (status !== "All") query.status = status;

    const total = await Batch.countDocuments(query);
    const batches = await Batch.find(query)
      .sort({ expiryDate: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    res.json({
      batches,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/batches/stats", async (req, res) => {
  try {
    const [total, expiringSoon, expired, lowStock] = await Promise.all([
      Batch.countDocuments(),
      Batch.countDocuments({ status: "Expiring Soon" }),
      Batch.countDocuments({ status: "Expired" }),
      Batch.countDocuments({ quantity: { $lt: 30 } }),
    ]);

    res.json({ total, expiringSoon, expired, lowStock });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/batches/:id", async (req, res) => {
  try {
    const batch = await Batch.findOne({ id: req.params.id });
    if (!batch) return res.status(404).json({ error: "Not found" });
    res.json(batch);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/batches", async (req, res) => {
  try {
    const data = { ...req.body };

    if (!data.id) {
      data.id = `BATCH-${Date.now().toString().slice(-6)}`;
    }

    const existing = await Batch.findOne({ id: data.id });
    if (existing) {
      return res.status(400).json({ error: `Batch ${data.id} already exists` });
    }

    const batch = new Batch(data);
    await batch.save();
    res.status(201).json(batch);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/batches/:id", async (req, res) => {
  try {
    const batch = await Batch.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!batch) return res.status(404).json({ error: "Not found" });
    res.json(batch);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/batches/:id", async (req, res) => {
  try {
    const result = await Batch.findOneAndDelete({ id: req.params.id });
    if (!result) return res.status(404).json({ error: "Not found" });
    res.json({ success: true, deleted: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   PHARMACISTS
===================================================== */

app.get("/api/pharmacists", async (req, res) => {
  try {
    const { search = "", status = "all" } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { license: { $regex: search, $options: "i" } },
        { role: { $regex: search, $options: "i" } },
      ];
    }

    if (status !== "all") query.status = status;

    const pharmacists = await Pharmacist.find(query).sort({ createdAt: -1 }).lean();
    res.json(pharmacists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/pharmacists/stats", async (req, res) => {
  try {
    const [total, active, onLeave, inactive] = await Promise.all([
      Pharmacist.countDocuments(),
      Pharmacist.countDocuments({ status: "active" }),
      Pharmacist.countDocuments({ status: "on-leave" }),
      Pharmacist.countDocuments({ status: "inactive" }),
    ]);

    res.json({ total, active, onLeave, inactive });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/pharmacists/:id", async (req, res) => {
  try {
    const pharmacist = await Pharmacist.findOne({ id: req.params.id });
    if (!pharmacist) return res.status(404).json({ error: "Not found" });
    res.json(pharmacist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/pharmacists", async (req, res) => {
  try {
    const data = { ...req.body };
    if (!data.id) {
      data.id = `PH-${Date.now().toString().slice(-4)}`;
    }

    const pharmacist = new Pharmacist(data);
    await pharmacist.save();
    res.status(201).json(pharmacist);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/pharmacists/:id", async (req, res) => {
  try {
    const pharmacist = await Pharmacist.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!pharmacist) return res.status(404).json({ error: "Not found" });
    res.json(pharmacist);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/pharmacists/:id", async (req, res) => {
  try {
    const result = await Pharmacist.findOneAndDelete({ id: req.params.id });
    if (!result) return res.status(404).json({ error: "Not found" });
    res.json({ success: true, deleted: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   SALES & BILLING (POS)
===================================================== */

app.get("/api/sales", async (req, res) => {
  try {
    const { page = 1, limit = 50, search = "" } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: "i" } },
        { patientName: { $regex: search, $options: "i" } },
      ];
    }
    const total = await Sale.countDocuments(query);
    const sales = await Sale.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    res.json({
      sales,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/sales", async (req, res) => {
  try {
    const data = { ...req.body };
    if (!data.invoiceNumber) {
      data.invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    }

    // Auto deduct items from inventory & batches (FEFO)
    if (Array.isArray(data.items)) {
      for (const item of data.items) {
        const qty = Number(item.quantity) || 1;
        if (item.medicineName) {
          const medRegex = new RegExp(item.medicineName.split(" ")[0], "i");
          await Medicine.findOneAndUpdate(
            { $or: [{ name: medRegex }, { fullName: medRegex }, { code: item.medicineCode }] },
            { $inc: { stock: -qty, quantity: -qty } }
          );
          await Batch.findOneAndUpdate(
            { medicineName: medRegex, quantity: { $gte: qty } },
            { $inc: { quantity: -qty } },
            { sort: { expiryDate: 1 } }
          );
        }
      }
    }

    const sale = new Sale(data);
    await sale.save();
    res.status(201).json(sale);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/sales/stats", async (req, res) => {
  try {
    const [totalSales, totalRevenueAgg] = await Promise.all([
      Sale.countDocuments(),
      Sale.aggregate([
        { $match: { status: "Completed" } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
    ]);

    res.json({
      totalSales,
      totalRevenue: totalRevenueAgg[0]?.total || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   ANALYTICS SUMMARY
===================================================== */

app.get("/api/analytics/summary", async (req, res) => {
  try {
    const [
      totalMedicines,
      lowStockMedicines,
      outOfStockMedicines,
      totalPrescriptions,
      dispensedPrescriptions,
      totalBatches,
      expiringBatches,
      expiredBatches,
      totalSuppliers,
      activeSuppliers,
    ] = await Promise.all([
      Medicine.countDocuments(),
      Medicine.countDocuments({ $expr: { $lt: ["$stock", "$reorderLevel"] } }),
      Medicine.countDocuments({ stock: 0 }),
      Prescription.countDocuments(),
      Prescription.countDocuments({ status: "dispensed" }),
      Batch.countDocuments(),
      Batch.countDocuments({ status: "Expiring Soon" }),
      Batch.countDocuments({ status: "Expired" }),
      Supplier.countDocuments(),
      Supplier.countDocuments({ status: "active" }),
    ]);

    res.json({
      inventory: {
        totalMedicines,
        lowStockMedicines,
        outOfStockMedicines,
        totalBatches,
        expiringBatches,
        expiredBatches,
      },
      prescriptions: {
        total: totalPrescriptions,
        dispensed: dispensedPrescriptions,
        pending: totalPrescriptions - dispensedPrescriptions,
      },
      suppliers: {
        total: totalSuppliers,
        active: activeSuppliers,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   AUTH
===================================================== */

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const pharmacist = await Pharmacist.findOne({ email: email.toLowerCase() });
    const user = {
      id: pharmacist ? pharmacist.id : "USR-" + Date.now().toString().slice(-4),
      name: pharmacist ? pharmacist.name : email.split("@")[0].replace(/\./g, " "),
      email: email.toLowerCase(),
      role: pharmacist ? pharmacist.role : "Chief Pharmacist",
      phone: pharmacist ? pharmacist.phone : "+91 98765 43210",
      license: pharmacist ? pharmacist.license : "TN/PH/2026/001",
    };

    res.json({
      ok: true,
      user,
      token: "jwt-token-" + Date.now(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   START SERVER
===================================================== */

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`   Health: http://localhost:${PORT}/api/health`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });