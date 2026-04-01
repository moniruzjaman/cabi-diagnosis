// Test script for offline diagnosis engine
import { diagnoseOffline } from './diagnosticEngine.js';

// Test case 1: Nitrogen deficiency symptoms
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

// Test case 2: Fungal disease symptoms
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

console.log("Testing offline diagnosis engine...");
console.log("================================");

console.log("\nTest 1: Suspected Nitrogen Deficiency");
const result1 = diagnoseOffline(testData1);
console.log("Result:", JSON.stringify(result1, null, 2));

console.log("\nTest 2: Suspected Fungal Disease");
const result2 = diagnoseOffline(testData2);
console.log("Result:", JSON.stringify(result2, null, 2));

console.log("\nTest completed.");