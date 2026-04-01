// Offline CABI Diagnostic Engine
// Implements the CABI Plantwise methodology without requiring internet or external APIs

/**
 * Extracts and processes symptoms to determine if issue is abiotic or biotic
 * @param {Object} symptoms - Observed symptoms from user
 * @returns {string} - "abiotic", "biotic", or "uncertain"
 */
function assessAbioticBiotic(symptoms) {
  const abioticIndicators = [
    "uniformly distributed",
    "machinery tracks",
    "irrigation channels",
    "soil type zones",
    "symmetrically on both sides",
    "no progression",
    "all plants affected simultaneously",
    "not spreading",
    "no fruiting bodies",
    "no ooze",
    "no webbing",
    "no frass",
    "no insect presence",
    "linked to management event",
    "fertilizer application",
    "herbicide",
    "flooding",
    "salinity",
    "pH toxicity"
  ];

  const bioticIndicators = [
    "spreads progressively",
    "focus point",
    "field edge",
    "irregular distribution",
    "some plants healthy",
    "some sick",
    "clear border",
    "healthy/diseased tissue",
    "signs of pathogen presence",
    "fruiting bodies",
    "ooze",
    "webbing",
    "frass",
    "cast skins",
    "eggs",
    "symptoms appear asymmetrically"
  ];

  let abioticScore = 0;
  let bioticScore = 0;
  const allText = Object.values(symptoms).join(' ').toLowerCase();

  abioticIndicators.forEach(indicator => {
    if (allText.includes(indicator.toLowerCase())) abioticScore++;
  });

  bioticIndicators.forEach(indicator => {
    if (allText.includes(indicator.toLowerCase())) bioticScore++;
  });

  if (abioticScore > bioticScore) return "abiotic";
  if (bioticScore > abioticScore) return "biotic";
  return "uncertain";
}

/**
 * Applies CABI exclusion gates to narrow down potential causes
 * @param {string} abioticBiotic - Result from assessAbioticBiotic
 * @param {Object} symptoms - Observed symptoms
 * @returns {Object} - Excluded causes and remaining suspects
 */
