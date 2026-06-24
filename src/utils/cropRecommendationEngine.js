/**
 * cropRecommendationEngine.js
 *
 * Core recommendation algorithm for the Crop Recommendation System.
 * Pure JavaScript ES module — no external dependencies.
 * Designed to work client-side in a React/Lovable app or as a Node.js/Next.js API route.
 *
 * Usage:
 *   import { getRecommendations } from './cropRecommendationEngine.js';
 *   const results = getRecommendations(userInputs, cropData, districtData, soilMapping, waterConfig);
 */

// ─────────────────────────────────────────────
// SECTION 1: SCORING WEIGHT CONFIGURATION
// Adjust these weights to change how important each factor is.
// All weights must sum to 1.0
// ─────────────────────────────────────────────
const SCORING_WEIGHTS = {
  nitrogen:   0.13,   // How well user's N matches crop's N requirement
  phosphorus: 0.10,   // How well user's P matches crop's P requirement
  potassium:  0.10,   // How well user's K matches crop's K requirement
  ph:         0.15,   // How well user's pH matches crop's optimal pH
  season:     0.22,   // Season match — most important single factor
  water:      0.15,   // Water availability vs crop water requirement
  soil:       0.15,   // Soil type compatibility
  // Climate score (temperature, rainfall, humidity from district data) is applied
  // as a separate multiplier AFTER base score — see computeClimateMultiplier()
};

// ─────────────────────────────────────────────
// SECTION 2: CONFIDENCE BAND LABELS
// ─────────────────────────────────────────────
const CONFIDENCE_BANDS = [
  { minScore: 0.80, label: 'Excellent Match', stars: 5, color: '#16a34a' },
  { minScore: 0.65, label: 'Good Match',      stars: 4, color: '#65a30d' },
  { minScore: 0.50, label: 'Possible Match',  stars: 3, color: '#ca8a04' },
  { minScore: 0.35, label: 'Fair Match',      stars: 2, color: '#ea580c' },
  { minScore: 0.00, label: 'Poor Match',      stars: 1, color: '#dc2626' },
];

// ─────────────────────────────────────────────
// SECTION 3: INDIVIDUAL FACTOR SCORING FUNCTIONS
// ─────────────────────────────────────────────

/**
 * scoreNutrient
 * Scores how well a user's nutrient value (N, P, or K) matches a crop's requirement.
 *
 * Logic:
 *  - At optimum value → 1.0
 *  - Within [min, max] range → linearly scales from 0.7 to 1.0 based on proximity to optimum
 *  - Below min → decays from 0.7 to 0 as value drops further below min
 *  - Above max → decays from 0.7 to 0 as value rises further above max
 *
 * @param {number} userValue   - User's entered value (kg/ha)
 * @param {number} cropMin     - Crop's minimum requirement
 * @param {number} cropOptimum - Crop's optimum requirement
 * @param {number} cropMax     - Crop's maximum tolerance
 * @returns {number} Score between 0 and 1
 */
function scoreNutrient(userValue, cropMin, cropOptimum, cropMax) {
  if (userValue === null || userValue === undefined || isNaN(userValue)) return 0.5; // neutral if not entered

  // At or near optimum
  if (userValue === cropOptimum) return 1.0;

  // Within range
  if (userValue >= cropMin && userValue <= cropMax) {
    const range = cropMax - cropMin;
    if (range === 0) return 1.0;
    const distanceFromOptimum = Math.abs(userValue - cropOptimum);
    const halfRange = Math.max(Math.abs(cropOptimum - cropMin), Math.abs(cropMax - cropOptimum));
    return 0.7 + 0.3 * (1 - distanceFromOptimum / halfRange);
  }

  // Below minimum
  if (userValue < cropMin) {
    if (cropMin === 0) return 0.7;
    const deficitRatio = (cropMin - userValue) / cropMin;
    return Math.max(0, 0.7 - deficitRatio * 0.7);
  }

  // Above maximum
  if (userValue > cropMax) {
    const excessRatio = (userValue - cropMax) / cropMax;
    return Math.max(0, 0.7 - excessRatio * 0.7);
  }

  return 0.5;
}

