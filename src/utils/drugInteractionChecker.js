/**
 * Drug-Drug Interaction (DDI) & Clinical Overdose Engine
 * Specifically tuned for Indian retail & hospital pharmacy practice.
 */

const DRUG_CLASSES = {
  PARACETAMOL: ["paracetamol", "acetaminophen", "dolo", "calpol", "crocin", "pacimol", "pyregesic", "combiflam", "sumo"],
  NSAID: ["ibuprofen", "diclofenac", "aceclofenac", "naproxen", "ketorolac", "piroxicam", "mefenamic", "combiflam", "voveran", "zerodol", "hifenac"],
  BLOOD_THINNER: ["aspirin", "ecosprin", "clopidogrel", "clopilet", "warfarin", "acitrom", "heparin", "dabigatran", "apixaban", "rivaroxaban"],
  NITRATE: ["sorbitrate", "monotrate", "isosorbide", "nitroglycerin", "angispan", "nitrocontin"],
  PDE5_INHIBITOR: ["sildenafil", "tadalafil", "manforce", "caverta", "megalis"],
  FLUOROQUINOLONE: ["ciprofloxacin", "ciprobid", "ciplox", "levofloxacin", "levomac", "ofloxacin", "zenflox", "norfloxacin", "norbactin"],
  ANTACID_CALCIUM: ["gelusil", "digene", "sucralfate", "sucrafil", "calcium", "shelcal", "antacid", "aluminum hydroxide", "magnesium"],
  ACE_ARB: ["telmisartan", "telma", "losartan", "losar", "ramipril", "cardace", "enalapril", "olmesartan"],
  POTASSIUM_SPARING: ["spironolactone", "aldactone", "eplerenone", "triamterene"],
  STATIN: ["atorvastatin", "atorva", "atorlip", "rosuvastatin", "rosuvas", "rosave", "simvastatin"],
  MACROLIDE: ["clarithromycin", "claribid", "erythromycin", "erythrocin", "azithromycin", "azithral"],
  BENZO_SEDATIVE: ["alprazolam", "alprax", "restyl", "clonazepam", "clona", "diazepam", "lorazepam", "ativan"],
  SEDATING_ANTIHISTAMINE: ["cetirizine", "cetzine", "levocetirizine", "levocet", "chlorpheniramine", "cpm", "diphenhydramine", "hydroxyzine", "atarax", "corex", "ascoril"],
  PPI: ["pantoprazole", "pan 40", "pan d", "pantocid", "omeprazole", "omez", "rabeprazole", "rabicer", "rabemac", "esomeprazole", "nexpro"],
  METFORMIN: ["metformin", "glycomet", "gluconorm", "gliphage"],
};

function matchDrugClass(itemName, genericName, classList) {
  const combined = `${itemName || ""} ${genericName || ""}`.toLowerCase();
  return classList.some((keyword) => combined.includes(keyword.toLowerCase()));
}