function applyExclusionGates(abioticBiotic, symptoms) {
  const excluded = [];
  const suspects = [];
  const allText = Object.values(symptoms).join(' ').toLowerCase();

  // If abiotic, we don't apply biotic gates
  if (abioticBiotic === "abiotic") {
    excluded.push("insects/mites", "virus", "bacteria", "fungi/oomycetes");
    suspects.push("nutrient deficiency", "drought", "waterlogging", "herbicide injury", "salinity", "pH toxicity");
    return { excluded, suspects };
  }

  // Gate A: Exclude Insects/Mites
  const insectMiteSigns = [
    "chewing marks",
    "holes",
    "rolled leaves",
    "mines",
    "frass",
    "cast skins",
    "eggs",
    "webbing",
    "stippling"
  ];
  
  let hasInsectSigns = false;
  insectMiteSigns.forEach(sign => {
    if (allText.includes(sign.toLowerCase())) hasInsectSigns = true;
  });
  
  if (!hasInsectSigns) {
    excluded.push("insects/mites");
  } else {
    suspects.push("insects/mites");
  }

  // Gate B: Exclude Virus
  const virusSigns = [
    "mosaic",
    "ring spots",
    "chlorotic patterns following vein boundaries",
    "systemic distortion of young leaves",
    "confined between veins" // interveinal = NOT virus
  ];
  
  let hasVirusSigns = false;
  virusSigns.forEach(sign => {
    if (allText.includes(sign.toLowerCase())) hasVirusSigns = true;
  });
  
  // Special case: interveinal patterns suggest NOT virus
  if (allText.includes("interveinal") || allText.includes("confined between veins")) {
    excluded.push("virus");
  } else if (!hasVirusSigns) {
    excluded.push("virus");
  } else {
    suspects.push("virus");
  }

  // Gate C: Exclude Bacteria
  const bacteriaSigns = [
    "water-soaked margins",
    "bacterial ooze",
    "sticky exudate"
  ];
  
  let hasBacteriaSigns = false;
  bacteriaSigns.forEach(sign => {
    if (allText.includes(sign.toLowerCase())) hasBacteriaSigns = true;
  });
  
  if (!hasBacteriaSigns) {
    excluded.push("bacteria");
  } else {
    suspects.push("bacteria");
  }

  // Gate D: Confirm Fungal/Oomycete
  const fungalSigns = [
    "fruiting bodies",
    "black pycnidia",
    "pustules",
    "powdery coating",
    "cottony growth"
  ];
  
  const oomyceteSigns = [
    "rapid aggressive rot",
    "white cottony sporulation",
    "no hard sclerotia"
  ];
  
  const trueFungusSigns = [
    "hard black sclerotia"
  ];
  
  let hasFungalSigns = false;
  let hasOomyceteSigns = false;
  let hasTrueFungusSigns = false;
  
  fungalSigns.forEach(sign => {
    if (allText.includes(sign.toLowerCase())) hasFungalSigns = true;
  });
  
  oomyceteSigns.forEach(sign => {
    if (allText.includes(sign.toLowerCase())) hasOomyceteSigns = true;
  });
  
  trueFungusSigns.forEach(sign => {
    if (allText.includes(sign.toLowerCase())) hasTrueFungusSigns = true;
  });
  
  if (hasTrueFungusSigns) {
    suspects.push("true fungi");
    excluded.push("oomycetes");
  } else if (hasOomyceteSigns) {
    suspects.push("oomycetes");
    excluded.push("true fungi");
  } else if (hasFungalSigns) {
    suspects.push("fungal/oomycete (unable to differentiate)");
  } else {
    excluded.push("fungi/oomycetes");
  }

  return { excluded, suspects };
}

/**
 * Assesses disease triangle using host, pathogen, and environment factors
 * @param {Object} hostInfo - Host susceptibility data
 * @param {Object} pathogenInfo - Pathogen pressure data
 * @param {Object} envInfo - Environmental data (temperature, humidity, rainfall)
 * @returns {Object} - Disease triangle assessment
 */
function assessDiseaseTriangle(hostInfo, pathogenInfo, envInfo) {
  const assessment = {
    host: "",
    pathogen: "",
    environment: "",
    riskLevel: "low"
  };

  // Host assessment
  if (hostInfo.varietySusceptibility === "high" || 
      hostInfo.growthStage === "seedling" || 
      hostInfo.growthStage === "vegetative") {
    assessment.host = "High susceptibility due to variety and growth stage";
    assessment.riskLevel = "medium";
  } else {
    assessment.host = "Moderate to low susceptibility";
  }

  // Pathogen assessment
  if (pathogenInfo.inoculumPressure === "high" || 
      pathogenInfo.recentHistory === "present") {
    assessment.pathogen = "High pathogen pressure";
    if (assessment.riskLevel === "medium") assessment.riskLevel = "high";
    else assessment.riskLevel = "medium";
  } else {
    assessment.pathogen = "Low to moderate pathogen pressure";
  }

  // Environment assessment (using CABI thresholds)
  if (envInfo) {
    const { temp, humidity, rainfall } = envInfo;
    
    if (humidity > 80 && temp >= 26 && temp <= 35) {
      assessment.environment = "High humidity + optimal temperature = High fungal blast/blight risk";
      if (assessment.riskLevel !== "high") assessment.riskLevel = "high";
    } else if (humidity > 85) {
      assessment.environment = "Very high humidity = High bacterial blight risk";
      if (assessment.riskLevel !== "high") assessment.riskLevel = "high";
    } else if (temp < 20) {
      assessment.environment = "Cool nights = Tungro virus/insect vector risk";
      if (assessment.riskLevel === "low") assessment.riskLevel = "medium";
    } else if (rainfall > 50) {
      assessment.environment = "Heavy rain = Stem borer, root rot, waterlogging stress";
      if (assessment.riskLevel === "low") assessment.riskLevel = "medium";
    } else {
      assessment.environment = "Environmental conditions moderate";
    }
  } else {
    assessment.environment = "No environmental data available";
  }

  return assessment;
}

