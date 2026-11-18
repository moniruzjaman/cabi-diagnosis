// ============================================================
// Plant Detective — Crop Health Intelligence
// Shared type definitions (JSDoc). Adapted from KWI (MIT).
// Dead types dropped: MarketPrice, MarketAdvice, FarmProfile,
// GamificationState, Achievement, DailyTask, KWISdkConfig,
// AISkillInput/Output, SkillId, IntelligenceMetadataV2.
// New fields: RiskAssessment.modelLimitations, Explanation.*
// ============================================================

/** @typedef {'low'|'moderate'|'high'|'very_high'} RiskLevel */
/** @typedef {'disease'|'spray_window'|'irrigation'|'waterlogging'|'flood'|'heat_stress'|'cold_stress'|'wind_damage'|'harvest'|'lodging'|'pollination'|'seedling_stress'|'nutrient_loss'|'field_accessibility'} RiskCategory */
/** @typedef {'urgent'|'high'|'medium'|'low'} RecommendationPriority */
/** @typedef {'irrigation'|'spray'|'fertilizer'|'harvest'|'drainage'|'protection'|'planting'|'monitoring'|'scout'} RecommendationType */
/** @typedef {'sowing'|'germination'|'seedling'|'vegetative'|'tillering'|'stem_elongation'|'booting'|'heading'|'flowering'|'grain_filling'|'dough'|'ripening'|'harvest'} GrowthStageId */
/** @typedef {'spray'|'irrigation'|'fertilizer'|'planting'|'harvest'|'field_access'|'scout'} WeatherWindowType */

/**
 * @typedef {Object} GeoLocation
 * @property {number} latitude
 * @property {number} longitude
 * @property {string} name
 * @property {string} [district]
 * @property {string} country
 */

/**
 * @typedef {Object} WeatherCurrent
 * @property {number} temperature
 * @property {number} feelsLike
 * @property {number} humidity
 * @property {number} windSpeed
 * @property {number} windDirection
 * @property {number} windGusts
 * @property {number} pressure
 * @property {number} cloudCover
 * @property {number} visibility
 * @property {number} uvIndex
 * @property {number} dewPoint
 * @property {number} precipitation
 * @property {number} precipitationProbability
 * @property {number} weatherCode
 * @property {boolean} isDay
 * @property {number} [soilMoisture]
 * @property {number} [soilTemperature]
 */

/**
 * @typedef {Object} WeatherHourly
 * @property {string} time
 * @property {number} temperature
 * @property {number} feelsLike
 * @property {number} humidity
 * @property {number} windSpeed
 * @property {number} windDirection
 * @property {number} precipitation
 * @property {number} precipitationProbability
 * @property {number} cloudCover
 * @property {number} uvIndex
 * @property {number} dewPoint
 * @property {number} weatherCode
 * @property {number} pressure
 * @property {number} visibility
 * @property {number} [evapotranspiration]
 */

/**
 * @typedef {Object} WeatherDaily
 * @property {string} date
 * @property {number} weatherCode
 * @property {number} tempMax
 * @property {number} tempMin
 * @property {number} tempApparentMax
 * @property {number} tempApparentMin
 * @property {string} sunrise
 * @property {string} sunset
 * @property {number} precipitationSum
 * @property {number} precipitationProbabilityMax
 * @property {number} windSpeedMax
 * @property {number} windGustsMax
 * @property {number} windDirectionDominant
 * @property {number} uvIndexMax
 * @property {number} [et0Sum]
 * @property {number} [growingDegreeDays]
 */

/**
 * @typedef {Object} AgriculturalIndices
 * @property {number} et0
 * @property {number} gdd
 * @property {number} hni
 * @property {number} cni
 * @property {number} leafWetnessHours
 * @property {number} soilMoistureDeficit
 * @property {number} chillHours
 * @property {number} dewPoint
 * @property {number} vaporPressureDeficit
 * @property {number} solarRadiation
 */

/**
 * @typedef {Object} WeatherData
 * @property {WeatherCurrent} current
 * @property {WeatherHourly[]} hourly
 * @property {WeatherDaily[]} daily
 * @property {AgriculturalIndices} agriculturalIndices
 * @property {GeoLocation} location
 * @property {string} fetchedAt
 */

/**
 * @typedef {Object} GrowthStage
 * @property {GrowthStageId} id
 * @property {string} name
 * @property {string} nameBn
 * @property {number} durationDays
 * @property {number} waterRequirementMm
 * @property {number} diseaseSusceptibility
 * @property {number} heatStressThreshold
 * @property {number} coldStressThreshold
 * @property {string} description
 * @property {string} descriptionBn
 */

/**
 * @typedef {Object} CropConfig
 * @property {string} id
 * @property {string} name
 * @property {string} nameBn
 * @property {GrowthStage[]} growthStages
 * @property {number} totalDurationDays
 * @property {number} baseTemperature
 * @property {[number, number]} optimalTempRange
 * @property {string} icon
 * @property {string} color
 */

