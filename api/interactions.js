const DRUG_CLASSES = {
  PARACETAMOL: [
    "paracetamol", "acetaminophen", "dolo", "calpol", "crocin", "pacimol",
    "pyregesic", "combiflam", "sumo", "febrex", "p-650", "panadol", "paracip"
  ],
  NSAID: [
    "ibuprofen", "diclofenac", "aceclofenac", "naproxen", "ketorolac",
    "piroxicam", "mefenamic", "indomethacin", "combiflam", "voveran",
    "zerodol", "hifenac", "meftal", "brufen", "dynapar"
  ],
  BLOOD_THINNER: [
    "aspirin", "ecosprin", "clopidogrel", "clopilet", "deplatt", "warfarin",
    "acitrom", "heparin", "dabigatran", "apixaban", "eliquis", "rivaroxaban", "xarelto"
  ],
  CLOPIDOGREL: ["clopidogrel", "clopilet", "deplatt", "ceruvit", "noklot"],
  NITRATE: [
    "sorbitrate", "monotrate", "isosorbide", "nitroglycerin", "angispan",
    "nitrocontin", "imdur"
  ],
  PDE5_INHIBITOR: [
    "sildenafil", "tadalafil", "vardenafil", "manforce", "caverta", "megalis", "suhagra"
  ],
  FLUOROQUINOLONE: [
    "ciprofloxacin", "ciprobid", "ciplox", "levofloxacin", "levomac",
    "ofloxacin", "zenflox", "norfloxacin", "norbactin", "moxifloxacin", "avelox", "maflo"
  ],
  ANTACID_CALCIUM: [
    "gelusil", "digene", "sucralfate", "sucrafil", "calcium", "shelcal",
    "antacid", "aluminum hydroxide", "magnesium hydroxide", "omee mps", "cipcal"
  ],
  ACE_ARB: [
    "telmisartan", "telma", "losartan", "losar", "ramipril", "cardace",
    "enalapril", "olmesartan", "valsartan", "candesartan", "envas"
  ],
  POTASSIUM_SPARING: [
    "spironolactone", "aldactone", "eplerenone", "planep", "triamterene", "amiloride"
  ],
  STATIN: [
    "atorvastatin", "atorva", "atorlip", "rosuvastatin", "rosuvas", "rosave",
    "simvastatin", "pravastatin", "lipitor", "crestor"
  ],
  MACROLIDE: [
    "clarithromycin", "claribid", "erythromycin", "erythrocin", "azithromycin",
    "azithral", "roxithromycin", "zady"
  ],
  BENZO_SEDATIVE: [
    "alprazolam", "alprax", "restyl", "clonazepam", "clona", "lonazep",
    "diazepam", "valium", "lorazepam", "ativan", "zolpidem", "nitrazepam"
  ],
  SEDATING_ANTIHISTAMINE: [
    "cetirizine", "cetzine", "levocetirizine", "levocet", "chlorpheniramine",
    "cpm", "diphenhydramine", "hydroxyzine", "atarax", "pheniramine", "avil",
    "promethazine", "phenergan", "corex", "ascoril", "grilinctus"
  ],
  PPI: [
    "pantoprazole", "pan 40", "pan d", "pantocid", "omeprazole", "omez",
    "rabeprazole", "rabicer", "rabemac", "esomeprazole", "nexpro", "lansoprazole"
  ],
  OMEPRAZOLE_ESOMEPRAZOLE: ["omeprazole", "omez", "esomeprazole", "nexpro", "esomac"],
  AZOLE_ANTIFUNGAL: [
    "fluconazole", "flucos", "zocon", "forcan", "itraconazole", "itrasys",
    "canditral", "ketoconazole", "nizral", "voriconazole"
  ],
  METHOTREXATE: ["methotrexate", "folitrax", "imutrex", "oncotrex"],
  DIGOXIN: ["digoxin", "lanoxin", "digicor"],
  ANTIARRHYTHMIC_CCB: ["amiodarone", "cordarone", "verapamil", "calaptin", "diltiazem", "dilzem"],
  SSRI_ANTIDEPRESSANT: [
    "fluoxetine", "fludac", "sertraline", "daxid", "escitalopram", "nexito",
    "cipralex", "paroxetine", "fluvoxamine"
  ],
  TRAMADOL_OPIOID: [
    "tramadol", "ultram", "tramacip", "contramal", "ultracet", "codeine",
    "codistar", "morphine", "fentanyl"
  ],
  LITHIUM: ["lithium", "licab", "lithosun"],
  ALLOPURINOL: ["allopurinol", "zyloric", "purinol"],
  AZATHIOPRINE: ["azathioprine", "azoran", "imuran", "6-mercaptopurine", "purinethol"],
  CORTICOSTEROID: [
    "prednisolone", "wysolone", "omnacortil", "dexamethasone", "dexona",
    "betamethasone", "betnesol", "methylprednisolone", "medrol", "hydrocortisone"
  ],
  FIBRATE: ["gemfibrozil", "lopid", "fenofibrate", "lipicard", "fenolip"],
  BETA_BLOCKER: [
    "atenolol", "aten", "betacard", "metoprolol", "betaloc", "metolar",
    "propranolol", "ciplar", "carvedilol", "carca", "bisoprolol", "concor", "labetalol"
  ],
  LINEZOLID: ["linezolid", "lizomac", "linid", "lizolid"],
};

function matchDrugClass(itemName, genericName, classList) {
  const combined = `${itemName || ""} ${genericName || ""}`.toLowerCase();
  return classList.some((keyword) => combined.includes(keyword.toLowerCase()));
}

import { handleSecurityAndCors } from "./_auth.js";

