// Offline Diagnosis Module
// Export the diagnostic engine functions for use in the main app

const { diagnoseOffline, assessAbioticBiotic, applyExclusionGates, assessDiseaseTriangle, getFieldConfirmationMethods, generateIPMRecommendations } = require('./diagnosticEngine');

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
module.exports = {
  diagnoseOffline,
  assessAbioticBiotic,
  applyExclusionGates,
  assessDiseaseTriangle,
  getFieldConfirmationMethods,
  generateIPMRecommendations
};