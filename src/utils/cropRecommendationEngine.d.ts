declare module '@/utils/cropRecommendationEngine.js' {

  interface NutrientRange {
    min: number;
    max: number;
  }

  interface NPKRange {
    N: NutrientRange;
    P: NutrientRange;
    K: NutrientRange;
  }

  interface OptimalNPK {
    N: number;
    P: number;
    K: number;
  }

  interface CropDetails {
    season: string;
    duration: number;
    waterRequirement: string;
    suitableSoils: string;
    optimalNPK: OptimalNPK;
    npkRange: NPKRange;
    optimalPH: number;
    phRange: NutrientRange;
    agronomistRemarks: string;
  }

  interface Economics {
    msp: number;
    mspApplicable: string;
    avgYield: number;
    inputCost: number;
    grossRevenue: number;
    netReturn: number;
    volatilityRisk: string;
  }

  interface ScoreBreakdownItem {
    factor: string;
    score: number;        // 0–1 decimal scale
    positive: boolean;
    message: string;
  }

  interface Scores {
    nitrogen: number;     // 0–100
    phosphorus: number;
    potassium: number;
    ph: number;
    season: number;
    water: number;
    soil: number;
    climateMultiplier: number;
  }

  interface ConfidenceBand {
    minScore: number;
    label: string;
    stars: number;
    color: string;
  }

  interface RecommendationResult {
    cropName: string;
    cropCategory: string;
    localName: string;
    finalScore: number;   // 0–100
    scores: Scores;
    confidence: ConfidenceBand;
    breakdown: ScoreBreakdownItem[];
    cropDetails: CropDetails;
    economics: Economics | null;
  }

  interface DistrictClimate {
    agro_climatic_zone: string;
    annual_rainfall_mm: number;
    avg_max_temp_c: number;
    avg_min_temp_c: number;
    avg_humidity_percent: number;
    irrigation_coverage: number;
    groundwater_stage: number;
    primary_water_source: string;
    suggested_soil_types: string[];
    major_kharif_crop: string;
    major_rabi_crop: string;
  }

  interface RecommendationOutput {
    recommendations: RecommendationResult[];
    seasonDisqualified: RecommendationResult[];
    districtClimate: DistrictClimate | null;
    inputSummary: {
      state: string;
      district: string;
      soilType: string;
      season: string;
      waterAvailability: string;
      npk: string;
      ph: number;
    };
  }

  export function getRecommendations(
    userInputs: {
      state: string;
      district: string;
      soilTypeId: string;
      nitrogen: number;
      phosphorus: number;
      potassium: number;
      ph: number;
      season: string;
      waterAvailabilityId: string;
    },
    cropData: any[],
    districtData: any[],
    soilMapping: any,
    waterConfig: any,
    options?: { topN?: number; includeAll?: boolean }
  ): RecommendationOutput;

  export function resolveDistrictClimate(
    state: string,
    district: string,
    districtData: any[]
  ): DistrictClimate | null;

  export function getSuggestedSoilTypesForDistrict(
    state: string,
    district: string,
    districtData: any[],
    soilMapping: any
  ): string[];

  export function getStateList(districtData: any[]): string[];
  export function getDistrictList(state: string, districtData: any[]): string[];
  export function getConfidenceBand(score: number): ConfidenceBand;

  export const SCORING_WEIGHTS: {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
    ph: number;
    season: number;
    water: number;
    soil: number;
  };

  export const CONFIDENCE_BANDS: ConfidenceBand[];
}

declare module '@/data/index.js' {
  export const cropData: any[];
  export const districtData: any[];
  export const soilMapping: any;
  export const waterConfig: any;
}