export default function handler(req, res) {
  if (!handleSecurityAndCors(req, res)) {
    return;
  }

  let cartItems = [];
  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      cartItems = Array.isArray(body?.medicines) ? body.medicines : [];
    } catch {
      cartItems = [];
    }
  } else if (req.query?.drugs) {
    cartItems = String(req.query.drugs)
      .split(",")
      .map((name) => ({ name: name.trim(), generic: name.trim() }));
  }

  if (cartItems.length < 2) {
    return res.status(200).json({
      success: true,
      evaluatedDrugsCount: cartItems.length,
      totalInteractions: 0,
      riskTier: "LOW",
      alerts: [],
      timestamp: new Date().toISOString(),
      note: "Provide at least 2 medicines via POST { medicines: [{ name, generic }] } to evaluate interactions.",
    });
  }

  const alerts = [];

  for (let i = 0; i < cartItems.length; i++) {
    for (let j = i + 1; j < cartItems.length; j++) {
      const itemA = cartItems[i];
      const itemB = cartItems[j];

      const matchA = (cls) => matchDrugClass(itemA.name, itemA.generic, cls);
      const matchB = (cls) => matchDrugClass(itemB.name, itemB.generic, cls);

      const checkPair = (cls1, cls2) => {
        const a1 = matchA(cls1);
        const b2 = matchB(cls2);
        if (a1 && b2) return { match: true, first: itemA, second: itemB };
        const a2 = matchA(cls2);
        const b1 = matchB(cls1);
        if (a2 && b1) return { match: true, first: itemB, second: itemA };
        return { match: false };
      };

      // 1. Nitrates + PDE5
      const rNitrate = checkPair(DRUG_CLASSES.NITRATE, DRUG_CLASSES.PDE5_INHIBITOR);
      if (rNitrate.match) {
        alerts.push({
          id: `ddi-nitrate-pde5-${i}-${j}`,
          severity: "CRITICAL",
          drugA: itemA.name,
          drugB: itemB.name,
          mechanism: "Synergistic cGMP accumulation causing profound systemic vasodilation",
          title: "Fatal Hypotension Risk",
          messageEn: `Combining Nitrates (${rNitrate.first.name}) and Sildenafil/Tadalafil (${rNitrate.second.name}) causes a catastrophic drop in blood pressure. Contraindicated.`,
        });
      }

      // 2. Blood Thinners + Azoles
      const rThinnerAzole = checkPair(DRUG_CLASSES.BLOOD_THINNER, DRUG_CLASSES.AZOLE_ANTIFUNGAL);
      if (rThinnerAzole.match) {
        alerts.push({
          id: `ddi-thinner-azole-${i}-${j}`,
          severity: "CRITICAL",
          drugA: itemA.name,
          drugB: itemB.name,
          mechanism: "CYP2C9 enzyme inhibition causes spike in anticoagulant levels",
          title: "Severe Hemorrhage / Bleeding Danger",
          messageEn: `Azoles (${rThinnerAzole.second.name}) inhibit the metabolism of Blood Thinners (${rThinnerAzole.first.name}), causing dangerous bleeding.`,
        });
      }

      // 3. Methotrexate + NSAID/PPI
      const rMtx = checkPair(DRUG_CLASSES.METHOTREXATE, DRUG_CLASSES.NSAID);
      if (rMtx.match) {
        alerts.push({
          id: `ddi-mtx-nsaid-${i}-${j}`,
          severity: "CRITICAL",
          drugA: itemA.name,
          drugB: itemB.name,
          mechanism: "Inhibition of renal OAT3 transporters reduces Methotrexate clearance",
          title: "Fatal Bone Marrow Suppression",
          messageEn: `Combining Methotrexate with NSAIDs decreases renal clearance of MTX, causing pancytopenia and organ toxicity.`,
        });
      }

      // 4. Blood Thinner + NSAID
      const rThinnerNsaid = checkPair(DRUG_CLASSES.BLOOD_THINNER, DRUG_CLASSES.NSAID);
      if (rThinnerNsaid.match) {
        alerts.push({
          id: `ddi-thinner-nsaid-${i}-${j}`,
          severity: "HIGH",
          drugA: itemA.name,
          drugB: itemB.name,
          mechanism: "Antiplatelet action combined with gastric mucosal erosion and COX inhibition",
          title: "Severe GI Bleeding Risk",
          messageEn: `Combining Blood Thinners with NSAIDs increases gastrointestinal hemorrhage risk.`,
        });
      }

      // 5. Paracetamol Duplicate
      if (matchA(DRUG_CLASSES.PARACETAMOL) && matchB(DRUG_CLASSES.PARACETAMOL)) {
        alerts.push({
          id: `ddi-duplicate-pcm-${i}-${j}`,
          severity: "HIGH",
          drugA: itemA.name,
          drugB: itemB.name,
          mechanism: "Glutathione depletion via toxic NAPQI metabolite accumulation",
          title: "Duplicate Paracetamol / Hepatotoxicity Risk",
          messageEn: `Both "${itemA.name}" and "${itemB.name}" contain Paracetamol. Concurrent use risks exceeding the 4000mg/day safe threshold.`,
        });
      }
    }
  }

  const critical = alerts.filter((a) => a.severity === "CRITICAL").length;
  const high = alerts.filter((a) => a.severity === "HIGH").length;
  const riskTier = critical > 0 ? "CRITICAL" : high > 0 ? "HIGH" : alerts.length > 0 ? "MODERATE" : "LOW";

  return res.status(200).json({
    success: true,
    evaluatedDrugsCount: cartItems.length,
    totalInteractions: alerts.length,
    riskTier,
    alerts,
    timestamp: new Date().toISOString(),
  });
}