/**
 * scorePH
 * Scores how well the user's soil pH matches the crop's pH requirement.
 * pH is critical — being outside range can lock up nutrients completely.
 *
 * @param {number} userPH      - User's soil pH
 * @param {number} cropPHMin   - Crop's minimum pH tolerance
 * @param {number} cropPHOpt   - Crop's optimum pH
 * @param {number} cropPHMax   - Crop's maximum pH tolerance
 * @returns {number} Score between 0 and 1
 */
function scorePH(userPH, cropPHMin, cropPHOpt, cropPHMax) {
  if (userPH === null || userPH === undefined || isNaN(userPH)) return 0.5;

  if (userPH === cropPHOpt) return 1.0;

  if (userPH >= cropPHMin && userPH <= cropPHMax) {
    const distanceFromOpt = Math.abs(userPH - cropPHOpt);
    const halfRange = Math.max(Math.abs(cropPHOpt - cropPHMin), Math.abs(cropPHMax - cropPHOpt));
    if (halfRange === 0) return 1.0;
    return 0.65 + 0.35 * (1 - distanceFromOpt / halfRange);
  }

  // Outside range — pH mismatch is serious, stronger penalty
  if (userPH < cropPHMin) {
    const gap = cropPHMin - userPH;
    return Math.max(0, 0.5 - gap * 0.15);
  }

  if (userPH > cropPHMax) {
    const gap = userPH - cropPHMax;
    return Math.max(0, 0.5 - gap * 0.15);
  }

  return 0.5;
}

/**
 * scoreSeason
 * Scores how well the selected season matches what the crop is grown in.
 *
 * Rules:
 *  - Exact season match in crop's season list → 1.0
 *  - "Year-round" crop → 0.85 (can be grown, but not peak season)
 *  - No match at all → 0.0 (hard disqualifier — season is critical)
 *
 * @param {string}   userSeason    - One of: 'Kharif', 'Rabi', 'Zaid', 'Year-round'
 * @param {string[]} cropSeasons   - Array of seasons from cropDetails.json
 * @returns {number} Score between 0 and 1
 */
function scoreSeason(userSeason, cropSeasons) {
  if (!userSeason || !cropSeasons || cropSeasons.length === 0) return 0.5;

  // Exact match
  if (cropSeasons.includes(userSeason)) return 1.0;

  // Year-round crops can be planted any time
  if (cropSeasons.includes('Year-round')) return 0.85;

  // Zaid (summer/short season) – if user selects Zaid, crops with Kharif get partial credit
  if (userSeason === 'Zaid' && cropSeasons.includes('Kharif')) return 0.35;

  // No match
  return 0.0;
}

/**
 * scoreWater
 * Scores how well the farm's water availability matches the crop's water requirement.
 *
 * Heavy penalty if crop needs significantly more water than available.
 * Mild penalty if crop needs less water than available (overwatering risk).
 *
 * @param {number} userWaterLevel - Numeric water level 1–5 (from waterAvailabilityConfig.json)
 * @param {number} cropWaterLevel - Numeric water level 1–5 (mapped from crop's water_requirement_level)
 * @returns {number} Score between 0 and 1
 */
function scoreWater(userWaterLevel, cropWaterLevel) {
  if (!userWaterLevel || !cropWaterLevel) return 0.5;

  const diff = userWaterLevel - cropWaterLevel;

  if (diff === 0) return 1.0;

  // User has LESS water than crop needs (serious problem)
  if (diff < 0) {
    const deficit = Math.abs(diff);
    if (deficit >= 3) return 0.0;
    if (deficit >= 2) return 0.15;
    if (deficit >= 1) return 0.40;
    return 0.70; // small deficit
  }

  // User has MORE water than crop needs (mild problem — waterlogging risk)
  if (diff > 0) {
    if (diff >= 3) return 0.50; // too much water for this crop
    if (diff >= 2) return 0.65;
    if (diff >= 1) return 0.80;
    return 0.90;
  }

  return 0.5;
}

/**
 * scoreSoil
 * Scores how well the user's soil type matches the crop's suitable soil types.
 * Uses the soilTypeMapping.json to bridge the vocabulary gap.
 *
 * @param {string}   userSoilId             - User's selected soil ID (e.g., 'alluvial', 'black_cotton')
 * @param {string[]} cropSuitableSoilTypes   - Array from cropDetails.json farming_conditions.suitable_soil_types
 * @param {object}   soilMapping             - Loaded soilTypeMapping.json
 * @returns {number} Score between 0 and 1
 */
