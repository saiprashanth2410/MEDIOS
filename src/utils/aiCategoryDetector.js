import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const VALID_CATEGORIES = [
  "Antibiotic",
  "Analgesic",
  "Antidiabetic",
  "Antihistamine",
  "Antiseptic",
  "Cardiac",
  "Other",
];

let model = null;

if (API_KEY && API_KEY.length > 20) {
  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log("✅ Gemini AI ready (for Add Medicine only)");
  } catch (err) {
    console.error("❌ Gemini init failed:", err.message);
  }
} else {
  console.warn("⚠️ VITE_GEMINI_API_KEY not set");
}

/* =====================================================
   SINGLE MEDICINE AI DETECTION
   (Only for Add Medicine — NOT for initial 500)
===================================================== */

export async function detectCategoryWithAI(name, generic = "") {
  if (!model) {
    console.warn("⚠️ AI not available → Other");
    return "Other";
  }

  try {
    const prompt = `You are a pharmacy classification assistant.

Classify the medicine into EXACTLY ONE of these categories:
Antibiotic, Analgesic, Antidiabetic, Antihistamine, Antiseptic, Cardiac, Other

Medicine Name: "${name}"
Generic Name: "${generic}"

Reply with ONLY the category name (one word). No explanation.

Category:`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const cleaned = text.replace(/[^a-zA-Z]/g, "").trim();

    const matched = VALID_CATEGORIES.find(
      (cat) => cat.toLowerCase() === cleaned.toLowerCase()
    );

    if (matched) {
      console.log(`🤖 "${name}" → ${matched}`);
      return matched;
    }

    console.warn(`⚠️ Invalid AI response: "${text}" for "${name}"`);
    return "Other";
  } catch (err) {
    console.error(`❌ AI error for "${name}":`, err.message);
    return "Other";
  }
}

/* =====================================================
   BATCH DETECTION (kept for backward compat — not used)
===================================================== */

export async function detectCategoryBatch(medicines) {
  console.log("🔴 Batch AI disabled — using local keywords only");
  return {};
}