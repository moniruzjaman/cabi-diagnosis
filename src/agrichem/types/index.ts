export type ChemicalType =
  | 'Insecticide'
  | 'Fungicide'
  | 'Herbicide'
  | 'Miticide'
  | 'Bio Pesticide'
  | 'Stored Grain'
  | 'Store Grain Insecticide'
  | 'Rodenticide'
  | 'Public Health';

export interface ChemicalProduct {
  id: string;
  type: ChemicalType;
  commonName: string;
  /**
   * Parsed active ingredient(s) derived from the CSV ``Common Name`` field
   * (e.g. ``"Ethion (5%) + Thiamethoxam (20%)"`` -> ``["Ethion", "Thiamethoxam"]``).
   * Used as the primary scan/match target for active-ingredient lookups.
   */
  activeIngredients?: string[];
  /**
   * Alternate spellings / transliterations of the brand or active ingredient
   * (e.g. Bengali-script variants) used to bridge scanned Bangla text onto the
   * English catalogue. Populated where the source data provides them.
   */
  aiAliases?: string[];
  tradeName: string;
  registrationNo: string;
  registrationHolder: string;
  crops: string[];
  pests: string[];
  dosageRate: string;
  // Enriched metadata
  moaCode?: string;
  moaGroup?: string;
  moaSubGroup?: string;
  moaTargetSite?: string;
  resistanceRisk?: 'Low' | 'Medium' | 'High' | 'Low to Medium' | 'Medium to High' | 'Unknown';
  toxicityClass?: 'Ia - Extremely Hazardous' | 'Ib - Highly Hazardous' | 'II - Moderately Hazardous' | 'III - Slightly Hazardous' | 'U - Unlikely to Present Hazard';
  whoColor?: string; // Yellow, Blue, Red, Green
  formulation?: string; // EC, WP, WDG, SG, SC, GR, SL, SP
  phiDays?: number; // Pre-Harvest Interval in days
  reiHours?: number; // Restricted Entry Interval in hours
  waterVolumeLPerHa?: number;
  safetyNotes?: string[];
  targetLifeCycle?: string;
  rotationNotes?: string;
  /**
   * Structured crop | pest | dosage recommendations sourced from the DAE
   * registered pesticides CSV. Each entry corresponds to one row of the
   * original multi-line ``Recommendations (Crop | Pest | Dosage)`` field.
   * Populated for products imported via ``ALL_PESTICIDES_DATABASE``; legacy
   * hand-curated entries may leave this undefined.
   */
  recommendations?: string[];
  /** Source dataset tag — used for diagnostics and dedupe priority. */
  source?: 'curated' | 'dae-register';

  // ---------------------------------------------------------------------------
  //  Policy / HHP / MoA enrichment (from policyEnrichmentData.ts sidecar)
  //
  //  These fields are populated from the AgriChem/MoA PTAC master database
  //  (5,485 rows × 31 cols) keyed by Registration No. Products whose reg no
  //  is not in the sidecar will have all of these as `undefined`.
  // ---------------------------------------------------------------------------
  /** IRAC / FRAC / HRAC scheme tag. */
  scheme?: string;
  /** MoA group number within the scheme (e.g. "1B", "11"). */
  groupNo?: string;
  /** Human-readable MoA description. */
  moaDescription?: string;
  /** WHO/FAO Highly Hazardous Pesticide status (e.g. "YES — HHP", "No"). */
  hhpStatus?: string;
  /** Active ingredient(s) that triggered HHP classification, if any. */
  hazardousActivesMatched?: string;
  /** EU / global regulatory status (banned, restricted, approved, etc.). */
  euGlobalRegulatoryStatus?: string;
  /** Bangladesh-specific policy action (phase-out, restrict, monitor, etc.). */
  bangladeshPolicyAction?: string;
  /** Policy risk tier: GREEN | AMBER | RED. */
  policyRiskTier?: 'GREEN' | 'AMBER' | 'RED' | string;
  /** Short formulation code from the enriched database (EC, WP, SC, etc.). */
  formulationCode?: string;
  /** Physicality of the formulation (liquid, solid, etc.). */
  formulationTypePhysicality?: string;
  /** Co-formulant / inert concern flags. */
  coFormulantInertConcern?: string;
}

export interface MoAClassification {
  code: string;
  name: string;
  nameBn?: string;
  subGroup?: string;
  targetSite?: string;
  targetSiteBn?: string;
  primaryActives: string[];
  resistanceRisk: 'Low' | 'Medium' | 'High' | 'Low to Medium' | 'Medium to High' | 'Unknown';
  rotationStrategy: string;
  rotationStrategyBn?: string;
  type: 'IRAC' | 'FRAC' | 'HRAC';
  committee?: 'IRAC' | 'FRAC' | 'HRAC';
  /** Speed of action for crop-phase targeting (from IRAC MoA Rotation Guide). */
  speedOfAction?: 'Fast' | 'Moderately Fast' | 'Moderate' | 'Slow to Moderately Slow' | 'Variable';
  /** Recommended crop phase for deployment (from the MoA Rotation Guide). */
  recommendedCropPhase?: 'Nursery' | 'Vegetative' | 'Reproductive' | 'Heading' | 'All';
  /** Maximum applications per treatment window (from IRAC: generally 1-2, max <3). */
  maxAppsPerWindow?: number;
  /** Seasonal exposure cap: max % of crop cycle this MoA can be used (IRAC: 50%). */
  seasonalExposureCapPct?: number;
  /** Whether sub-group rotation (e.g. 4A→4C) is permitted as standard practice. */
  subGroupRotationPermitted?: boolean;
}

export interface DosageInput {
  areaValue: number;
  areaUnit: 'hectare' | 'acre' | 'bigha' | 'katha' | 'sqm';
  tankVolumeL: number;
  sprayVolumePerHaL: number;
}

export interface DosageResult {
  convertedHa: number;
  convertedAcres: number;
  totalWaterNeededL: number;
  numberOfTanks: number;
  totalChemicalNeeded: string;
  chemicalPerTank: string;
  notes: string;
}

export interface RegulatoryAlert {
  id: string;
  title: string;
  category: 'regulatory' | 'seasonal' | 'safety' | 'resistance';
  severity: 'high' | 'medium' | 'info';
  date: string;
  validUntil?: string;
  targetCrops?: string[];
  targetChemicals?: string[];
  targetPests?: string[];
  summary: string;
  details: string;
  actionRequired?: string;
  read?: boolean;
}

export interface SprayRotationStep {
  sprayNumber: number;
  sprayWindow: string; // e.g. "Early vegetative", "Flowering", "Fruit development"
  productId: string;
  productName: string;
  commonName: string;
  moaCode: string;
  moaGroup: string;
  status: 'valid' | 'conflict';
  conflictReason?: string;
}

export type AppTab = 'home' | 'database' | 'calculator' | 'rotation' | 'safety' | 'guidebook' | 'alerts' | 'myfield' | 'intelligence' | 'specialist';