function scoreSoil(userSoilId, cropSuitableSoilTypes, soilMapping) {
  if (!userSoilId || !cropSuitableSoilTypes || cropSuitableSoilTypes.length === 0) return 0.5;

  const compatibleCropSoils = soilMapping.userFacingToCropSoils[userSoilId] || [];
  const broadKeywords = soilMapping.broadCompatibilitySoils?.keywords || [];

  // Check for direct/compatible match
  const directMatch = cropSuitableSoilTypes.some(cropSoil =>
    compatibleCropSoils.some(compatible =>
      cropSoil.toLowerCase().includes(compatible.toLowerCase()) ||
      compatible.toLowerCase().includes(cropSoil.toLowerCase())
    )
  );

  if (directMatch) return 1.0;

  // Check for broad compatibility keywords (e.g., "Well-drained", "Various")
  const broadMatch = cropSuitableSoilTypes.some(cropSoil =>
    broadKeywords.some(keyword =>
      cropSoil.toLowerCase().includes(keyword.toLowerCase())
    )
  );

  if (broadMatch) return 0.60;

  // No match — penalize but don't eliminate (other inputs may compensate)
  return 0.15;
}

// ─────────────────────────────────────────────
// SECTION 4: CLIMATE MULTIPLIER (from district data)
// Applied after base score to adjust for regional suitability
// ─────────────────────────────────────────────

/**
 * computeClimateMultiplier
 * Uses district climate data (auto-populated) to scale the final score.
 * If district climate perfectly matches crop needs → multiplier = 1.0
 * If climate is partially outside crop range → multiplier < 1.0 (down to 0.5 minimum)
 * Does NOT go above 1.0 — it's a penalty system, not a bonus.
 *
 * @param {object} districtClimate - { avg_max_temp_c, avg_min_temp_c, annual_rainfall_mm, avg_humidity_percent }
 * @param {object} cropClimate     - crop.climate_conditions from cropDetails.json
 * @returns {number} Multiplier between 0.5 and 1.0
 */
function computeClimateMultiplier(districtClimate, cropClimate) {
  if (!districtClimate || !cropClimate) return 1.0;

  let penalties = 0;
  let checks = 0;

  // Temperature check — use district's average (midpoint of max and min)
  if (districtClimate.avg_max_temp_c !== undefined && cropClimate.temperature) {
    checks++;
    const districtAvgTemp = (districtClimate.avg_max_temp_c + districtClimate.avg_min_temp_c) / 2;
    const tempMin = cropClimate.temperature.min_c;
    const tempMax = cropClimate.temperature.max_c;

    if (districtAvgTemp < tempMin) {
      penalties += Math.min(0.4, (tempMin - districtAvgTemp) / 10 * 0.25);
    } else if (districtAvgTemp > tempMax) {
      penalties += Math.min(0.4, (districtAvgTemp - tempMax) / 10 * 0.25);
    }
  }

  // Rainfall check
  if (districtClimate.annual_rainfall_mm !== undefined && cropClimate.rainfall) {
    checks++;
    const rainfall = districtClimate.annual_rainfall_mm;
    const rainMin = cropClimate.rainfall.min_mm;
    const rainMax = cropClimate.rainfall.max_mm;

    if (rainfall < rainMin) {
      // Below minimum — can be supplemented with irrigation, so softer penalty
      penalties += Math.min(0.25, (rainMin - rainfall) / rainMin * 0.25);
    } else if (rainfall > rainMax) {
      // Above maximum — harder to control, drainage issues
      penalties += Math.min(0.30, (rainfall - rainMax) / rainMax * 0.30);
    }
  }

  // Humidity check
  if (districtClimate.avg_humidity_percent !== undefined && cropClimate.humidity) {
    checks++;
    const humidity = districtClimate.avg_humidity_percent;
    const humMin = cropClimate.humidity.min_percent;
    const humMax = cropClimate.humidity.max_percent;

    if (humidity < humMin) {
      penalties += Math.min(0.15, (humMin - humidity) / 50 * 0.15);
    } else if (humidity > humMax) {
      penalties += Math.min(0.15, (humidity - humMax) / 50 * 0.15);
    }
  }

  const multiplier = Math.max(0.5, 1.0 - penalties);
  return multiplier;
}

