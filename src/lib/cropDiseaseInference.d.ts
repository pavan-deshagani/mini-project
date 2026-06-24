export const DISEASE_LABELS: string[];
export const SUPPORTED_CROPS: string[];

export interface Prediction {
  label: string;
  confidence: number;
  isHealthy: boolean;
}

export interface ClassifyResult {
  status: "success" | "low_confidence" | "error";
  predictions: Prediction[];
  topPrediction: Prediction | null;
  message: string;
}

export function loadModel(): Promise<unknown>;
export function classifyDisease(imageFile: File, topK?: number): Promise<ClassifyResult>;
export function preloadModel(): void;
export function isHealthyLabel(label: string): boolean;
export function isModelLoaded(): boolean;
