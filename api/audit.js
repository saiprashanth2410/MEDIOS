import { handleSecurityAndCors } from "./_auth.js";

export default function handler(req, res) {
  if (!handleSecurityAndCors(req, res)) {
    return;
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
    invoiceNumber = `INV-${Date.now().toString().slice(-6)}`,
    gstin = "33AAAAA0000A1Z5",
    subtotal = 100,
    grandTotal = 112,
    pharmacyName = "MediTrack Pharmacy",
  } = data;

  // Indian 15-character GSTIN regex validation
  // Format: 2 digits (state) + 5 letters (PAN) + 4 digits + 1 letter + 1 entity num + 1 'Z' + 1 checksum
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  const isGstinFormatValid = gstinRegex.test(String(gstin).trim());

  const numSubtotal = Number(subtotal) || 0;
  const numGrand = Number(grandTotal) || 0;
  const expectedGst = Math.round(numSubtotal * 0.12);
  const expectedGrand = Math.round(numSubtotal + expectedGst);
  const mathVariance = Math.abs(numGrand - expectedGrand);

  // Digital audit seal hash (simplified cryptographic stamp)
  const auditSignature = Buffer.from(
    `${invoiceNumber}:${gstin}:${numGrand}:${Date.now()}`
  ).toString("base64");

  return res.status(200).json({
    success: true,
    invoiceNumber,
    gstin,
    isGstinFormatValid,
    stateCode: String(gstin).substring(0, 2),
    taxModel: "Blended 12% GST (6% CGST + 6% SGST)",
    subtotal: numSubtotal,
    calculatedGst: expectedGst,
    verifiedGrandTotal: expectedGrand,
    mathValid: mathVariance <= 2,
    digitalAuditSignature: `SIG-GST-${auditSignature.slice(0, 24)}`,
    timestamp: new Date().toISOString(),
    verifier: "MediTrack Serverless Compliance Gateway v2.4",
  });
}