/**
 * Provides field confirmation methods based on suspected cause
 * @param {Array} suspects - Array of suspected causes
 * @returns {Array} - Field confirmation methods
 */
function getFieldConfirmationMethods(suspects) {
  const methods = [];
  
  suspects.forEach(suspect => {
    switch (suspect) {
      case "bacteria":
        methods.push("Bacterial streaming test: Cut stem 15cm from base, place in clear water - milky streaming after 5 min confirms bacterial wilt");
        methods.push("Look for water-soaked margins at lesion edges");
        methods.push("Check for bacterial ooze or sticky exudate");
        break;
        
      case "fungi/oomycetes":
      case "true fungi":
      case "oomycetes":
        methods.push("Check for visible fruiting bodies (black pycnidia, pustules, powdery coating, cottony growth)");
        methods.push("Look for rapid aggressive rot with white cottony sporulation (indicates oomycete)");
        methods.push("Check for hard black sclerotia (indicates true fungus)");
        break;
        
      case "insects/mites":
        methods.push("Examine leaf underside for insects, mites, eggs, webbing");
        methods.push("Look for chewing marks, holes, rolled leaves, mines, frass, cast skins");
        methods.push("Shake leaf over white paper to check for thrips");
        methods.push("Run finger under leaf - fine grit indicates mite eggs/cast skins");
        break;
        
      case "virus":
        methods.push("Look for mosaic, ring spots, chlorotic patterns following vein boundaries");
        methods.push("Check for systemic distortion of young leaves");
        methods.push("Note: Symptoms confined between veins = NOT virus");
        break;
        
      case "nutrient deficiency":
        methods.push("Check symmetry: Symmetrical on both leaf halves suggests nutrient deficiency");
        methods.push("Older leaves affected = N, P, K, Mg deficiency");
        methods.push("Younger leaves affected = Zn, Fe, S, Cu, Mn deficiency");
        methods.push("Yellowing pattern: Tip/margin burn = K deficiency");
        methods.push("Whitening along mid-vein = Zn deficiency");
        break;
        
      default:
        methods.push("General observation: Check distribution, progression, and associated symptoms");
    }
  });
  
  return methods;
}

/**
 * Generates IPM recommendations based on diagnosis
 * @param {Object} diagnosis - Diagnosis object with suspects, confidence, etc.
 * @returns {Object} - IPM recommendations
 */
