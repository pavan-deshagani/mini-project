import { useEffect, useRef, useState } from "react";
import { Camera, Upload, RotateCcw, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DiseaseImageCaptureProps {
  onImageReady: (file: File) => void;
  disabled?: boolean;
}

// Fix 1: Removed image/jpg (not a valid MIME type — browsers never produce it).
// Fix 2: Lowered MIN_BYTES from 100KB to 20KB so camera captures from low-res
//        devices are not incorrectly rejected. The model handles any valid JPEG.
const MIN_BYTES = 20 * 1024;
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export function DiseaseImageCapture({ onImageReady, disabled }: DiseaseImageCaptureProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Attach the live stream to the <video> element once it's mounted (cameraOpen === true).
  // Setting srcObject after a render via rAF is unreliable, and on mobile browsers
  // (Safari/Chrome iOS) the <video> often needs an explicit play() call because the
  // user gesture context is lost after the `await getUserMedia(...)` call.
  useEffect(() => {
    if (!cameraOpen) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;
    const playPromise = video.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise.catch(() => {
        // Autoplay can be blocked on some browsers; user can still tap Capture
        // once the video is visibly playing, but surface a hint just in case.
      });
    }
  }, [cameraOpen]);

  const validate = (f: File): string | null => {
    if (!ACCEPTED.includes(f.type)) return "Only JPG, PNG or WebP images are allowed.";
    if (f.size < MIN_BYTES) return "Image too small (min 20 KB). Use a clearer photo.";
    if (f.size > MAX_BYTES) return "Image too large (max 10 MB).";
    return null;
  };

  const acceptFile = (f: File) => {
    const v = validate(f);
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleUploadClick = () => {
    setError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) acceptFile(f);
    e.target.value = "";
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
  };

  const handleTakePhoto = async () => {
    setError(null);

    // getUserMedia is only available in secure contexts (HTTPS or localhost).
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        window.isSecureContext === false
          ? "Camera requires a secure (HTTPS) connection. Please use Upload instead."
          : "Camera is not supported on this browser/device. Try Upload instead."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setCameraOpen(true);
      // Stream is attached to the <video> element by the useEffect above,
      // once cameraOpen flips to true and the element is mounted.
    } catch (err: any) {
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setError("Camera permission denied. Please allow camera access in your browser settings, or use Upload instead.");
      } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        setError("No camera found on this device. Please use Upload instead.");
      } else if (err?.name === "NotReadableError") {
        setError("Camera is already in use by another app. Close it and try again, or use Upload instead.");
      } else {
        setError("Camera access denied or unavailable. Try Upload instead.");
      }
    }
  };

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video) return;

    // Fix 4: Guard against 0×0 dimensions (stream not yet decoded)
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      setError("Camera not ready yet. Please wait a moment and try again.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Failed to capture image. Please try again.");
          return;
        }
        const captured = new File([blob], `leaf-${Date.now()}.jpg`, { type: "image/jpeg" });
        stopCamera();
        acceptFile(captured);
      },
      "image/jpeg",
      0.92,
    );
  };

  const handleRetake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setError(null);
  };

  const handleAnalyse = () => {
    if (file) onImageReady(file);
  };

  if (cameraOpen) {
    return (
      <div className="w-full space-y-3">
        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-black">
          {/* Fix 5: Added autoPlay and playsInline — required for mobile browsers (Safari/Chrome iOS)
              to start playback without user gesture after srcObject is assigned. */}
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            autoPlay
            playsInline
            muted
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={stopCamera}>
            Cancel
          </Button>
          <Button onClick={handleCapture} className="bg-green-600 hover:bg-green-700 text-white">
            Capture
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {!previewUrl && (
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={handleTakePhoto}
            className="h-14"
          >
            <Camera className="mr-2 h-5 w-5" />
            Take Photo
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={handleUploadClick}
            className="h-14"
          >
            <Upload className="mr-2 h-5 w-5" />
            Upload Image
          </Button>
        </div>
      )}

      {previewUrl && (
        <div className="space-y-3">
          <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-muted">
            <img src={previewUrl} alt="Leaf preview" className="h-full w-full object-cover" />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleRetake}
            disabled={disabled}
            className="w-full"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Retake
          </Button>
          <Button
            type="button"
            onClick={handleAnalyse}
            disabled={disabled}
            className="w-full h-12 bg-green-600 hover:bg-green-700 text-white text-base font-semibold"
          >
            <Leaf className="mr-2 h-5 w-5" />
            Analyse Leaf
          </Button>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
