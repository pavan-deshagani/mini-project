import * as tf from '@tensorflow/tfjs';

// ─── Model URL (Supabase Storage) ────────────────────────────────────────────
const MODEL_URL =
  'https://qpkybmshualrxpbijivl.supabase.co/storage/v1/object/public/ml-models/plantdoc/model.json';

const IMAGE_SIZE = 224;

// ─── Class labels ─────────────────────────────────────────────────────────────
// Order MUST match training class order (alphabetical, from disease_labels.json)
export const DISEASE_LABELS = [
  "Apple Scab Leaf",
  "Apple leaf",
  "Apple rust leaf",
  "Bell_pepper leaf",
  "Bell_pepper leaf spot",
  "Blueberry leaf",
  "Cherry leaf",
  "Corn Gray leaf spot",
  "Corn leaf blight",
  "Corn rust leaf",
  "Peach leaf",
  "Potato leaf early blight",
  "Potato leaf late blight",
  "Raspberry leaf",
  "Soyabean leaf",
  "Squash Powdery mildew leaf",
  "Strawberry leaf",
  "Tomato Early blight leaf",
  "Tomato Septoria leaf spot",
  "Tomato leaf",
  "Tomato leaf bacterial spot",
  "Tomato leaf late blight",
  "Tomato leaf mosaic virus",
  "Tomato leaf yellow virus",
  "Tomato mold leaf",
  "Tomato two spotted spider mites leaf",
  "grape leaf",
  "grape leaf black rot"
];

// ─── Supported crops (for UI scope display) ───────────────────────────────────
export const SUPPORTED_CROPS = [
  'Tomato', 'Potato', 'Corn / Maize', 'Bell Pepper',
  'Apple', 'Grape', 'Squash'
];

// ─── Confidence threshold ─────────────────────────────────────────────────────
const CONFIDENCE_THRESHOLD = 0.45;

// ─── Model singleton ──────────────────────────────────────────────────────────
let model = null;
let modelLoading = false;
let modelLoadPromise = null;

/**
 * Loads the TF.js model from Supabase Storage.
 * Cached after first load — safe to call multiple times.
 * @returns {Promise<tf.GraphModel>}
 */
export async function loadModel() {
  if (model) return model;

  // Prevent parallel load calls
  if (modelLoading) return modelLoadPromise;

  modelLoading = true;
  modelLoadPromise = tf.loadGraphModel(MODEL_URL)
    .then((m) => {
      model = m;
      modelLoading = false;
      console.log('[CropDisease] Model loaded successfully');
      // Warm up: run one dummy inference to initialise GPU kernels
      // Wrap in try/catch so a warm-up failure doesn't break the model singleton
      try {
        const dummy = tf.zeros([1, IMAGE_SIZE, IMAGE_SIZE, 3]);
        const warmupPred = model.predict(dummy);
        if (warmupPred && typeof warmupPred.dispose === 'function') {
          warmupPred.dispose();
        } else if (Array.isArray(warmupPred)) {
          warmupPred.forEach(t => t.dispose());
        }
        dummy.dispose();
      } catch (warmupErr) {
        console.warn('[CropDisease] Warm-up inference failed (non-fatal):', warmupErr);
      }
      return model;
    })
    .catch((err) => {
      modelLoading = false;
      modelLoadPromise = null;
      throw new Error(`Failed to load disease detection model: ${err.message}`);
    });

  return modelLoadPromise;
}

/**
 * Runs disease classification on an image File object.
 *
 * @param {File} imageFile - Image file from camera capture or file upload
 * @param {number} topK    - Number of top predictions to return (default: 3)
 * @returns {Promise<{
 *   status: 'success' | 'low_confidence' | 'error',
 *   predictions: Array<{ label: string, confidence: number, isHealthy: boolean }>,
 *   topPrediction: { label: string, confidence: number, isHealthy: boolean } | null,
 *   message: string
 * }>}
 */
export async function classifyDisease(imageFile, topK = 3) {
  try {
    const m = await loadModel();

    // Convert File → HTMLImageElement
    const imgUrl = URL.createObjectURL(imageFile);
    let img;
    try {
      img = await loadImageElement(imgUrl);
    } finally {
      // Always revoke the object URL, even if image loading fails
      URL.revokeObjectURL(imgUrl);
    }

    // Validate image dimensions — prevent 0×0 canvas frames from camera
    if (img.naturalWidth === 0 || img.naturalHeight === 0) {
      return {
        status: 'error',
        predictions: [],
        topPrediction: null,
        message: 'Image appears to be empty or corrupt. Please try again.'
      };
    }

    // Build tensor: [1, 224, 224, 3], normalized to [0, 1]
    let tensor, predTensor;
    try {
      tensor = tf.browser.fromPixels(img)
        .resizeBilinear([IMAGE_SIZE, IMAGE_SIZE])
        .toFloat()
        .div(255.0)
        .expandDims(0);

      // Run inference
      predTensor = m.predict(tensor);
    } finally {
      if (tensor) tensor.dispose();
    }

    let scores;
    try {
      scores = await predTensor.data();
    } finally {
      if (predTensor) predTensor.dispose();
    }

    // Build top-K results
    const allPredictions = Array.from(scores)
      .map((score, i) => ({
        label: DISEASE_LABELS[i],
        confidence: parseFloat(score.toFixed(4)),
        isHealthy: isHealthyLabel(DISEASE_LABELS[i])
      }))
      .sort((a, b) => b.confidence - a.confidence);

    const predictions = allPredictions.slice(0, topK);
    const top = predictions[0];

    // Low confidence — image unclear or unsupported crop
    if (top.confidence < CONFIDENCE_THRESHOLD) {
      return {
        status: 'low_confidence',
        predictions,
        topPrediction: top,
        message:
          'Image unclear or crop not supported. Please retake with better lighting, ' +
          'closer to the affected leaf, against a plain background.'
      };
    }

    return {
      status: 'success',
      predictions,
      topPrediction: top,
      message: top.isHealthy
        ? 'Leaf appears healthy. No disease detected.'
        : `Detected: ${top.label} (${(top.confidence * 100).toFixed(1)}% confidence)`
    };

  } catch (err) {
    return {
      status: 'error',
      predictions: [],
      topPrediction: null,
      message: `Analysis failed: ${err.message}`
    };
  }
}

/**
 * Pre-loads the model in the background.
 * Call this on page mount so the model is ready before the user uploads an image.
 */
export function preloadModel() {
  loadModel().catch((err) => {
    console.warn('[CropDisease] Background preload failed:', err.message);
  });
}

/**
 * Returns true if the label represents a healthy (non-diseased) leaf.
 * @param {string} label
 * @returns {boolean}
 */
export function isHealthyLabel(label) {
  const healthyLabels = new Set([
    "Apple leaf",
    "Bell_pepper leaf",
    "Blueberry leaf",
    "Cherry leaf",
    "Peach leaf",
    "Raspberry leaf",
    "Soyabean leaf",
    "Strawberry leaf",
    "Tomato leaf",
    "grape leaf"
  ]);
  return healthyLabels.has(label);
}

/**
 * Checks if model is already loaded (for UI loading state).
 * @returns {boolean}
 */
export function isModelLoaded() {
  return model !== null;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for inference'));
    img.src = src;
  });
}
