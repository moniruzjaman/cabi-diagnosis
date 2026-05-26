// Offline Diagnosis Module
// Export the diagnostic engine functions for use in the main app
// Also re-exports data modules for direct access

import { diagnoseOffline, assessAbioticBiotic, applyExclusionGates, assessDiseaseTriangle, getFieldConfirmationMethods, generateIPMRecommendations, translateSymptoms } from './diagnosticEngine.js';

// Re-export data modules for convenience
export { BENGALI_KEYWORD_MAP, translateBengaliToEnglish, translateSymptomsToEnglish } from '../data/bengaliKeywords.js';
export { CROP_DISEASES, CROP_NAME_MAP, resolveCropKey, getDiseasesForCrop, matchDiseasesBySymptoms, estimateInoculumPressure, getVarietySusceptibility } from '../data/cropDiseases.js';

// For browser usage, we'll attach to window object
if (typeof window !== 'undefined') {
  window.offlineDiagnosis = {
    diagnoseOffline,
    assessAbioticBiotic,
    applyExclusionGates,
    assessDiseaseTriangle,
    getFieldConfirmationMethods,
    generateIPMRecommendations,
    translateSymptoms
  };
}

// Also export for ES6 modules
export {
  diagnoseOffline,
  assessAbioticBiotic,
  applyExclusionGates,
  assessDiseaseTriangle,
  getFieldConfirmationMethods,
  generateIPMRecommendations,
  translateSymptoms
};
