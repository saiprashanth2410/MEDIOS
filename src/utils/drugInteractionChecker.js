/**
 * Comprehensive Clinical Drug-Drug Interaction (DDI) & Patient Safety Engine
 * Built for Indian Retail & Hospital Pharmacy Practice.
 * Covers Pharmacokinetic, Pharmacodynamic, Enzyme (CYP450), and Clinical Toxicity Interactions.
 */

export const DRUG_CLASSES = {
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
  CLOPIDOGREL: [
    "clopidogrel", "clopilet", "deplatt", "ceruvit", "noklot"
  ],
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
  OMEPRAZOLE_ESOMEPRAZOLE: [
    "omeprazole", "omez", "esomeprazole", "nexpro", "esomac"
  ],
  METFORMIN: [
    "metformin", "glycomet", "gluconorm", "gliphage", "obimet", "janumet"
  ],
  AZOLE_ANTIFUNGAL: [
    "fluconazole", "flucos", "zocon", "forcan", "itraconazole", "itrasys",
    "canditral", "ketoconazole", "nizral", "voriconazole"
  ],
  METHOTREXATE: [
    "methotrexate", "folitrax", "imutrex", "oncotrex"
  ],
  DIGOXIN: [
    "digoxin", "lanoxin", "digicor"
  ],
  ANTIARRHYTHMIC_CCB: [
    "amiodarone", "cordarone", "verapamil", "calaptin", "diltiazem", "dilzem"
  ],
  SSRI_ANTIDEPRESSANT: [
    "fluoxetine", "fludac", "sertraline", "daxid", "escitalopram", "nexito",
    "cipralex", "paroxetine", "fluvoxamine"
  ],
  TRAMADOL_OPIOID: [
    "tramadol", "ultram", "tramacip", "contramal", "ultracet", "codeine",
    "codistar", "morphine", "fentanyl"
  ],
  LITHIUM: [
    "lithium", "licab", "lithosun"
  ],
  ALLOPURINOL: [
    "allopurinol", "zyloric", "purinol"
  ],
  AZATHIOPRINE: [
    "azathioprine", "azoran", "imuran", "6-mercaptopurine", "purinethol"
  ],
  CORTICOSTEROID: [
    "prednisolone", "wysolone", "omnacortil", "dexamethasone", "dexona",
    "betamethasone", "betnesol", "methylprednisolone", "medrol", "hydrocortisone"
  ],
  FIBRATE: [
    "gemfibrozil", "lopid", "fenofibrate", "lipicard", "fenolip"
  ],
  BETA_BLOCKER: [
    "atenolol", "aten", "betacard", "metoprolol", "betaloc", "metolar",
    "propranolol", "ciplar", "carvedilol", "carca", "bisoprolol", "concor", "labetalol"
  ],
  ORAL_CONTRACEPTIVE: [
    "ethinylestradiol", "mala-d", "saheli", "femilon", "ovral", "levonorgestrel", "ipill"
  ],
  CYP_INDUCER_ANTIEPILEPTIC: [
    "rifampicin", "r-cin", "carbamazepine", "tegretol", "mazetol",
    "phenytoin", "eptoin", "phenobarbital"
  ],
  THEOPHYLLINE: [
    "theophylline", "deriphyllin", "theoped", "aminophylline"
  ],
  THYROID_HORMONE: [
    "levothyroxine", "eltroxin", "thyronorm", "thyrox"
  ],
  ORAL_IRON: [
    "ferrous", "autrin", "dexorange", "fefol", "orofer", "hepcil", "iron"
  ],
  SULFONYLUREA: [
    "glimepiride", "amaryl", "glemep", "gliclazide", "diamicron",
    "glipizide", "glybovin", "glibenclamide", "daonil"
  ],
  LINEZOLID: [
    "linezolid", "lizomac", "linid", "lizolid"
  ],
  METRONIDAZOLE: [
    "metronidazole", "flagyl", "metrogyl", "ornidazole"
  ],
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

      // 1. NITRATES + PDE5 INHIBITORS (CRITICAL - Life Threatening)
      const rNitratePde5 = checkPair(DRUG_CLASSES.NITRATE, DRUG_CLASSES.PDE5_INHIBITOR);
      if (rNitratePde5.match) {
        alerts.push({
          id: `ddi-nitrate-pde5-${i}-${j}`,
          severity: "CRITICAL",
          drugA: itemA.name,
          drugB: itemB.name,
          mechanism: "Synergistic cGMP accumulation causing profound systemic vasodilation",
          clinicalAction: "Absolute Contraindication. Do NOT dispense concurrently.",
          title: "Fatal Hypotension Risk",
          messageEn: `Combining Nitrates (${rNitratePde5.first.name}) and PDE-5 Inhibitors (${rNitratePde5.second.name}) causes a catastrophic drop in blood pressure and circulatory collapse. Contraindicated.`,
        });
      }

      // 2. WARFARIN / BLOOD THINNERS + AZOLE ANTIFUNGALS (CRITICAL)
      const rThinnerAzole = checkPair(DRUG_CLASSES.BLOOD_THINNER, DRUG_CLASSES.AZOLE_ANTIFUNGAL);
      if (rThinnerAzole.match) {
        alerts.push({
          id: `ddi-thinner-azole-${i}-${j}`,
          severity: "CRITICAL",
          drugA: itemA.name,
          drugB: itemB.name,
          mechanism: "CYP2C9 enzyme inhibition causes 300-500% spike in anticoagulant levels",
          clinicalAction: "Monitor INR closely or consider alternative antifungal.",
          title: "Severe Hemorrhage / Bleeding Danger",
          messageEn: `Azole Antifungals (${rThinnerAzole.second.name}) strongly inhibit the metabolism of Blood Thinners (${rThinnerAzole.first.name}), causing dangerously elevated INR and fatal hemorrhage.`,
        });
      }

      // 3. METHOTREXATE + NSAID / PPI (CRITICAL)
      const rMtxNsaid = checkPair(DRUG_CLASSES.METHOTREXATE, DRUG_CLASSES.NSAID);
      const rMtxPpi = checkPair(DRUG_CLASSES.METHOTREXATE, DRUG_CLASSES.PPI);
      if (rMtxNsaid.match || rMtxPpi.match) {
        const culprit = rMtxNsaid.match ? rMtxNsaid.second.name : rMtxPpi.second.name;
        alerts.push({
          id: `ddi-mtx-toxicity-${i}-${j}`,
          severity: "CRITICAL",
          drugA: itemA.name,
          drugB: itemB.name,
          mechanism: "Inhibition of renal OAT3 transporters reduces Methotrexate clearance",
          clinicalAction: "Avoid NSAIDs/PPIs during high-dose MTX; use Paracetamol with doctor review.",
          title: "Fatal Bone Marrow Suppression",
          messageEn: `Combining Methotrexate with ${culprit} decreases renal clearance of MTX, leading to toxic accumulation, severe pancytopenia, and acute kidney failure.`,
        });
      }

      // 4. DIGOXIN + AMIODARONE / VERAPAMIL (CRITICAL)
      const rDigoxinCcb = checkPair(DRUG_CLASSES.DIGOXIN, DRUG_CLASSES.ANTIARRHYTHMIC_CCB);
      if (rDigoxinCcb.match) {
        alerts.push({
          id: `ddi-digoxin-ccb-${i}-${j}`,
          severity: "CRITICAL",
          drugA: itemA.name,
          drugB: itemB.name,
          mechanism: "P-glycoprotein efflux inhibition and additive negative dromotropy",
          clinicalAction: "Reduce Digoxin dose by 50% and monitor ECG/serum levels.",
          title: "Fatal Digoxin Cardiotoxicity & Heart Block",
          messageEn: `Combining Digoxin (${rDigoxinCcb.first.name}) with ${rDigoxinCcb.second.name} doubles serum digoxin levels and causes life-threatening bradycardia, AV block, and fatal arrhythmias.`,
        });
      }

      // 5. SSRI ANTIDEPRESSANT + TRAMADOL / LINEZOLID (CRITICAL)
      const rSsriTramadol = checkPair(DRUG_CLASSES.SSRI_ANTIDEPRESSANT, DRUG_CLASSES.TRAMADOL_OPIOID);
      const rSsriLinezolid = checkPair(DRUG_CLASSES.SSRI_ANTIDEPRESSANT, DRUG_CLASSES.LINEZOLID);
      if (rSsriTramadol.match || rSsriLinezolid.match) {
        alerts.push({
          id: `ddi-serotonin-syndrome-${i}-${j}`,
          severity: "CRITICAL",
          drugA: itemA.name,
          drugB: itemB.name,
          mechanism: "Additive hyper-serotonergic stimulation at 5-HT1A and 5-HT2A receptors",
          clinicalAction: "Do NOT dispense together. Severe risk of malignant hyperthermia.",
          title: "Life-Threatening Serotonin Syndrome",
          messageEn: `Combining SSRI Antidepressants with Tramadol or Linezolid can trigger Serotonin Syndrome — marked by hyperthermia, muscle rigidity, seizures, and autonomic collapse.`,
        });
      }

      // 6. ALLOPURINOL + AZATHIOPRINE / 6-MP (CRITICAL)
      const rAlloAza = checkPair(DRUG_CLASSES.ALLOPURINOL, DRUG_CLASSES.AZATHIOPRINE);
      if (rAlloAza.match) {
        alerts.push({
          id: `ddi-allo-aza-${i}-${j}`,
          severity: "CRITICAL",
          drugA: itemA.name,
          drugB: itemB.name,
          mechanism: "Xanthine oxidase inhibition blocks Azathioprine catabolism",
          clinicalAction: "Reduce Azathioprine dose to 25% or avoid combination entirely.",
          title: "Severe Bone Marrow Aplasia & Leukopenia",
          messageEn: `Allopurinol (${rAlloAza.first.name}) inhibits the breakdown of Azathioprine (${rAlloAza.second.name}), causing lethal bone marrow suppression and opportunistic infections.`,
        });
      }

      // 7. BETA BLOCKER + VERAPAMIL / DILTIAZEM (CRITICAL)
      const rBetaCcb = checkPair(DRUG_CLASSES.BETA_BLOCKER, DRUG_CLASSES.ANTIARRHYTHMIC_CCB);
      if (rBetaCcb.match) {
        alerts.push({
          id: `ddi-beta-ccb-${i}-${j}`,
          severity: "CRITICAL",
          drugA: itemA.name,
          drugB: itemB.name,
          mechanism: "Dual depression of SA and AV node conduction and cardiac inotropy",
          clinicalAction: "Contraindicated. Severe bradycardia and cardiogenic shock risk.",
          title: "Complete Heart Block & Cardiac Arrest",
          messageEn: `Concurrent use of Beta Blockers (${rBetaCcb.first.name}) and Non-Dihydropyridine CCBs (${rBetaCcb.second.name}) causes profound bradycardia, AV nodal arrest, and acute heart failure.`,
        });
      }

      // 8. OPIOID + BENZODIAZEPINE (CRITICAL - FDA Black Box Warning)
      const rOpioidBenzo = checkPair(DRUG_CLASSES.TRAMADOL_OPIOID, DRUG_CLASSES.BENZO_SEDATIVE);
      if (rOpioidBenzo.match) {
        alerts.push({
          id: `ddi-opioid-benzo-${i}-${j}`,
          severity: "CRITICAL",
          drugA: itemA.name,
          drugB: itemB.name,
          mechanism: "Synergistic GABA-A and mu-opioid respiratory central depression",
          clinicalAction: "FDA Black Box Warning. Limit dosage and monitor breathing.",
          title: "Fatal Respiratory Arrest & Coma",
          messageEn: `Combining Opioid analgesics (${rOpioidBenzo.first.name}) with Benzodiazepine sedatives (${rOpioidBenzo.second.name}) results in profound sedation, respiratory depression, coma, and death.`,
        });
      }

      // 9. BLOOD THINNERS + NSAIDs (HIGH)
      const rThinnerNsaid = checkPair(DRUG_CLASSES.BLOOD_THINNER, DRUG_CLASSES.NSAID);
      if (rThinnerNsaid.match) {
        alerts.push({
          id: `ddi-thinner-nsaid-${i}-${j}`,
          severity: "HIGH",
          drugA: itemA.name,
          drugB: itemB.name,
          mechanism: "Antiplatelet action combined with gastric mucosal erosion and COX inhibition",
          clinicalAction: "Use Paracetamol for analgesia or co-prescribe gastroprotection (PPI).",
          title: "Severe GI Bleeding Risk",
          messageEn: `Combining Blood Thinners (${rThinnerNsaid.first.name}) with NSAID painkillers (${rThinnerNsaid.second.name}) increases gastrointestinal hemorrhage risk by up to 500%.`,
        });
      }

      // 10. CLOPIDOGREL + OMEPRAZOLE / ESOMEPRAZOLE (HIGH)
      const rClopidogrelOmez = checkPair(DRUG_CLASSES.CLOPIDOGREL, DRUG_CLASSES.OMEPRAZOLE_ESOMEPRAZOLE);
      if (rClopidogrelOmez.match) {
        alerts.push({
          id: `ddi-clopidogrel-omez-${i}-${j}`,
          severity: "HIGH",
          drugA: itemA.name,
          drugB: itemB.name,
          mechanism: "Competitive CYP2C19 inhibition prevents activation of clopidogrel prodrug",
          clinicalAction: "Switch Omeprazole to Pantoprazole or Rabeprazole for safer cardiac protection.",
          title: "Cardiac Stent Thrombosis / Stroke Risk",
          messageEn: `Omeprazole/Esomeprazole (${rClopidogrelOmez.second.name}) blocks the bioactivation of Clopidogrel (${rClopidogrelOmez.first.name}), nullifying antiplatelet protection. Switch to Pantoprazole.`,
        });
      }

      // 11. FLUOROQUINOLONES + SYSTEMIC CORTICOSTEROIDS (HIGH)
      const rQuinoloneSteroid = checkPair(DRUG_CLASSES.FLUOROQUINOLONE, DRUG_CLASSES.CORTICOSTEROID);
      if (rQuinoloneSteroid.match) {
        alerts.push({
          id: `ddi-tendon-rupture-${i}-${j}`,
          severity: "HIGH",
          drugA: itemA.name,
          drugB: itemB.name,
          mechanism: "Synergistic extracellular matrix degradation in load-bearing connective tissue",
          clinicalAction: "Avoid concurrent use, particularly in elderly or athletes. Watch for heel pain.",
          title: "Achilles Tendon Rupture Danger",
          messageEn: `Co-administration of Fluoroquinolones (${rQuinoloneSteroid.first.name}) and Corticosteroids (${rQuinoloneSteroid.second.name}) exponentially increases the risk of severe tendinitis and Achilles tendon rupture.`,
        });
      }

      // 12. STATIN + MACROLIDE (HIGH)
      const rStatinMacro = checkPair(DRUG_CLASSES.STATIN, DRUG_CLASSES.MACROLIDE);
      if (rStatinMacro.match) {
        alerts.push({
          id: `ddi-statin-macro-${i}-${j}`,
          severity: "HIGH",
          drugA: itemA.name,
          drugB: itemB.name,
          mechanism: "CYP3A4 inhibition elevates statin AUC up to 10-fold",
          clinicalAction: "Temporarily withhold Statin during macrolide therapy or use Azithromycin.",
          title: "Severe Rhabdomyolysis & Muscle Breakdown",
          messageEn: `Macrolide antibiotics (${rStatinMacro.second.name}) block the clearance of Statins (${rStatinMacro.first.name}), precipitating acute rhabdomyolysis, severe myopathy, and kidney failure.`,
        });
      }

      // 13. STATIN + GEMFIBROZIL / FIBRATES (HIGH)
      const rStatinFibrate = checkPair(DRUG_CLASSES.STATIN, DRUG_CLASSES.FIBRATE);
      if (rStatinFibrate.match) {
        alerts.push({
          id: `ddi-statin-fibrate-${i}-${j}`,
          severity: "HIGH",
          drugA: itemA.name,
          drugB: itemB.name,
          mechanism: "OATP1B1 inhibition and glucuronidation pathway competition",
          clinicalAction: "Avoid Gemfibrozil with Statins; if triglyceride lowering needed, use Fenofibrate cautiously.",
          title: "Myopathy & Acute Renal Failure",
          messageEn: `Combining Statins (${rStatinFibrate.first.name}) with Gemfibrozil/Fibrates (${rStatinFibrate.second.name}) markedly increases statin exposure and acute kidney failure.`,
        });
      }

      // 14. ACE INHIBITOR / ARB + POTASSIUM-SPARING DIURETIC (HIGH)
      const rAceKSpared = checkPair(DRUG_CLASSES.ACE_ARB, DRUG_CLASSES.POTASSIUM_SPARING);
      if (rAceKSpared.match) {
        alerts.push({
          id: `ddi-hyperkalemia-${i}-${j}`,
          severity: "HIGH",
          drugA: itemA.name,
          drugB: itemB.name,
          mechanism: "Additively blunts renal aldosterone-mediated potassium excretion",
          clinicalAction: "Check serum potassium and creatinine within 1 week of initiation.",
          title: "Dangerous Hyperkalemia Risk",
          messageEn: `Combining Telmisartan/ACE-inhibitor (${rAceKSpared.first.name}) with Spironolactone (${rAceKSpared.second.name}) causes dangerous potassium retention and fatal cardiac arrhythmia.`,
        });
      }

      // 15. LITHIUM + ACE / ARB / NSAID (HIGH)
      const rLithiumAce = checkPair(DRUG_CLASSES.LITHIUM, DRUG_CLASSES.ACE_ARB);
      const rLithiumNsaid = checkPair(DRUG_CLASSES.LITHIUM, DRUG_CLASSES.NSAID);
      if (rLithiumAce.match || rLithiumNsaid.match) {
        const culprit = rLithiumAce.match ? rLithiumAce.second.name : rLithiumNsaid.second.name;
        alerts.push({
          id: `ddi-lithium-toxicity-${i}-${j}`,
          severity: "HIGH",
          drugA: itemA.name,
          drugB: itemB.name,
          mechanism: "Decreased proximal tubule sodium excretion causes secondary lithium retention",
          clinicalAction: "Reduce Lithium dose and monitor serum lithium levels frequently.",
          title: "Severe Lithium Neurotoxicity",
          messageEn: `Concomitant use of Lithium with ${culprit} impairs renal lithium clearance, causing lithium toxicity marked by coarse tremors, ataxia, and confusion.`,
        });
      }

      // 16. SULFONYLUREA + AZOLE ANTIFUNGAL (HIGH)
      const rSulfonylAzole = checkPair(DRUG_CLASSES.SULFONYLUREA, DRUG_CLASSES.AZOLE_ANTIFUNGAL);
      if (rSulfonylAzole.match) {
        alerts.push({
          id: `ddi-hypoglycemia-azole-${i}-${j}`,
          severity: "HIGH",
          drugA: itemA.name,
          drugB: itemB.name,
          mechanism: "CYP2C9 enzyme inhibition slows oral hypoglycemic clearance",
          clinicalAction: "Monitor blood glucose closely; temporarily decrease sulfonylurea dose.",
          title: "Severe Hypoglycemia & Loss of Consciousness",
          messageEn: `Fluconazole (${rSulfonylAzole.second.name}) inhibits the metabolism of Glimepiride/Gliclazide (${rSulfonylAzole.first.name}), causing severe, refractory hypoglycemia and fainting.`,
        });
      }

      // 17. ORAL CONTRACEPTIVE + CYP INDUCERS (HIGH)
      const rOcpInducer = checkPair(DRUG_CLASSES.ORAL_CONTRACEPTIVE, DRUG_CLASSES.CYP_INDUCER_ANTIEPILEPTIC);
      if (rOcpInducer.match) {
        alerts.push({
          id: `ddi-ocp-failure-${i}-${j}`,
          severity: "HIGH",
          drugA: itemA.name,
          drugB: itemB.name,
          mechanism: "Hepatic CYP3A4 upregulation accelerates steroid hormone catabolism",
          clinicalAction: "Advise non-hormonal / barrier contraception during therapy and 28 days post.",
          title: "Contraceptive Failure & Unintended Pregnancy",
          messageEn: `Enzyme Inducers (${rOcpInducer.second.name}) dramatically reduce circulating levels of Oral Contraceptives (${rOcpInducer.first.name}), causing contraceptive failure.`,
        });
      }

      // 18. THEOPHYLLINE + FLUOROQUINOLONE / MACROLIDE (HIGH)
      const rTheoQuinolone = checkPair(DRUG_CLASSES.THEOPHYLLINE, DRUG_CLASSES.FLUOROQUINOLONE);
      const rTheoMacro = checkPair(DRUG_CLASSES.THEOPHYLLINE, DRUG_CLASSES.MACROLIDE);
      if (rTheoQuinolone.match || rTheoMacro.match) {
        const culprit = rTheoQuinolone.match ? rTheoQuinolone.second.name : rTheoMacro.second.name;
        alerts.push({
          id: `ddi-theophylline-toxicity-${i}-${j}`,
          severity: "HIGH",
          drugA: itemA.name,
          drugB: itemB.name,
          mechanism: "CYP1A2 inhibition reduces theophylline clearance by up to 50%",
          clinicalAction: "Monitor serum theophylline; reduce dose by 30-50% to prevent seizures.",
          title: "Theophylline Toxicity & Tachyarrhythmias",
          messageEn: `Combining Deriphyllin/Theophylline with ${culprit} induces theophylline toxicity with severe nausea, ventricular tachycardia, and seizures.`,
        });
      }

      // 19. BENZO SEDATIVE + SEDATING ANTIHISTAMINE (HIGH)
      const rBenzoAntihist = checkPair(DRUG_CLASSES.BENZO_SEDATIVE, DRUG_CLASSES.SEDATING_ANTIHISTAMINE);
      if (rBenzoAntihist.match) {
        alerts.push({
          id: `ddi-cns-depression-${i}-${j}`,
          severity: "HIGH",
          drugA: itemA.name,
          drugB: itemB.name,
          mechanism: "Additive central histamine H1 and GABAergic neuronal inhibition",
          clinicalAction: "Warn patient against driving and operating heavy machinery.",
          title: "Extreme Sedation & Motor Impairment",
          messageEn: `Combining Sedatives (${rBenzoAntihist.first.name}) with Sedating Antihistamines/Cough Syrups (${rBenzoAntihist.second.name}) severely impairs central alertness and respiration.`,
        });
      }

      // 20. DUPLICATE PARACETAMOL OVERDOSE (HIGH)
      const isParacetamolA = matchA(DRUG_CLASSES.PARACETAMOL);
      const isParacetamolB = matchB(DRUG_CLASSES.PARACETAMOL);
      if (isParacetamolA && isParacetamolB) {
        alerts.push({
          id: `ddi-duplicate-pcm-${i}-${j}`,
          severity: "HIGH",
          drugA: itemA.name,
          drugB: itemB.name,
          mechanism: "Glutathione depletion via excessive toxic NAPQI metabolite accumulation",
          clinicalAction: "Instruct patient to take ONLY one paracetamol-containing medicine.",
          title: "Duplicate Paracetamol / Hepatotoxicity Risk",
          messageEn: `Both "${itemA.name}" and "${itemB.name}" contain Paracetamol. Concurrent use risks exceeding the 4000mg/day safe threshold, causing irreversible acute liver necrosis.`,
        });
      }

      // 21. DUPLICATE NSAID PAINKILLERS (MODERATE)
      const isNsaidA = matchA(DRUG_CLASSES.NSAID);
      const isNsaidB = matchB(DRUG_CLASSES.NSAID);
      if (isNsaidA && isNsaidB && !isParacetamolA && !isParacetamolB) {
        alerts.push({
          id: `ddi-duplicate-nsaid-${i}-${j}`,
          severity: "MODERATE",
          drugA: itemA.name,
          drugB: itemB.name,
          mechanism: "Dual COX-1 and COX-2 blockade without synergistic analgesic benefit",
          clinicalAction: "Prescribe only one NSAID class analgesic to protect stomach and kidneys.",
          title: "Duplicate NSAID Painkillers",
          messageEn: `Both "${itemA.name}" and "${itemB.name}" are NSAID painkillers. Concurrent use exponentially increases gastric ulcer risk and renal strain without improving pain relief.`,
        });
      }

      // 22. DUPLICATE PPI ACID SUPPRESSANTS (MODERATE)
      const isPpiA = matchA(DRUG_CLASSES.PPI);
      const isPpiB = matchB(DRUG_CLASSES.PPI);
      if (isPpiA && isPpiB) {
        alerts.push({
          id: `ddi-duplicate-ppi-${i}-${j}`,
          severity: "MODERATE",
          drugA: itemA.name,
          drugB: itemB.name,
          mechanism: "Redundant proton pump H+/K+-ATPase enzyme inhibition",
          clinicalAction: "Choose one single acid reducer to avoid hypochlorhydria.",
          title: "Duplicate Acid Suppressant",
          messageEn: `Both "${itemA.name}" and "${itemB.name}" are Proton Pump Inhibitors (PPIs). Only one acid blocker is clinically necessary.`,
        });
      }

      // 23. FLUOROQUINOLONES + ANTACIDS / CALCIUM (MODERATE)
      const rQuinoloneAntacid = checkPair(DRUG_CLASSES.FLUOROQUINOLONE, DRUG_CLASSES.ANTACID_CALCIUM);
      if (rQuinoloneAntacid.match) {
        alerts.push({
          id: `ddi-chelation-quinolone-${i}-${j}`,
          severity: "MODERATE",
          drugA: itemA.name,
          drugB: itemB.name,
          mechanism: "Polyvalent cation chelation forms insoluble, unabsorbable complexes",
          clinicalAction: "Administer Fluoroquinolone at least 2 hours before or 4 hours after antacids.",
          title: "Antibiotic Absorption Failure",
          messageEn: `Antacids/Calcium (${rQuinoloneAntacid.second.name}) bind with Fluoroquinolones (${rQuinoloneAntacid.first.name}), reducing antibiotic absorption by up to 90%. Separate doses by 2 hours.`,
        });
      }

      // 24. LEVOTHYROXINE + CALCIUM / IRON / ANTACIDS (MODERATE)
      const rThyroidChelate = checkPair(DRUG_CLASSES.THYROID_HORMONE, DRUG_CLASSES.ANTACID_CALCIUM);
      const rThyroidIron = checkPair(DRUG_CLASSES.THYROID_HORMONE, DRUG_CLASSES.ORAL_IRON);
      if (rThyroidChelate.match || rThyroidIron.match) {
        const binder = rThyroidChelate.match ? rThyroidChelate.second.name : rThyroidIron.second.name;
        alerts.push({
          id: `ddi-thyroid-chelate-${i}-${j}`,
          severity: "MODERATE",
          drugA: itemA.name,
          drugB: itemB.name,
          mechanism: "Adsorption and insoluble chelate formation in the proximal small bowel",
          clinicalAction: "Separate doses by at least 4 hours. Take Levothyroxine on an empty stomach.",
          title: "Thyroid Hormone Malabsorption",
          messageEn: `Calcium, Iron, or Antacids (${binder}) bind to Levothyroxine, blocking absorption and leading to unmanaged hypothyroidism. Space doses by at least 4 hours.`,
        });
      }

      // 25. ORAL IRON + CALCIUM / ANTACIDS (MODERATE)
      const rIronAntacid = checkPair(DRUG_CLASSES.ORAL_IRON, DRUG_CLASSES.ANTACID_CALCIUM);
      if (rIronAntacid.match) {
        alerts.push({
          id: `ddi-iron-chelate-${i}-${j}`,
          severity: "MODERATE",
          drugA: itemA.name,
          drugB: itemB.name,
          mechanism: "Divalent cation competition and neutralization of gastric acidic pH",
          clinicalAction: "Take Iron on an empty stomach or with Vitamin C; space antacids by 2 hours.",
          title: "Reduced Iron Absorption",
          messageEn: `Antacids and Calcium supplements (${rIronAntacid.second.name}) reduce the dissolution and absorption of Iron (${rIronAntacid.first.name}). Separate by 2-3 hours.`,
        });
      }
    }
  }

  return alerts;
}

/**
 * Returns a high-level clinical risk score for an active medicine list.
 */
export function getClinicalRiskSummary(cartItems = []) {
  const alerts = checkDrugInteractions(cartItems);
  const critical = alerts.filter((a) => a.severity === "CRITICAL").length;
  const high = alerts.filter((a) => a.severity === "HIGH").length;
  const moderate = alerts.filter((a) => a.severity === "MODERATE").length;

  let riskTier = "LOW";
  if (critical > 0) riskTier = "CRITICAL";
  else if (high > 0) riskTier = "HIGH";
  else if (moderate > 0) riskTier = "MODERATE";

  return {
    totalAlerts: alerts.length,
    criticalCount: critical,
    highCount: high,
    moderateCount: moderate,
    riskTier,
    alerts,
  };
}
