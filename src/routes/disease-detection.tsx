import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Leaf, AlertCircle, Loader2, AlertTriangle } from "lucide-react";
import { DiseaseImageCapture } from "@/components/DiseaseImageCapture";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import recommendations from "@/data/diseaseRecommendations.json";

export const Route = createFileRoute("/disease-detection")({
  head: () => ({
    meta: [
      { title: "Disease Detection | AgriSmart" },
      {
        name: "description",
        content:
          "AI-powered crop disease detection for Indian farmers. Take or upload a leaf photo for instant diagnosis and treatment recommendations.",
      },
    ],
  }),
  component: DiseaseDetectionRoute,
});

type PageState = "idle" | "loading" | "results" | "low_confidence" | "error";

interface Prediction {
  label: string;
  confidence: number;
  isHealthy: boolean;
}

interface ClassifyResult {
  status: "success" | "low_confidence" | "error";
  predictions: Prediction[];
  topPrediction: Prediction | null;
  message: string;
}

interface ChemicalRec {
  active_ingredient: string;
  trade_names: string[];
  dosage_per_acre: string;
  dilution?: string;
  application_method?: string;
  phi_days: number;
  applications: string;
}

interface OrganicRec {
  treatment: string;
  dosage_per_acre: string;
  notes: string;
}

interface DiseaseRecommendation {
  crop: string;
  disease: string;
  pathogen: string | null;
  severity: "none" | "moderate" | "severe" | string;
  symptoms: string;
  favorable_conditions: string | null;
  chemical: ChemicalRec[];
  organic: OrganicRec[];
  ipm_notes: string;
  source: string | null;
}

const recs = recommendations as unknown as Record<string, DiseaseRecommendation>;

function DiseaseDetectionRoute() {
  return (
    <div>
      {/* Back to home bar */}
      <div className="sticky top-0 z-50 flex items-center gap-3 bg-white/95 px-6 py-3 shadow-sm backdrop-blur-sm dark:bg-zinc-950/95 border-b border-gray-100 dark:border-gray-800">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors dark:text-blue-400 dark:hover:bg-blue-900/30"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to AgriSmart
        </Link>
        <span className="text-gray-300 dark:text-gray-600">|</span>
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          🔬 Disease Detection
        </span>
      </div>
      <DiseaseDetectionPage />
    </div>
  );
}