/**
 * @typedef {Object} ActiveCrop
 * @property {string} cropId
 * @property {CropConfig} config
 * @property {GrowthStageId} currentStage
 */

/**
 * Per-category risk assessment. `modelLimitations` is NEW (not in KWI):
 * honest caveats so scores are never mistaken for calibrated probabilities.
 * @typedef {Object} RiskAssessment
 * @property {RiskCategory} category
 * @property {number} score
 * @property {RiskLevel} level
 * @property {number} confidence
 * @property {string} explanation
 * @property {string} explanationBn
 * @property {string[]} evidence
 * @property {GrowthStageId[]} affectedStages
 * @property {string[]} mitigationActions
 * @property {string[]} mitigationActionsBn
 * @property {string[]} modelLimitations
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} RiskDashboard
 * @property {number} overallRiskScore
 * @property {RiskLevel} overallRiskLevel
 * @property {RiskAssessment[]} risks
 * @property {RiskAlert[]} alerts
 */

/**
 * @typedef {Object} RiskAlert
 * @property {string} id
 * @property {RiskCategory} category
 * @property {RiskLevel} level
 * @property {string} title
 * @property {string} titleBn
 * @property {string} message
 * @property {string} messageBn
 * @property {boolean} actionable
 * @property {string} [actionRequired]
 * @property {string} [actionRequiredBn]
 * @property {string} expiresAt
 */

/**
 * Structured disease favorability factor. The KWI original stored
 * `condition` as a free-text string parsed by regex at runtime (brittle:
 * the `'70-85%'` humidity band never matched the `>(\d+)` parser and
 * silently scored 0). This port replaces it with a structured object.
 * @typedef {Object} DiseaseFavorabilityFactor
 * @property {'temperature'|'humidity'|'leafWetness'|'precipitation'|'cropStage'} factor
 * @property {Object} condition
 * @property {'range'|'gt'|'lt'} condition.operator
 * @property {number} [condition.min]
 * @property {number} [condition.max]
 * @property {number} [condition.value]
 * @property {number} weight
 * @property {string} [source] - citation or "uncited"
 */

/**
 * @typedef {Object} DiseaseInfo
 * @property {string} id
 * @property {string} name
 * @property {string} nameBn
 * @property {string[]} cropIds
 * @property {GrowthStageId[]} affectedStages
 * @property {DiseaseFavorabilityFactor[]} favorabilityFactors
 * @property {string[]} symptoms
 * @property {string[]} symptomsBn
 * @property {string[]} preventiveActions
 * @property {string[]} preventiveActionsBn
 * @property {string[]} curativeActions
 * @property {string[]} curativeActionsBn
 * @property {string} economicThreshold
 * @property {string[]} [sources]
 */

/**
 * @typedef {Object} DiseaseRiskAssessment
 * @property {DiseaseInfo} disease
 * @property {number} risk
 * @property {RiskLevel} level
 * @property {number} confidence
 * @property {string[]} contributingFactors
 * @property {string[]} preventiveActions
 * @property {string[]} curativeActions
 */

/**
 * @typedef {Object} DiseaseForecast
 * @property {DiseaseRiskAssessment[]} diseases
 * @property {number} overallFavorability
 * @property {RiskLevel} spreadRisk
 * @property {number} confidence
 * @property {string[]} modelLimitations
 */

/**
 * @typedef {Object} AlternativeAction
 * @property {string} action
 * @property {string} actionBn
 * @property {string[]} pros
 * @property {string[]} cons
 * @property {number} effectiveness
 */

/**
 * A recommendation. `expectedYieldImpact` and `costSavingEstimate` are
 * nullable (the KWI original fabricated constant values per builder).
 * @typedef {Object} Recommendation
 * @property {string} id
 * @property {RecommendationType} type
 * @property {RecommendationPriority} priority
 * @property {string} title
 * @property {string} titleBn
 * @property {string} description
 * @property {string} descriptionBn
 * @property {string} reason
 * @property {string} reasonBn
 * @property {string[]} evidence
 * @property {number} confidence
 * @property {AlternativeAction[]} alternativeActions
 * @property {string} expectedOutcome
 * @property {string} expectedOutcomeBn
 * @property {number|null} expectedYieldImpact
 * @property {number|null} costSavingEstimate
 * @property {string} windowStart
 * @property {string} windowEnd
 * @property {string} ignoreConsequence
 * @property {string} ignoreConsequenceBn
 * @property {RiskCategory|null} relatedRisk
 * @property {GrowthStageId|null} relatedCropStage
 */

