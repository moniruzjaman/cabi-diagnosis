// Offline Diagnosis Module
// Export the diagnostic engine functions for use in the main app
// Also re-exports data modules for direct access

import { diagnoseOffline, assessAbioticBiotic, applyExclusionGates, assessDiseaseTriangle, getFieldConfirmationMethods, generateIPMRecommendations, translateSymptoms } from './diagnosticEngine.js';
import { enrichDiagnosisWithImages, diagnoseOfflineWithImages } from './visualEnrichment.js';

// Re-export data modules for convenience
export { BENGALI_KEYWORD_MAP, translateBengaliToEnglish, translateSymptomsToEnglish } from '../data/bengaliKeywords.js';
export { CROP_DISEASES, CROP_NAME_MAP, resolveCropKey, getDiseasesForCrop, matchDiseasesBySymptoms, estimateInoculumPressure, getVarietySusceptibility } from '../data/cropDiseases.js';
export {
  loadCabiDatabase, buildImageIndex, getCachedImageIndex,
  findImagesByCategory, findImagesByKeywords,
  findReferenceImagesForSymptoms, listAllCategories, getLibraryStats,
  BENGALI_SYMPTOM_CATEGORY_MAP, CAUSE_TO_CATEGORY_HINT,
} from '../data/imageLibrary.js';

// For browser usage, we'll attach to window object
if (typeof window !== 'undefined') {
  window.offlineDiagnosis = {
    diagnoseOffline,
    diagnoseOfflineWithImages,
    enrichDiagnosisWithImages,
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
  diagnoseOfflineWithImages,
  enrichDiagnosisWithImages,
  assessAbioticBiotic,
  applyExclusionGates,
  assessDiseaseTriangle,
  getFieldConfirmationMethods,
  generateIPMRecommendations,
  translateSymptoms
};