// ─────────────────────────────────────────────
// SECTION 5: CONFIDENCE BAND HELPER
// ─────────────────────────────────────────────

/**
 * getConfidenceBand
 * Returns label, stars, and color for a given final score.
 *
 * @param {number} score - Final score 0 to 1
 * @returns {object} { label, stars, color }
 */
function getConfidenceBand(score) {
  for (const band of CONFIDENCE_BANDS) {
    if (score >= band.minScore) return band;
  }
  return CONFIDENCE_BANDS[CONFIDENCE_BANDS.length - 1];
}

// ─────────────────────────────────────────────
// SECTION 6: SCORE BREAKDOWN GENERATOR
// Generates human-readable reasons for recommendation
// ─────────────────────────────────────────────

/**
 * generateScoreBreakdown
 * Returns a breakdown object showing which factors helped or hurt the crop's score.
 * Used for displaying "why this crop was recommended" in the UI.
 *
 * @param {object} scores  - Individual factor scores
 * @param {object} inputs  - User inputs
 * @param {object} crop    - Crop data from cropDetails.json
 * @returns {object[]} Array of { factor, score, message, positive }
 */
function generateScoreBreakdown(scores, inputs, crop) {
  const breakdown = [];
  const nr = crop.nutrient_requirements;
  const fc = crop.farming_conditions;

  // Nitrogen
  breakdown.push({
    factor: 'Nitrogen (N)',
    score: scores.nitrogen,
    positive: scores.nitrogen >= 0.65,
    message: scores.nitrogen >= 0.65
      ? `Your N (${inputs.nitrogen} kg/ha) is within ${crop.crop_name}'s optimal range (${nr.nitrogen.min}–${nr.nitrogen.max} kg/ha)`
      : `Your N (${inputs.nitrogen} kg/ha) is outside ${crop.crop_name}'s range (${nr.nitrogen.min}–${nr.nitrogen.max} kg/ha)`
  });

  // Phosphorus
  breakdown.push({
    factor: 'Phosphorus (P)',
    score: scores.phosphorus,
    positive: scores.phosphorus >= 0.65,
    message: scores.phosphorus >= 0.65
      ? `P level (${inputs.phosphorus} kg/ha) matches crop requirement (${nr.phosphorus.min}–${nr.phosphorus.max} kg/ha)`
      : `P level (${inputs.phosphorus} kg/ha) is outside required range (${nr.phosphorus.min}–${nr.phosphorus.max} kg/ha)`
  });

  // Potassium
  breakdown.push({
    factor: 'Potassium (K)',
    score: scores.potassium,
    positive: scores.potassium >= 0.65,
    message: scores.potassium >= 0.65
      ? `K level (${inputs.potassium} kg/ha) is suitable (${nr.potassium.min}–${nr.potassium.max} kg/ha)`
      : `K level (${inputs.potassium} kg/ha) is outside required range (${nr.potassium.min}–${nr.potassium.max} kg/ha)`
  });

  // pH
  const phRange = crop.ph_range;
  breakdown.push({
    factor: 'Soil pH',
    score: scores.ph,
    positive: scores.ph >= 0.65,
    message: scores.ph >= 0.65
      ? `Your pH (${inputs.ph}) is suitable — ${crop.crop_name} grows well in pH ${phRange.min}–${phRange.max} (optimum ${phRange.optimum})`
      : `Your pH (${inputs.ph}) may limit growth — ${crop.crop_name} prefers pH ${phRange.min}–${phRange.max}`
  });

  // Season
  breakdown.push({
    factor: 'Season',
    score: scores.season,
    positive: scores.season >= 0.65,
    message: scores.season >= 0.85
      ? `Season match — ${crop.crop_name} is a ${fc.season_name.join('/')} crop`
      : scores.season >= 0.5
      ? `${crop.crop_name} is Year-round but may have lower yields in ${inputs.season}`
      : `Season mismatch — ${crop.crop_name} is typically grown in ${fc.season_name.join('/')} not ${inputs.season}`
  });

  // Water
  breakdown.push({
    factor: 'Water Availability',
    score: scores.water,
    positive: scores.water >= 0.65,
    message: scores.water >= 0.65
      ? `Water supply matches — ${crop.crop_name} needs ${fc.water_requirement_level} water`
      : `Water mismatch — ${crop.crop_name} needs ${fc.water_requirement_level} water, which may exceed your availability`
  });

  // Soil
  breakdown.push({
    factor: 'Soil Type',
    score: scores.soil,
    positive: scores.soil >= 0.65,
    message: scores.soil >= 0.65
      ? `Soil is suitable — ${crop.crop_name} grows well in ${fc.suitable_soil_types.slice(0, 3).join(', ')}`
      : `Soil may not be ideal — ${crop.crop_name} prefers ${fc.suitable_soil_types.slice(0, 3).join(', ')}`
  });

  return breakdown;
}

