// Offline Diagnosis Module
// Export the diagnostic engine functions for use in the main app

import { diagnoseOffline, assessAbioticBiotic, applyExclusionGates, assessDiseaseTriangle, getFieldConfirmationMethods, generateIPMRecommendations } from './diagnosticEngine.js';

// For browser usage, we'll attach to window object
if (typeof window !== 'undefined') {
  window.offlineDiagnosis = {
    diagnoseOffline,
    assessAbioticBiotic,
    applyExclusionGates,
    assessDiseaseTriangle,
    getFieldConfirmationMethods,
    generateIPMRecommendations
  };
}

// Also export for ES6 modules
export {
  diagnoseOffline,
  assessAbioticBiotic,
  applyExclusionGates,
  assessDiseaseTriangle,
  getFieldConfirmationMethods,
  generateIPMRecommendations
};