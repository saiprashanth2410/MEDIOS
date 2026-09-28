require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Supplier = require("./models/Supplier");
const Medicine = require("./models/Medicine");
const Prescription = require("./models/Prescription");
const Batch = require("./models/Batch");

const app = express();
const PORT = process.env.PORT || 5001;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/meditrack";

/* =====================================================
   CORS CONFIGURATION — Allow any localhost port
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
        { composition: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
        { supplierName: { $regex: search, $options: "i" } },
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
    const medicine = await Medicine.findOne({ code: req.params.code });
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
    const medicine = await Medicine.findOneAndUpdate(
      { code: req.params.code },
      req.body,
      { new: true, runValidators: true }
    );
    if (!medicine) return res.status(404).json({ error: "Not found" });
    res.json(medicine);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/medicines/:code", async (req, res) => {
  try {
    const result = await Medicine.findOneAndDelete({ code: req.params.code });
    if (!result) return res.status(404).json({ error: "Not found" });
    res.json({ success: true, deleted: result });
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
   START
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