function DiseaseDetectionPage() {
  const [state, setState] = useState<PageState>("idle");
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    import("@/lib/cropDiseaseInference.js")
      .then((mod) => {
        if (!cancelled) mod.preloadModel();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const recommendation = useMemo(() => {
    if (!result?.topPrediction) return null;
    return recs[result.topPrediction.label] ?? null;
  }, [result]);

  const handleImageReady = async (file: File) => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setState("loading");
    setErrorMsg("");

    try {
      const { classifyDisease } = await import("@/lib/cropDiseaseInference.js");
      const r: ClassifyResult = await classifyDisease(file);

      setResult(r);

      if (r.status === "success") {
        setState("results");
      } else if (r.status === "low_confidence") {
        setState("low_confidence");
      } else {
        setErrorMsg(r.message);
        setState("error");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unexpected error during analysis.");
      setState("error");
    }
  };

  const reset = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    setResult(null);
    setErrorMsg("");
    setState("idle");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50/40 to-background px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-[600px] space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Crop Disease Detection
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Take or upload a photo of an affected leaf
          </p>
        </header>

        <DiseaseImageCapture
          onImageReady={handleImageReady}
          disabled={state === "loading"}
        />

        {state === "idle" && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-xs text-green-800 ring-1 ring-green-200">
            Supported crops: Tomato, Potato, Corn, Bell Pepper, Apple, Grape, Squash
          </p>
        )}

        {state === "loading" && (
          <Card>
            <CardContent className="flex items-center gap-3 py-6">
              <Loader2 className="h-5 w-5 animate-spin text-green-600" />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium">Analysing leaf...</p>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </CardContent>
          </Card>
        )}

        {state === "error" && (
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="space-y-3 py-5">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
                <p className="text-sm text-red-800">{errorMsg}</p>
              </div>
              <Button onClick={reset} variant="outline" className="w-full">
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {state === "low_confidence" && result && imageUrl && (
          <div className="space-y-4">
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="space-y-3 py-5">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Low confidence result</p>
                    <p className="text-sm text-amber-700 mt-0.5">{result.message}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {result.predictions.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Best Guesses</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {result.predictions.map((p, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="truncate pr-2">{p.label}</span>
                        <span className="font-medium tabular-nums text-amber-700">
                          {(p.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-amber-400"
                          style={{ width: `${Math.max(2, p.confidence * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="rounded-lg bg-green-50 p-4 ring-1 ring-green-200">
              <p className="text-sm font-semibold text-green-800 mb-1">Tips for a better photo:</p>
              <ul className="text-sm text-green-900 space-y-1 list-disc list-inside">
                <li>Fill the frame with a single leaf</li>
                <li>Use natural daylight — avoid harsh shadows</li>
                <li>Hold steady and close to the leaf (20–30 cm)</li>
                <li>Use a plain background if possible</li>
              </ul>
            </div>

            <Button
              onClick={reset}
              className="w-full h-12 bg-green-600 hover:bg-green-700 text-white text-base font-semibold"
            >
              Try Again
            </Button>
          </div>
        )}

        {state === "results" && result && imageUrl && (
          <ResultsView
            result={result}
            recommendation={recommendation}
            imageUrl={imageUrl}
            onReset={reset}
          />
        )}
      </div>
    </div>
  );
}

function ResultsView({
  result,
  recommendation,
  imageUrl,
  onReset,
}: {
  result: ClassifyResult;
  recommendation: DiseaseRecommendation | null;
  imageUrl: string;
  onReset: () => void;
}) {
  const top = result.topPrediction!;
  const confidence = top.confidence;
  const confidenceColor =
    confidence >= 0.8
      ? "bg-green-100 text-green-800 ring-green-200"
      : "bg-amber-100 text-amber-800 ring-amber-200";

  const severity = recommendation?.severity ?? "none";
  const severityColor =
    severity === "severe"
      ? "bg-red-100 text-red-800 ring-red-200"
      : severity === "moderate"
        ? "bg-amber-100 text-amber-800 ring-amber-200"
        : "bg-green-100 text-green-800 ring-green-200";

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 py-5">
          <div className="flex gap-4">
            <img
              src={imageUrl}
              alt="Analysed leaf"
              className="h-[120px] w-[120px] flex-shrink-0 rounded-md object-cover ring-1 ring-border"
            />
            <div className="min-w-0 flex-1 space-y-2">
              <h2 className="text-lg font-bold leading-tight text-foreground">
                {recommendation?.disease ?? top.label}
              </h2>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className={`ring-1 ${confidenceColor} border-0`}>
                  {(confidence * 100).toFixed(1)}% confidence
                </Badge>
                <Badge variant="outline" className={`ring-1 ${severityColor} border-0 capitalize`}>
                  {severity}
                </Badge>
              </div>
              {recommendation?.crop && (
                <p className="text-sm text-muted-foreground">
                  Crop: <span className="font-medium text-foreground">{recommendation.crop}</span>
                </p>
              )}
              {recommendation?.pathogen && (
                <p className="text-xs italic text-muted-foreground">{recommendation.pathogen}</p>
              )}
            </div>
          </div>

          {recommendation?.symptoms && (
            <>
              <Separator />
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Symptoms
                </p>
                <p className="text-sm text-foreground">{recommendation.symptoms}</p>
              </div>
            </>
          )}

          {recommendation?.favorable_conditions && (
            <>
              <Separator />
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Favorable Conditions
                </p>
                <p className="text-sm text-foreground">{recommendation.favorable_conditions}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {recommendation && severity !== "none" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="chemical">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="chemical">Chemical</TabsTrigger>
                <TabsTrigger value="organic">Organic</TabsTrigger>
              </TabsList>
              <TabsContent value="chemical" className="mt-4">
                {recommendation.chemical.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No chemical recommendations.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Active Ingredient</TableHead>
                          <TableHead>Trade Names</TableHead>
                          <TableHead>Dosage/Acre</TableHead>
                          <TableHead>PHI (days)</TableHead>
                          <TableHead>Applications</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recommendation.chemical.map((c, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{c.active_ingredient}</TableCell>
                            <TableCell>{c.trade_names.join(", ")}</TableCell>
                            <TableCell>{c.dosage_per_acre}</TableCell>
                            <TableCell>{c.phi_days}</TableCell>
                            <TableCell>{c.applications}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="organic" className="mt-4 space-y-3">
                {recommendation.organic.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No organic recommendations.</p>
                ) : (
                  recommendation.organic.map((o, i) => (
                    <Card key={i} className="border-green-100 bg-green-50/40">
                      <CardContent className="space-y-1 py-3">
                        <p className="font-semibold text-foreground">{o.treatment}</p>
                        <p className="text-sm">
                          <span className="font-medium">Dosage:</span> {o.dosage_per_acre}
                        </p>
                        <p className="text-sm text-muted-foreground">{o.notes}</p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {recommendation?.ipm_notes && (
        <div className="flex gap-3 rounded-lg bg-green-50 p-4 ring-1 ring-green-200">
          <Leaf className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-700" />
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-green-800">
              IPM Notes
            </p>
            <p className="text-sm text-green-900">{recommendation.ipm_notes}</p>
          </div>
        </div>
      )}

      {recommendation?.source && (
        <p className="text-xs text-muted-foreground px-1">
          Source: {recommendation.source}
        </p>
      )}

      <Collapsible>
        <Card>
          <CollapsibleTrigger className="flex w-full items-center justify-between p-4 text-left">
            <span className="text-sm font-semibold">Top 3 Predictions</span>
            <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-3 pt-0">
              {result.predictions.map((p, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="truncate pr-2">{p.label}</span>
                    <span className="font-medium tabular-nums">
                      {(p.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-green-600"
                      style={{ width: `${Math.max(2, p.confidence * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Button
        onClick={onReset}
        className="w-full h-12 bg-green-600 hover:bg-green-700 text-white text-base font-semibold"
      >
        Scan Another Leaf
      </Button>
    </div>
  );
}
