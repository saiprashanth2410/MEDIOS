import { GoogleGenerativeAI } from "@google/generative-ai";
import { getGeminiApiKey } from "../services/aiService";

const VALID_CATEGORIES = [
  "Antibiotic",
  "Analgesic",
  "Antidiabetic",
  "Antihistamine",
  "Antiseptic",
  "Cardiac",
  "Other",
];

function getActiveModel() {
  const key = getGeminiApiKey();
  if (key && key.trim().length > 10) {
    try {
      const genAI = new GoogleGenerativeAI(key.trim());
      return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    } catch (err) {
      console.error("❌ Gemini init failed:", err.message);
      return null;
    }
  }
  return null;
}

/* =====================================================
   SINGLE MEDICINE AI DETECTION
   (Only for Add Medicine — NOT for initial 500)
===================================================== */

export async function detectCategoryWithAI(name, generic = "") {
  const model = getActiveModel();
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

export async function detectCategoryBatch() {
  console.log("🔴 Batch AI disabled — using local keywords only");
  return {};
}