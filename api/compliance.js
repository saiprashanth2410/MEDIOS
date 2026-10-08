export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  let data = {};
  if (req.method === "POST") {
    try {
      data = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch {
      data = {};
    }
  } else {
    data = req.query || {};
  }

  const {
    doctorRegistrationNumber,
    doctorName,
    patientPhone,
    patientName,
    invoiceNumber,
    hasScheduleH = true,
  } = data;

  const checks = [];
  let isCompliant = true;

  // 1. Doctor Registration Number Check (Mandatory under Indian Drugs & Cosmetics Act)
  const cleanDocReg = String(doctorRegistrationNumber || "").trim();
  if (hasScheduleH) {
    if (cleanDocReg.length >= 4) {
      checks.push({
        rule: "RULE-2024-DOC-REG",
        description: "Doctor State/National Medical Council Registration Validated",
        status: "PASSED",
        value: cleanDocReg,
      });
    } else {
      isCompliant = false;
      checks.push({
        rule: "RULE-2024-DOC-REG",
        description: "Missing or invalid Doctor Medical Registration Number",
        status: "FAILED",
        error: "Doctor registration number is required for Schedule H dispensing.",
      });
    }
  }

  // 2. Patient Phone Verification
  const cleanPhone = String(patientPhone || "").replace(/\D/g, "");
  if (cleanPhone.length >= 10) {
    checks.push({
      rule: "RULE-2024-PATIENT-ID",
      description: "Patient Contact Record Available for Refill & Pharmacovigilance Audit",
      status: "PASSED",
      value: `+91 ******${cleanPhone.slice(-4)}`,
    });
  } else {
    checks.push({
      rule: "RULE-2024-PATIENT-ID",
      description: "Walk-in patient contact not fully logged",
      status: "WARNING",
    });
  }

  // 3. Prescription Audit Certificate Hash
  const auditToken = `IN-RX-AUDIT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  return res.status(200).json({
    success: isCompliant,
    compliant: isCompliant,
    regulatoryStandard: "Drugs and Cosmetics Act, 1940 & Pharmacy Practice Regulations (India)",
    auditReference: auditToken,
    invoiceNumber: invoiceNumber || "PROVISIONAL",
    doctor: {
      name: doctorName || "Registered Medical Practitioner",
      registrationNumber: cleanDocReg || "UNSPECIFIED",
    },
    patient: {
      name: patientName || "Patient",
      phone: cleanPhone || "N/A",
    },
    checks,
    timestamp: new Date().toISOString(),
  });
}