// ─────────────────────────────────────────────
// SECTION 7: WATER LEVEL LOOKUP
// ─────────────────────────────────────────────

/**
 * getCropWaterLevel
 * Converts a crop's water_requirement_level string to numeric level.
 *
 * @param {string} levelString  - e.g. "Medium-High"
 * @param {object} waterConfig  - Loaded waterAvailabilityConfig.json
 * @returns {number} Numeric level 1–5
 */
function getCropWaterLevel(levelString, waterConfig) {
  return waterConfig.cropWaterRequirementLevels[levelString] || 3;
}

// ─────────────────────────────────────────────
// SECTION 8: MAIN RECOMMENDATION FUNCTION
// ─────────────────────────────────────────────

/**
 * getRecommendations
 * Main entry point. Scores all crops against user inputs and returns sorted results.
 *
 * @param {object} userInputs - {
 *   state: string,
 *   district: string,
 *   soilTypeId: string,          // e.g. 'alluvial', 'black_cotton' — from soilTypeMapping.json userFacingOptions
 *   nitrogen: number,            // kg/ha
 *   phosphorus: number,          // kg/ha
 *   potassium: number,           // kg/ha
 *   ph: number,                  // e.g. 6.5
 *   season: string,              // 'Kharif' | 'Rabi' | 'Zaid' | 'Year-round'
 *   waterAvailabilityId: string  // e.g. 'moderate_irrigation' — from waterAvailabilityConfig.json
 * }
 *
 * @param {object[]} cropData       - Full cropDetails.json array
 * @param {object[]} districtData   - Full indianDistrictData.json array
 * @param {object}   soilMapping    - Loaded soilTypeMapping.json
 * @param {object}   waterConfig    - Loaded waterAvailabilityConfig.json
 * @param {object}   options        - { topN: number (default 5), includeAll: boolean }
 *
 * @returns {object} {
 *   recommendations: RecommendationResult[],
 *   districtClimate: object | null,
 *   inputSummary: object
 * }
 */
