import React, { useState } from "react";
import { diagnoseOffline } from "./diagnosticEngine";

const OfflineDiagnosis = () => {
  const [diagnosis, setDiagnosis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Simulated form data - in a real app, this would come from user inputs
  const simulateFormData = () => ({
    symptoms: {
      leafSymptoms: "yellowing older leaves, symmetrical pattern",
      distribution: "uniform across field",
      progression: "no progression observed",
      signs: "no fruiting bodies, no ooze, no webbing"
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
      humidity: 75,
      rainfall: 20
    }
  });

  const handleDiagnose = () => {
    setLoading(true);
    setError(null);
    
    try {
      const formData = simulateFormData();
      const result = diagnoseOffline(formData);
      setDiagnosis(result);
    } catch (err) {
      setError("Diagnosis failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Performing offline diagnosis...</div>;
  
  if (error) return <div style={{color: "red"}}>{error}</div>;
  
  if (!diagnosis) return <div>Click "Diagnose" to perform offline analysis</div>;

  return (
    <div style={{padding: "20px", background: "#f8f9fa", borderRadius: "10px"}}>
      <h3>Offline CABI Diagnosis Results</h3>
      
      <div style={{marginBottom: "15px"}}>
        <strong>Abiotic vs Biotic:</strong> {diagnosis.abioticBiotic}
      </div>
      
      <div style={{marginBottom: "15px"}}>
        <strong>Excluded Causes:</strong> {diagnosis.excluded.join(", ")}
      </div>
      
      <div style={{marginBottom: "15px"}}>
        <strong>Remaining Suspects:</strong> {diagnosis.suspects.join(", ")}
      </div>
      
      <div style={{marginBottom: "15px"}}>
        <strong>Primary Suspect:</strong> {diagnosis.primarySuspect}
      </div>
      
      <div style={{marginBottom: "15px"}}>
        <strong>Confidence Level:</strong> {diagnosis.confidence}
      </div>
      
      <div style={{marginBottom: "15px"}}>
        <strong>Disease Triangle Assessment:</strong>
        <ul>
          <li><strong>Host:</strong> {diagnosis.diseaseTriangle.host}</li>
          <li><strong>Pathogen:</strong> {diagnosis.diseaseTriangle.pathogen}</li>
          <li><strong>Environment:</strong> {diagnosis.diseaseTriangle.environment}</li>
          <li><strong>Risk Level:</strong> {diagnosis.diseaseTriangle.riskLevel}</li>
        </ul>
      </div>
      
      <div style={{marginBottom: "15px"}}>
        <strong>Field Confirmation Methods:</strong>
        <ul>
          {diagnosis.fieldConfirmation.map((method, idx) => (
            <li key={idx}>{method}</li>
          ))}
        </ul>
      </div>
      
      <div style={{marginBottom: "15px"}}>
        <strong>IPM Recommendations:</strong>
        <div>
          <strong>Cultural Controls:</strong>
          <ul>
            {diagnosis.ipmRecommendations.cultural.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
          
          <strong>Biological Controls:</strong>
          <ul>
            {diagnosis.ipmRecommendations.biological.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
          
          <strong>Chemical Controls (Last Resort):</strong>
          <ul>
            {diagnosis.ipmRecommendations.chemical.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
          
          <strong>Prevention:</strong>
          <ul>
            {diagnosis.ipmRecommendations.prevention.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
      
      <div style={{marginBottom: "15px"}}>
        <strong>Economic Threshold Guidance:</strong> {diagnosis.economicThreshold}
      </div>
      
      <div style={{marginTop: "20px", paddingTop: "10px", borderTop: "1px solid #ddd"}}>
        <small>Diagnosis performed at: {new Date(diagnosis.timestamp).toLocaleString()}</small>
        <br />
        <small>Note: This is an offline diagnosis using rule-based logic. For image-based analysis, internet connection is required.</small>
      </div>
    </div>
  );
};

export default OfflineDiagnosis;