function generateIPMRecommendations(diagnosis) {
  const recommendations = {
    cultural: [],
    biological: [],
    chemical: [],
    prevention: []
  };
  
  // Cultural controls (highest priority)
  recommendations.cultural.push("Use resistant varieties");
  recommendations.cultural.push("Practice crop rotation");
  recommendations.cultural.push("Maintain proper plant spacing");
  recommendations.cultural.push("Ensure balanced fertilization");
  recommendations.cultural.push("Use clean seed and planting material");
  recommendations.cultural.push("Remove and destroy infected plant debris");
  recommendations.cultural.push("Control weeds that may harbor pests");
  
  // Biological controls
  recommendations.biological.push("Apply Trichoderma for fungal diseases");
  recommendations.biological.push("Use Chitosan Oligosaccharide (COS) to activate plant immunity");
  recommendations.biological.push("Conserve and enhance natural enemies");
  recommendations.biological.push("Use neem oil or botanical extracts where appropriate");
  
  // Chemical controls (last resort)
  if (diagnosis.confidence === "high" || diagnosis.confidence === "medium") {
    diagnosis.suspects.forEach(suspect => {
      switch (suspect) {
        case "true fungi":
          recommendations.chemical.push("Use propiconazole, tricyclazole, carbendazim, iprodione, or tebuconazole");
          recommendations.chemical.push("FRAC rotation mandatory to prevent resistance");
          break;
          
        case "oomycetes":
          recommendations.chemical.push("Use metalaxyl, mancozeb, fosetyl-Al, or cymoxanil+mancozeb");
          recommendations.chemical.push("Standard fungicides ineffective - use specific oomyceticides");
          break;
          
        case "bacteria":
          recommendations.chemical.push("Use copper oxychloride or copper hydroxide");
          recommendations.chemical.push("Note: Antibiotics not recommended for plant use");
          break;
          
        case "insects/mites":
          recommendations.chemical.push("Rotate IRAC groups: Neonicotinoids → Organophosphates → Pyrethroids");
          recommendations.chemical.push("Never use same group >2 consecutive sprays");
          break;
          
        case "virus":
          recommendations.chemical.push("No chemical cure - focus on vector control");
          recommendations.chemical.push("Control insect vectors (whiteflies, leafhoppers, aphids)");
          break;
      }
    });
  } else {
    recommendations.chemical.push("Chemical control not recommended without confirmed diagnosis");
  }
  
  // Prevention
  recommendations.prevention.push("Monitor fields regularly for early detection");
  recommendations.prevention.push("Use disease forecasting models where available");
  recommendations.prevention.push("Implement quarantine measures for new planting material");
  recommendations.prevention.push("Maintain field sanitation");
  recommendations.prevention.push("Use reflective mulches to deter flying insects");
  recommendations.prevention.push("Apply balanced fertilization to reduce susceptibility");
  
  return recommendations;
}

/**
 * Main diagnostic function that orchestrates the offline diagnosis process
 * @param {Object} inputData - Contains symptoms, host info, pathogen info, env info
 * @returns {Object} - Complete diagnosis in CABI format
 */
function diagnoseOffline(inputData) {
  const { symptoms, hostInfo = {}, pathogenInfo = {}, envInfo = {} } = inputData;
  
  // Step 1: Abiotic vs Biotic assessment
  const abioticBiotic = assessAbioticBiotic(symptoms);
  
  // Step 2: Apply exclusion gates
  const { excluded, suspects } = applyExclusionGates(abioticBiotic, symptoms);
  
  // Step 3: Disease triangle assessment
  const triangle = assessDiseaseTriangle(hostInfo, pathogenInfo, envInfo);
  
  // Step 4: Field confirmation methods
  const fieldMethods = getFieldConfirmationMethods(suspects);
  
  // Step 5: Generate IPM recommendations
  const ipmRecommendations = generateIPMRecommendations({
    suspects: suspects,
    confidence: suspects.length > 0 && excluded.length > 0 ? "medium" : "low"
  });
  
  // Determine primary suspect
  const primarySuspect = suspects.length > 0 ? suspects[0] : "No clear suspect - requires field observation";
  
  // Build diagnosis object
  const diagnosis = {
    abioticBiotic,
    excluded,
    suspects,
    primarySuspect,
    confidence: suspects.length > 0 ? 
      (suspects.length === 1 && excluded.length >= 3 ? "high" : 
       suspects.length <= 2 ? "medium" : "low") : "low",
    diseaseTriangle: triangle,
    fieldConfirmation: fieldMethods,
    ipmRecommendations: ipmRecommendations,
    economicThreshold: suspects.length > 0 ? 
      "Assess: <5% leaf area damaged for most insects = no action needed" : 
      "Monitor without treatment until cause is confirmed",
    timestamp: new Date().toISOString()
  };
  
  return diagnosis;
}

// Export functions for use in other modules
export {
  diagnoseOffline,
  assessAbioticBiotic,
  applyExclusionGates,
  assessDiseaseTriangle,
  getFieldConfirmationMethods,
  generateIPMRecommendations
};