function getRecommendations(userInputs, cropData, districtData, soilMapping, waterConfig, options = {}) {
  const { topN = 5, includeAll = false } = options;

  // ── Step 1: Resolve district climate data
  const districtClimate = resolveDistrictClimate(userInputs.state, userInputs.district, districtData);

  // ── Step 2: Resolve user water level
  const userWaterOption = waterConfig.userOptions.find(o => o.id === userInputs.waterAvailabilityId);
  const userWaterLevel = userWaterOption ? userWaterOption.level : 3;

  // ── Step 3: Score each crop
  const scoredCrops = cropData.map(crop => {
    const nr = crop.nutrient_requirements;
    const fc = crop.farming_conditions;
    const phRange = crop.ph_range;

    // Individual factor scores
    const scores = {
      nitrogen:   scoreNutrient(userInputs.nitrogen,   nr.nitrogen.min,   nr.nitrogen.optimum,   nr.nitrogen.max),
      phosphorus: scoreNutrient(userInputs.phosphorus, nr.phosphorus.min, nr.phosphorus.optimum, nr.phosphorus.max),
      potassium:  scoreNutrient(userInputs.potassium,  nr.potassium.min,  nr.potassium.optimum,  nr.potassium.max),
      ph:         scorePH(userInputs.ph, phRange.min, phRange.optimum, phRange.max),
      season:     scoreSeason(userInputs.season, fc.season_name),
      water:      scoreWater(userWaterLevel, getCropWaterLevel(fc.water_requirement_level, waterConfig)),
      soil:       scoreSoil(userInputs.soilTypeId, fc.suitable_soil_types, soilMapping),
    };

    // ── Weighted base score
    const baseScore =
      scores.nitrogen   * SCORING_WEIGHTS.nitrogen   +
      scores.phosphorus * SCORING_WEIGHTS.phosphorus +
      scores.potassium  * SCORING_WEIGHTS.potassium  +
      scores.ph         * SCORING_WEIGHTS.ph         +
      scores.season     * SCORING_WEIGHTS.season     +
      scores.water      * SCORING_WEIGHTS.water      +
      scores.soil       * SCORING_WEIGHTS.soil;

    // ── Climate multiplier from district data
    const climateMultiplier = computeClimateMultiplier(districtClimate, crop.climate_conditions);

    // ── Final score: base score adjusted by climate
    // Climate affects 20% of total score weight effectively
    const finalScore = baseScore * 0.80 + baseScore * climateMultiplier * 0.20;

    // ── Score breakdown for UI display
    const breakdown = generateScoreBreakdown(scores, userInputs, crop);

    // ── Confidence band
    const confidence = getConfidenceBand(finalScore);

    return {
      cropName:     crop.crop_name,
      cropCategory: crop.crop_category,
      localName:    crop.economic_data?.local_alt_name || '',
      finalScore:   Math.round(finalScore * 100),       // as percentage 0–100
      scores: {
        nitrogen:        Math.round(scores.nitrogen * 100),
        phosphorus:      Math.round(scores.phosphorus * 100),
        potassium:       Math.round(scores.potassium * 100),
        ph:              Math.round(scores.ph * 100),
        season:          Math.round(scores.season * 100),
        water:           Math.round(scores.water * 100),
        soil:            Math.round(scores.soil * 100),
        climateMultiplier: Math.round(climateMultiplier * 100),
      },
      confidence,
      breakdown,
      cropDetails: {
        season:           fc.season_name.join(' / '),
        duration:         fc.duration_days,
        waterRequirement: fc.water_requirement_level,
        suitableSoils:    fc.suitable_soil_types.slice(0, 4).join(', '),
        optimalNPK: {
          N: nr.nitrogen.optimum,
          P: nr.phosphorus.optimum,
          K: nr.potassium.optimum,
        },
        npkRange: {
          N: { min: nr.nitrogen.min, max: nr.nitrogen.max },
          P: { min: nr.phosphorus.min, max: nr.phosphorus.max },
          K: { min: nr.potassium.min, max: nr.potassium.max },
        },
        optimalPH:        phRange.optimum,
        phRange:          { min: phRange.min, max: phRange.max },
        agronomistRemarks: crop.agronomist_remarks,
      },
      economics: crop.economic_data
        ? {
            msp:            crop.economic_data.latest_msp_or_frp,
            mspApplicable:  crop.economic_data.msp_applicable,
            avgYield:       crop.economic_data.avg_yield_qtl_per_hectare,
            inputCost:      crop.economic_data.approx_input_cost_per_hectare,
            grossRevenue:   crop.economic_data.gross_revenue_per_hectare,
            netReturn:      crop.economic_data.estimated_net_return_per_hectare,
            volatilityRisk: crop.economic_data.volatility_risk_band,
          }
        : null,
    };
  });

  // ── Step 4: Sort by final score descending
  scoredCrops.sort((a, b) => b.finalScore - a.finalScore);

  // ── Step 5: Filter — exclude crops with season score = 0 from top results
  // (they can appear in "All Results" if includeAll = true)
  const seasonDisqualified = scoredCrops.filter(c => c.scores.season === 0);
  const seasonCompatible   = scoredCrops.filter(c => c.scores.season > 0);

  const recommendations = seasonCompatible.slice(0, topN);

  return {
    recommendations,
    seasonDisqualified: includeAll ? seasonDisqualified.slice(0, 5) : [],
    districtClimate,
    inputSummary: {
      state:            userInputs.state,
      district:         userInputs.district,
      soilType:         soilMapping.userFacingOptions.find(o => o.id === userInputs.soilTypeId)?.label || userInputs.soilTypeId,
      season:           userInputs.season,
      waterAvailability: userWaterOption?.label || userInputs.waterAvailabilityId,
      npk:              `${userInputs.nitrogen}-${userInputs.phosphorus}-${userInputs.potassium}`,
      ph:               userInputs.ph,
    }
  };
}