/**
 * Redesigned explanation (KWI original was a thin projection).
 * NEW fields: limitations, provenance, assumptions.
 * @typedef {Object} Explanation
 * @property {string} recommendationId
 * @property {string} why
 * @property {string} whyBn
 * @property {string[]} dataUsed
 * @property {number} confidence
 * @property {string} confidenceReason
 * @property {string} confidenceReasonBn
 * @property {AlternativeAction[]} alternativeActions
 * @property {string} expectedOutcome
 * @property {string} expectedOutcomeBn
 * @property {string} whatIfIgnored
 * @property {string} whatIfIgnoredBn
 * @property {string[]} limitations
 * @property {string[]} assumptions
 * @property {{metric:string, method:string, isProxy:boolean}[]} provenance
 */

/**
 * @typedef {Object} OperationWindow
 * @property {WeatherWindowType} type
 * @property {string} start
 * @property {string} end
 * @property {number} score
 * @property {boolean} suitable
 * @property {string[]} reasons
 * @property {string[]} reasonsBn
 * @property {number} confidence
 */

/**
 * @typedef {Object} WeatherWindows
 * @property {OperationWindow[]} spray
 * @property {OperationWindow[]} irrigation
 * @property {OperationWindow[]} fertilizer
 * @property {OperationWindow[]} planting
 * @property {OperationWindow[]} harvest
 * @property {OperationWindow[]} fieldAccess
 * @property {OperationWindow[]} scout
 */

// ============================================================
// Phase 2 — Crop Protection Decision Engine + MoA Stewardship
// (original design; MoA classification from public-domain
//  FRAC/IRAC/HRAC resistance-management publications)
// ============================================================

/** @typedef {'low'|'medium'|'high'} ResistanceRisk */
/** @typedef {'fungicide'|'insecticide'|'herbicide'|'bactericide'|'biocontrol'|'multi_site'} PesticideClass */

/**
 * A Mode of Action group (FRAC/IRAC/HRAC classification).
 * Data is public-domain agronomic science published by the Fungicide
 * Resistance Action Committee (FRAC), Insecticide Resistance Action
 * Committee (IRAC), and Herbicide Resistance Action Committee (HRAC).
 * The `sources` field cites the committee publication or marks "uncited".
 * @typedef {Object} MoaGroup
 * @property {string} code - canonical code, e.g. "FRAC_3", "FRAC_M", "IRAC_3"
 * @property {string} shortCode - display code, e.g. "3", "M", "3A"
 * @property {string} committee - "FRAC" | "IRAC" | "HRAC"
 * @property {string} name - full name (English)
 * @property {string} nameBn - Bangla name
 * @property {PesticideClass} pesticideClass
 * @property {ResistanceRisk} resistanceRisk
 * @property {number} maxAppsPerSeason - FRAC-recommended cap
 * @property {number} rotationWindowDays - min days between same-group applications
 * @property {number} phiDays - default pre-harvest interval (days); override per product
 * @property {string[]} activeIngredients - examples
 * @property {string[]} targetPathogenClasses - e.g. ["ascomycetes", "oomycetes"]
 * @property {string[]} sources
 */

/**
 * A normalized treatment record for MoA rotation tracking.
 * Derived from cropHealthCases case.treatments[] entries.
 * @typedef {Object} TreatmentRecord
 * @property {string} id
 * @property {string} date - ISO
 * @property {'cultural'|'biological'|'chemical'|'mechanical'} type
 * @property {string} description
 * @property {string} productName
 * @property {string} activeIngredient
 * @property {string} moaCode - canonical MoA code (resolved from free-text moaGroup)
 * @property {string} moaGroupRaw - original free-text as entered
 * @property {string} dosage
 * @property {number|null} cost
 * @property {string|null} targetDisease - disease id this treatment targets
 * @property {number} phiDays - pre-harvest interval (from MoA group)
 */

/**
 * A single gate in the Crop Protection Decision sequence.
 * @typedef {Object} ProtectionGate
 * @property {'diagnosis_confirmed'|'economic_threshold'|'moa_rotation'|'weather_suitable'|'pre_harvest_interval'} id
 * @property {string} name
 * @property {string} nameBn
 * @property {boolean} passed
 * @property {string} reason - why passed/blocked (Bangla-first)
 * @property {string} reasonEn
 * @property {string[]} evidence
 */

/**
 * The full Crop Protection Decision — the compliance layer any chemical
 * treatment must pass before being shown as "approved". `approved` is true
 * ONLY when all gates pass. This is the engine that makes the Phase 1 spray
 * recommendation's "follow the Crop Protection Decision Engine" real.
 * @typedef {Object} ProtectionDecision
 * @property {boolean} approved
 * @property {ProtectionGate[]} gates
 * @property {string|null} blockedReason - Bangla explanation of the first blocker
 * @property {string|null} blockedReasonEn
 * @property {string|null} blockedGateId - which gate blocked
 * @property {{moaCode: string, activeIngredient: string, productName: string}|null} approvedTreatment
 * @property {string[]} alternativeMoaOptions - rotation alternatives if MoA gate blocked
 * @property {string[]} complianceNotes - rotation advice, PHI warnings
 * @property {string[]} modelLimitations
 * @property {string} evaluatedAt
 */

export {}; // type-only module
