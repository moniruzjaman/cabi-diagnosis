// Test script for offline diagnosis engine
import { diagnoseOffline } from './diagnosticEngine.js';

// Test case 1: Nitrogen deficiency symptoms (English - original test)
const testData1 = {
  symptoms: {
    leafSymptoms: "older leaves yellowing uniformly, symmetrical pattern",
    distribution: "uniform across field",
    progression: "no progression",
    signs: "no insect signs, no fungal growth"
  },
  hostInfo: {
    varietySusceptibility: "medium",
    growthStage: "vegetative"
  },
  pathogenInfo: {
    inoculumPressure: "low",
    recentHistory: "none"
  },
  envInfo: {
    temp: 28,
    humidity: 70,
    rainfall: 10
  }
};

// Test case 2: Fungal disease symptoms (English - original test)
const testData2 = {
  symptoms: {
    leafSymptoms: "spindle-shaped lesions with gray center and brown border",
    distribution: "irregular, focal points",
    progression: "spreading from field edge",
    signs: "gray powdery growth on lesions"
  },
  hostInfo: {
    varietySusceptibility: "high",
    growthStage: "tillering"
  },
  pathogenInfo: {
    inoculumPressure: "medium",
    recentHistory: "present in area"
  },
  envInfo: {
    temp: 26,
    humidity: 85,
    rainfall: 5
  }
};

// Test case 3: Bengali symptoms - Rice blast (NEW)
const testData3 = {
  symptoms: {
    leafSymptoms: "পাতায় ধূসর মাকু আকৃতির দাগ (ব্লাস্ট)",
    distribution: "বিক্ষিপ্তভাবে ছড়িয়ে",
    progression: "3-5 দিন ধরে",
    signs: "পাতায় বাদামি গোলাকার দাগ"
  },
  crop: "ধান",
  hostInfo: {
    varietySusceptibility: "medium",
    growthStage: "vegetative"
  },
  pathogenInfo: {
    inoculumPressure: "low",
    recentHistory: "none"
  },
  envInfo: {
    temp: 28,
    humidity: 85,
    rainfall: 5
  }
};

// Test case 4: Bengali symptoms - Tomato bacterial wilt (NEW)
const testData4 = {
  symptoms: {
    leafSymptoms: "পাতা হলুদ হয়ে যাচ্ছে",
    distribution: "প্রায় 25%",
    progression: "1-2 দিন আগে",
    signs: "গাছ দিনে নেতিয়ে পড়ে, রাতে সতেজ হয়"
  },
  crop: "টমেটো",
  hostInfo: {
    varietySusceptibility: "medium",
    growthStage: "vegetative"
  },
  pathogenInfo: {
    inoculumPressure: "low",
    recentHistory: "none"
  },
  envInfo: {
    temp: 32,
    humidity: 80,
    rainfall: 20
  }
};

// Test case 5: Bengali symptoms with crop in English (NEW)
const testData5 = {
  symptoms: {
    leafSymptoms: "পাতায় সাদা গুঁড়া",
    distribution: "প্রায় 10%",
    progression: "1 সপ্তাহ",
    signs: "পাতায় তেলতেলে"
  },
  crop: "Potato",
  hostInfo: {
    varietySusceptibility: "medium",
    growthStage: "vegetative"
  },
  pathogenInfo: {
    inoculumPressure: "low",
    recentHistory: "none"
  },
  envInfo: {
    temp: 18,
    humidity: 90,
    rainfall: 30
  }
};

console.log("Testing offline diagnosis engine...");
console.log("================================");

console.log("\nTest 1: Suspected Nitrogen Deficiency (English)");
const result1 = diagnoseOffline(testData1);
console.log("Result:", JSON.stringify(result1, null, 2));

console.log("\nTest 2: Suspected Fungal Disease (English)");
const result2 = diagnoseOffline(testData2);
console.log("Result:", JSON.stringify(result2, null, 2));

console.log("\nTest 3: Bengali Rice Blast Symptoms");
const result3 = diagnoseOffline(testData3);
console.log("Primary Suspect:", result3.primarySuspect);
console.log("Specific Disease:", result3.specificDisease);
console.log("Crop Disease Matches:", result3.cropDiseaseMatches?.length || 0);
console.log("Confidence:", result3.confidence);
console.log("Excluded:", result3.excluded);
console.log("Suspects:", result3.suspects);

console.log("\nTest 4: Bengali Tomato Bacterial Wilt Symptoms");
const result4 = diagnoseOffline(testData4);
console.log("Primary Suspect:", result4.primarySuspect);
console.log("Specific Disease:", result4.specificDisease);
console.log("Crop Disease Matches:", result4.cropDiseaseMatches?.length || 0);
console.log("Confidence:", result4.confidence);

console.log("\nTest 5: Bengali + English Crop Name (Potato)");
const result5 = diagnoseOffline(testData5);
console.log("Primary Suspect:", result5.primarySuspect);
console.log("Specific Disease:", result5.specificDisease);
console.log("Crop Disease Matches:", result5.cropDiseaseMatches?.length || 0);

console.log("\nTest completed.");