// ─────────────────────────────────────────────
// SECTION 9: DISTRICT CLIMATE RESOLVER
// ─────────────────────────────────────────────

/**
 * resolveDistrictClimate
 * Looks up a district from the indianDistrictData.json array and returns its climate data.
 * This data is used to auto-populate the Advanced Section in the UI and for climate scoring.
 *
 * @param {string}   stateName    - State name string (must match indianDistrictData.json state_name)
 * @param {string}   districtName - District name string
 * @param {object[]} districtData - Full indianDistrictData.json array
 * @returns {object|null} District climate object or null if not found
 */
function resolveDistrictClimate(stateName, districtName, districtData) {
  if (!stateName || !districtName || !districtData) return null;

  const stateEntry = districtData.find(
    s => s.state_name.toLowerCase() === stateName.toLowerCase()
  );
  if (!stateEntry) return null;

  const districtEntry = stateEntry.districts.find(
    d => d.district_name.toLowerCase() === districtName.toLowerCase()
  );
  if (!districtEntry) return null;

  return {
    agro_climatic_zone:    districtEntry.agro_climatic_zone,
    annual_rainfall_mm:    districtEntry.annual_rainfall_mm,
    avg_max_temp_c:        districtEntry.avg_max_temp_c,
    avg_min_temp_c:        districtEntry.avg_min_temp_c,
    avg_humidity_percent:  districtEntry.avg_humidity_percent,
    irrigation_coverage:   districtEntry.irrigation_coverage_pct,
    groundwater_stage:     districtEntry.groundwater_stage_pct,
    primary_water_source:  districtEntry.primary_water_source,
    suggested_soil_types:  districtEntry.soil_types,
    major_kharif_crop:     districtEntry.major_kharif_crop,
    major_rabi_crop:       districtEntry.major_rabi_crop,
  };
}

// ─────────────────────────────────────────────
// SECTION 10: DISTRICT SOIL SUGGESTION HELPER
// ─────────────────────────────────────────────

/**
 * getSuggestedSoilTypesForDistrict
 * When a user selects a district, call this to get the suggested soil type option(s)
 * to pre-populate the soil type dropdown in the UI.
 *
 * @param {string}   stateName    - State name
 * @param {string}   districtName - District name
 * @param {object[]} districtData - Full indianDistrictData.json
 * @param {object}   soilMapping  - soilTypeMapping.json
 * @returns {string[]} Array of user-facing soil option IDs to pre-select (may be 1–3 items)
 */
function getSuggestedSoilTypesForDistrict(stateName, districtName, districtData, soilMapping) {
  const climate = resolveDistrictClimate(stateName, districtName, districtData);
  if (!climate || !climate.suggested_soil_types) return [];

  const mapped = climate.suggested_soil_types
    .map(rawSoil => soilMapping.districtToCropSoilMap[rawSoil])
    .filter(Boolean);

  // Deduplicate
  return [...new Set(mapped)];
}

// ─────────────────────────────────────────────
// SECTION 11: STATE AND DISTRICT LIST HELPERS
// ─────────────────────────────────────────────

/**
 * getStateList
 * Returns all state names from district data, sorted alphabetically.
 *
 * @param {object[]} districtData
 * @returns {string[]}
 */
function getStateList(districtData) {
  return districtData.map(s => s.state_name).sort();
}

/**
 * getDistrictList
 * Returns all district names for a given state.
 *
 * @param {string}   stateName
 * @param {object[]} districtData
 * @returns {string[]}
 */
function getDistrictList(stateName, districtData) {
  const stateEntry = districtData.find(
    s => s.state_name.toLowerCase() === stateName.toLowerCase()
  );
  if (!stateEntry) return [];
  return stateEntry.districts.map(d => d.district_name).sort();
}

// ─────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────
export {
  getRecommendations,
  resolveDistrictClimate,
  getSuggestedSoilTypesForDistrict,
  getStateList,
  getDistrictList,
  getConfidenceBand,
  SCORING_WEIGHTS,
  CONFIDENCE_BANDS,
};