export function checkDrugInteractions(cartItems = []) {
  if (!Array.isArray(cartItems) || cartItems.length < 2) {
    return [];
  }

  const alerts = [];

  // Helper to test pairs
  for (let i = 0; i < cartItems.length; i++) {
    for (let j = i + 1; j < cartItems.length; j++) {
      const itemA = cartItems[i];
      const itemB = cartItems[j];

      // 1. Nitrates + PDE5 Inhibitors (CRITICAL)
      const isNitrateA = matchDrugClass(itemA.name, itemA.generic, DRUG_CLASSES.NITRATE);
      const isNitrateB = matchDrugClass(itemB.name, itemB.generic, DRUG_CLASSES.NITRATE);
      const isPde5A = matchDrugClass(itemA.name, itemA.generic, DRUG_CLASSES.PDE5_INHIBITOR);
      const isPde5B = matchDrugClass(itemB.name, itemB.generic, DRUG_CLASSES.PDE5_INHIBITOR);

      if ((isNitrateA && isPde5B) || (isNitrateB && isPde5A)) {
        alerts.push({
          id: `ddi-nitrate-pde5-${i}-${j}`,
          severity: "CRITICAL",
          drugA: itemA.name,
          drugB: itemB.name,
          title: "Fatal Hypotension Risk (ஆபத்தான குறைந்த ரத்த அழுத்தம்)",
          messageEn: `Combining Nitrates (${isNitrateA ? itemA.name : itemB.name}) and Sildenafil/Tadalafil (${isPde5A ? itemA.name : itemB.name}) can cause a catastrophic, life-threatening drop in blood pressure. Contraindicated.`,
          messageTa: `நைட்ரேட் மற்றும் சில்டெனாபில் மாத்திரைகளை ஒன்றாக உட்கொள்வது உயிருக்கே ஆபத்தான தீவிர ரத்த அழுத்த வீழ்ச்சியை (Sudden Collapse) உண்டாக்கும். கொடுக்கக்கூடாது!`,
        });
      }

      // 2. Blood Thinners + NSAIDs (HIGH RISK)
      const isBloodThinnerA = matchDrugClass(itemA.name, itemA.generic, DRUG_CLASSES.BLOOD_THINNER);
      const isBloodThinnerB = matchDrugClass(itemB.name, itemB.generic, DRUG_CLASSES.BLOOD_THINNER);
      const isNsaidA = matchDrugClass(itemA.name, itemA.generic, DRUG_CLASSES.NSAID);
      const isNsaidB = matchDrugClass(itemB.name, itemB.generic, DRUG_CLASSES.NSAID);

      if ((isBloodThinnerA && isNsaidB) || (isBloodThinnerB && isNsaidA)) {
        alerts.push({
          id: `ddi-thinner-nsaid-${i}-${j}`,
          severity: "HIGH",
          drugA: itemA.name,
          drugB: itemB.name,
          title: "Severe GI Bleeding Risk (தீவிர இரைப்பை ரத்தப்போக்கு அபாயம்)",
          messageEn: `Combining Antiplatelet/Blood Thinner (${isBloodThinnerA ? itemA.name : itemB.name}) with NSAID painkiller (${isNsaidA ? itemA.name : itemB.name}) significantly increases gastric ulceration and gastrointestinal hemorrhage risk.`,
          messageTa: `ரத்தத்தை நீர்க்க வைக்கும் மாத்திரையுடன் வலி நிவாரணி (NSAID) கொடுப்பது குடல் அல்சர் மற்றும் உட்புற ரத்தப்போக்கு அபாயத்தை பலமடங்கு அதிகரிக்கும். மருத்துவரிடம் ஆலோசிக்கவும்.`,
        });
      }

      // 3. Duplicate Paracetamol / Toxicity (> 4000mg/day liver danger)
      const isParacetamolA = matchDrugClass(itemA.name, itemA.generic, DRUG_CLASSES.PARACETAMOL);
      const isParacetamolB = matchDrugClass(itemB.name, itemB.generic, DRUG_CLASSES.PARACETAMOL);

      if (isParacetamolA && isParacetamolB) {
        alerts.push({
          id: `ddi-duplicate-pcm-${i}-${j}`,
          severity: "HIGH",
          drugA: itemA.name,
          drugB: itemB.name,
          title: "Duplicate Paracetamol / Hepatotoxicity Risk (கல்லீரல் பாதிப்பு & ஓவர்டோஸ் அபாயம்)",
          messageEn: `Both "${itemA.name}" and "${itemB.name}" contain Paracetamol/Acetaminophen. Taking both concurrently risks toxic overdose exceeding 4000mg/day, leading to acute liver failure.`,
          messageTa: `இரண்டு மருந்துகளிலுமே பாராசிட்டமால் உள்ளது. இரண்டையும் ஒன்றாக சாப்பிட்டால் பாராசிட்டமால் அளவு மிதமிஞ்சி கல்லீரலுக்கு தீவிர பாதிப்பு ஏற்படும்!`,
        });
      }

      // 4. Duplicate NSAID Painkillers (Ulcer / Kidney failure)
      if (isNsaidA && isNsaidB && !isParacetamolA && !isParacetamolB) {
        alerts.push({
          id: `ddi-duplicate-nsaid-${i}-${j}`,
          severity: "MODERATE",
          drugA: itemA.name,
          drugB: itemB.name,
          title: "Duplicate NSAID Painkillers (இரட்டை வலி நிவாரணி எச்சரிக்கை)",
          messageEn: `Both "${itemA.name}" and "${itemB.name}" are NSAID painkillers. Concurrent use increases acute kidney injury and stomach erosion without added pain relief.`,
          messageTa: `இரண்டுமே வலி நிவாரணிகள் (NSAIDs). இரண்டையும் ஒன்றாக கொடுப்பதால் சிறுநீரகம் மற்றும் இரைப்பை பாதிக்கப்படலாம். ஒன்றை மட்டும் தேர்வு செய்யவும்.`,
        });
      }

      // 5. Duplicate PPI Acid Suppressants
      const isPpiA = matchDrugClass(itemA.name, itemA.generic, DRUG_CLASSES.PPI);
      const isPpiB = matchDrugClass(itemB.name, itemB.generic, DRUG_CLASSES.PPI);
      if (isPpiA && isPpiB) {
        alerts.push({
          id: `ddi-duplicate-ppi-${i}-${j}`,
          severity: "MODERATE",
          drugA: itemA.name,
          drugB: itemB.name,
          title: "Duplicate Acid Suppressant (இரட்டை அல்சர் மாத்திரை)",
          messageEn: `Both "${itemA.name}" and "${itemB.name}" are Proton Pump Inhibitors (PPIs). Only one acid blocker is clinically necessary.`,
          messageTa: `இரண்டுமே அல்சர்/அமிலத்தன்மை குறைக்கும் மருந்துகள் (PPIs). ஒன்று மட்டுமே போதுமானது.`,
        });
      }

      // 6. Fluoroquinolones + Antacids / Calcium (Chelation blocks absorption)
      const isQuinoloneA = matchDrugClass(itemA.name, itemA.generic, DRUG_CLASSES.FLUOROQUINOLONE);
      const isQuinoloneB = matchDrugClass(itemB.name, itemB.generic, DRUG_CLASSES.FLUOROQUINOLONE);
      const isAntacidA = matchDrugClass(itemA.name, itemA.generic, DRUG_CLASSES.ANTACID_CALCIUM);
      const isAntacidB = matchDrugClass(itemB.name, itemB.generic, DRUG_CLASSES.ANTACID_CALCIUM);

      if ((isQuinoloneA && isAntacidB) || (isQuinoloneB && isAntacidA)) {
        alerts.push({
          id: `ddi-chelation-${i}-${j}`,
          severity: "MODERATE",
          drugA: itemA.name,
          drugB: itemB.name,
          title: "Antibiotic Absorption Failure (ஆன்டிபயாடிக் வேலை செய்யாது)",
          messageEn: `Antacids/Calcium (${isAntacidA ? itemA.name : itemB.name}) bind with Fluoroquinolones (${isQuinoloneA ? itemA.name : itemB.name}), reducing antibiotic absorption by up to 90%. Space doses by at least 2 hours.`,
          messageTa: `ஜெலுசில்/ஆன்டாசிட் மற்றும் சிப்ரோஃப்ளோக்சசின் போன்றவற்றை ஒன்றாக உட்கொண்டால், ஆன்டிபயாடிக் மருந்து உடலில் உறிஞ்சப்படாமல் வீணாகிவிடும். 2 மணி நேர இடைவெளி தேவை.`,
        });
      }

      // 7. ACE Inhibitor/ARB + Potassium-Sparing Diuretic (Hyperkalemia)
      const isAceA = matchDrugClass(itemA.name, itemA.generic, DRUG_CLASSES.ACE_ARB);
      const isAceB = matchDrugClass(itemB.name, itemB.generic, DRUG_CLASSES.ACE_ARB);
      const isKSparedA = matchDrugClass(itemA.name, itemA.generic, DRUG_CLASSES.POTASSIUM_SPARING);
      const isKSparedB = matchDrugClass(itemB.name, itemB.generic, DRUG_CLASSES.POTASSIUM_SPARING);

      if ((isAceA && isKSparedB) || (isAceB && isKSparedA)) {
        alerts.push({
          id: `ddi-hyperkalemia-${i}-${j}`,
          severity: "HIGH",
          drugA: itemA.name,
          drugB: itemB.name,
          title: "Dangerous Hyperkalemia Risk (உயர்ந்த பொட்டாசியம் அபாயம்)",
          messageEn: `Combining Telmisartan/ACE-inhibitor (${isAceA ? itemA.name : itemB.name}) with Spironolactone (${isKSparedA ? itemA.name : itemB.name}) causes dangerous potassium retention (arrhythmia risk). Serum K+ monitoring required.`,
          messageTa: `டெல்மிசார்டன் மற்றும் ஸ்பைரோனோலாக்டோன் ஒன்றாக எடுக்கும்போது ரத்தத்தில் பொட்டாசியம் அளவு அளவுக்கு அதிகமாக உயர்ந்து இதய துடிப்பில் மாறுபாடு ஏற்படலாம்.`,
        });
      }

      // 8. Statin + Clarithromycin (Severe Myopathy / Rhabdomyolysis)
      const isStatinA = matchDrugClass(itemA.name, itemA.generic, DRUG_CLASSES.STATIN);
      const isStatinB = matchDrugClass(itemB.name, itemB.generic, DRUG_CLASSES.STATIN);
      const isMacrolideA = matchDrugClass(itemA.name, itemA.generic, DRUG_CLASSES.MACROLIDE);
      const isMacrolideB = matchDrugClass(itemB.name, itemB.generic, DRUG_CLASSES.MACROLIDE);

      if ((isStatinA && isMacrolideB) || (isStatinB && isMacrolideA)) {
        alerts.push({
          id: `ddi-statin-macro-${i}-${j}`,
          severity: "HIGH",
          drugA: itemA.name,
          drugB: itemB.name,
          title: "Severe Muscle Damage Risk / Rhabdomyolysis (தசை சிதைவு அபாயம்)",
          messageEn: `Macrolides (${isMacrolideA ? itemA.name : itemB.name}) inhibit CYP3A4 metabolism of Statins (${isStatinA ? itemA.name : itemB.name}), multiplying statin blood levels and causing severe muscle breakdown (Rhabdomyolysis).`,
          messageTa: `கொலஸ்ட்ரால் மாத்திரையுடன் கிளாரித்ரோமைசின் சேர்த்தால் தசை சிதைவு மற்றும் கடுமையான தசை வலி (Myopathy) ஏற்படும் அபாயம் உள்ளது.`,
        });
      }

      // 9. Benzo Sedatives + Sedating Antihistamines (Severe CNS/Respiratory Depression)
      const isBenzoA = matchDrugClass(itemA.name, itemA.generic, DRUG_CLASSES.BENZO_SEDATIVE);
      const isBenzoB = matchDrugClass(itemB.name, itemB.generic, DRUG_CLASSES.BENZO_SEDATIVE);
      const isAntihistA = matchDrugClass(itemA.name, itemA.generic, DRUG_CLASSES.SEDATING_ANTIHISTAMINE);
      const isAntihistB = matchDrugClass(itemB.name, itemB.generic, DRUG_CLASSES.SEDATING_ANTIHISTAMINE);

      if ((isBenzoA && isAntihistB) || (isBenzoB && isAntihistA)) {
        alerts.push({
          id: `ddi-cns-depression-${i}-${j}`,
          severity: "HIGH",
          drugA: itemA.name,
          drugB: itemB.name,
          title: "Extreme Sedation & Respiratory Depression (அதி தீவிர தூக்கம் & மூச்சுத்திணறல்)",
          messageEn: `Combining Sedatives (${isBenzoA ? itemA.name : itemB.name}) and Sedating Antihistamines/Cough syrups (${isAntihistA ? itemA.name : itemB.name}) severely impairs central nervous system and breathing reflex.`,
          messageTa: `தூக்க மாத்திரையுடன் சளி/அலர்ஜி மாத்திரையை ஒன்றாக சாப்பிட்டால் அதீத மயக்கம், தூக்கம் மற்றும் மூச்சுத்திணறல் ஏற்படும் அபாயம் உள்ளது.`,
        });
      }
    }
  }

  return alerts;
}
