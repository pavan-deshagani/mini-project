import { useMemo, useState } from "react";
import {
  Wheat, ChevronDown, ChevronUp, Star, CheckCircle2, AlertCircle, XCircle,
  Droplets, Thermometer, Cloud, TrendingUp, Sun, Snowflake, Leaf, RefreshCw,
  HelpCircle, Loader2, MapPin,
} from "lucide-react";
import {
  getRecommendations, resolveDistrictClimate,
  getSuggestedSoilTypesForDistrict, getStateList, getDistrictList,
} from "@/utils/cropRecommendationEngine.js";
import { cropData, districtData, soilMapping, waterConfig } from "@/data/index.js";

// ─── Palette ────────────────────────────────────────────
const C = {
  primary: "#16a34a", dark: "#15803d", lightBg: "#f0fdf4", borderG: "#bbf7d0",
  amber: "#d97706", red: "#dc2626", text: "#111827", subtext: "#6b7280",
  card: "#ffffff", pageBg: "#f9fafb",
};

type FormState = {
  state: string; district: string; soilTypeId: string;
  nitrogen: string; phosphorus: string; potassium: string; ph: string;
  season: string; waterAvailabilityId: string;
};

const SEASONS = [
  { id: "Kharif", label: "Kharif", sub: "Jun–Nov", Icon: Sun },
  { id: "Rabi", label: "Rabi", sub: "Nov–Apr", Icon: Snowflake },
  { id: "Zaid", label: "Zaid", sub: "Mar–Jun", Icon: Leaf },
  { id: "Year-round", label: "Year-round", sub: "All year", Icon: RefreshCw },
];

const waterLevelColor = (lvl: string) => {
  const m: Record<string, string> = {
    "Very High": "#2563eb", High: "#0d9488", Medium: "#16a34a",
    "Low-Medium": "#84cc16", Low: "#6b7280",
  };
  return m[lvl] || "#6b7280";
};

const riskColor = (r: string) => {
  const k = (r || "").toLowerCase();
  if (k.includes("low")) return "#16a34a";
  if (k.includes("mod")) return "#d97706";
  if (k.includes("high")) return "#dc2626";
  return "#6b7280";
};

const seasonChipColor = (s: string) => {
  if (s === "Kharif") return "#16a34a";
  if (s === "Rabi") return "#2563eb";
  if (s === "Zaid") return "#d97706";
  return "#6b7280";
};

const phBand = (v: number) => {
  if (v < 5.5) return { label: "Strongly Acidic", color: "#ef4444" };
  if (v < 6.5) return { label: "Slightly Acidic", color: "#eab308" };
  if (v < 7.5) return { label: "Neutral / Ideal", color: "#16a34a" };
  if (v < 8.5) return { label: "Slightly Alkaline", color: "#f97316" };
  return { label: "Strongly Alkaline", color: "#dc2626" };
};

// ─── Reusable bits ──────────────────────────────────────
function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 65 ? "#16a34a" : value >= 40 ? "#eab308" : "#ef4444";
  return (
    <div className="flex flex-col items-center gap-1 min-w-0">
      <div className="text-[11px] font-medium text-gray-600">{label}</div>
      <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <div className="text-[10px] text-gray-500">{value}%</div>
    </div>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={14} fill={i <= n ? "#f59e0b" : "none"} color={i <= n ? "#f59e0b" : "#d1d5db"} />
      ))}
    </div>
  );
}

function CircularScore({ value, color }: { value: number; color: string }) {
  const r = 32, c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  return (
    <div className="relative w-[80px] h-[80px]">
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        <circle cx="40" cy="40" r={r} stroke="#e5e7eb" strokeWidth="6" fill="none" />
        <circle cx="40" cy="40" r={r} stroke={color} strokeWidth="6" fill="none"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 600ms ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold" style={{ color }}>{value}%</div>
      </div>
    </div>
  );
}

// ─── Page Header ────────────────────────────────────────
function PageHeader() {
  return (
    <header
      className="w-full text-white py-6 px-6"
      style={{ background: `linear-gradient(135deg, ${C.primary} 0%, ${C.dark} 100%)` }}
    >
      <div className="max-w-5xl mx-auto flex items-center gap-4">
        <div className="bg-white/15 p-3 rounded-xl"><Wheat size={32} /></div>
        <div>
          <h1 className="text-2xl md:text-[28px] font-bold leading-tight">Crop Recommendation System</h1>
          <p className="text-sm md:text-base text-white/90 mt-1">
            Get the best crops for your land based on soil, climate and season
          </p>
        </div>
      </div>
    </header>
  );
}

// ─── Searchable Combobox ────────────────────────────────
function Combobox({
  value, onChange, options, placeholder, disabled, error,
}: {
  value: string; onChange: (v: string) => void; options: string[];
  placeholder: string; disabled?: boolean; error?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => options.filter((o) => o.toLowerCase().includes(query.toLowerCase())),
    [options, query]
  );
  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`w-full text-left px-3 py-2.5 rounded-lg border bg-white shadow-sm transition
          ${disabled ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "hover:border-gray-400"}
          ${error ? "border-red-500" : "border-gray-300"}`}
      >
        <span className={value ? "text-gray-900" : "text-gray-400"}>{value || placeholder}</span>
        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
      </button>
      {open && !disabled && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-hidden">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="w-full px-3 py-2 border-b border-gray-200 text-sm outline-none"
          />
          <ul className="max-h-48 overflow-y-auto">
            {filtered.length === 0 && <li className="px-3 py-2 text-sm text-gray-400">No matches</li>}
            {filtered.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  onClick={() => { onChange(opt); setOpen(false); setQuery(""); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-green-50
                    ${opt === value ? "bg-green-100 text-green-800 font-medium" : "text-gray-700"}`}
                >
                  {opt}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Detail Panel (per card) ────────────────────────────
function DetailPanel({ rec, inputs }: { rec: any; inputs: any }) {
  const [tab, setTab] = useState<"details" | "economics">("details");
  const sc = rec.scores;
  const cd = rec.cropDetails;
  const ec = rec.economics;

  const rows = [
    { f: "N (kg/ha)", you: inputs.nitrogen, range: `${cd.npkRange.N.min}–${cd.npkRange.N.max}`, score: sc.nitrogen },
    { f: "P (kg/ha)", you: inputs.phosphorus, range: `${cd.npkRange.P.min}–${cd.npkRange.P.max}`, score: sc.phosphorus },
    { f: "K (kg/ha)", you: inputs.potassium, range: `${cd.npkRange.K.min}–${cd.npkRange.K.max}`, score: sc.potassium },
    { f: "pH", you: inputs.ph, range: `${cd.phRange.min}–${cd.phRange.max}`, score: sc.ph },
    { f: "Season", you: inputs.season, range: cd.season, score: sc.season },
    { f: "Water", you: inputs.waterLabel, range: cd.waterRequirement, score: sc.water },
    { f: "Soil", you: inputs.soilLabel, range: cd.suitableSoils, score: sc.soil },
  ];

  const StatusIcon = ({ s }: { s: number }) =>
    s >= 65 ? <CheckCircle2 size={14} color="#16a34a" /> :
    s >= 40 ? <AlertCircle size={14} color="#d97706" /> :
              <XCircle size={14} color="#dc2626" />;

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <div className="flex gap-2 mb-4">
        {(["details", "economics"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition
              ${tab === t ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {t === "details" ? "Crop Details" : "Economics"}
          </button>
        ))}
      </div>

      {tab === "details" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-500">Season: </span><span className="font-medium">{cd.season}</span></div>
            <div><span className="text-gray-500">Duration: </span><span className="font-medium">{cd.duration} days</span></div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Water Requirement: </span>
              <span className="px-2 py-0.5 rounded text-white text-xs font-medium"
                style={{ backgroundColor: waterLevelColor(cd.waterRequirement) }}>
                {cd.waterRequirement}
              </span>
            </div>
            <div><span className="text-gray-500">Optimal NPK: </span>
              <span className="font-medium">N: {cd.optimalNPK.N} | P: {cd.optimalNPK.P} | K: {cd.optimalNPK.K} kg/ha</span>
            </div>
            <div><span className="text-gray-500">Optimal pH: </span><span className="font-medium">{cd.optimalPH}</span></div>
            <div><span className="text-gray-500">Suitable Soils: </span><span className="font-medium">{cd.suitableSoils}</span></div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-500 mb-2">SCORE BREAKDOWN</div>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-600">
                  <tr><th className="text-left p-2">Factor</th><th className="text-left p-2">Your</th>
                    <th className="text-left p-2">Crop</th><th className="text-left p-2">Score</th></tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.f} className="border-t border-gray-100">
                      <td className="p-2 font-medium">{r.f}</td>
                      <td className="p-2 text-gray-700">{String(r.you)}</td>
                      <td className="p-2 text-gray-700 truncate max-w-[120px]">{r.range}</td>
                      <td className="p-2"><span className="inline-flex items-center gap-1">
                        <StatusIcon s={r.score} />{r.score}%
                      </span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="md:col-span-2 space-y-2">
            {rec.breakdown.filter((b: any) => b.score < 0.65).map((b: any, i: number) => {
              const isAlert = b.score < 0.40;
              return (
                <div key={i}
                  className={`flex gap-2 items-start p-3 rounded-lg border text-sm
                    ${isAlert ? "bg-red-50 border-red-200 text-red-800"
                              : "bg-amber-50 border-amber-200 text-amber-800"}`}>
                  {isAlert ? <XCircle size={16} className="mt-0.5 shrink-0" />
                           : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
                  <span>{b.message}</span>
                </div>
              );
            })}
            {cd.agronomistRemarks && (
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 italic text-sm text-gray-700">
                📋 Agronomist Note: {cd.agronomistRemarks}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "economics" && ec && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <MetricCard title="MSP / FRP" value={`₹${ec.msp ?? "—"}`} sub="per quintal" badge={ec.mspApplicable ? "Govt. Price" : null} />
            <MetricCard title="Avg. Yield" value={`${ec.avgYield ?? "—"}`} sub="qtl/hectare" />
            <MetricCard title="Input Cost" value={`₹${ec.inputCost ?? "—"}`} sub="per hectare" />
            <MetricCard title="Gross Revenue" value={`₹${ec.grossRevenue ?? "—"}`} sub="per hectare" />
            <MetricCard title="Net Return" value={`₹${ec.netReturn ?? "—"}`} sub="per hectare"
              highlight={ec.netReturn > 0} />
            <MetricCard title="Price Risk" value={ec.volatilityRisk || "—"} sub="volatility" pillColor={riskColor(ec.volatilityRisk)} />
          </div>
          <p className="text-xs text-gray-500 mt-3 italic">
            * Economics are approximate national averages. Actual returns vary by region, variety, and market conditions.
          </p>
        </>
      )}
    </div>
  );
}

function MetricCard({ title, value, sub, badge, highlight, pillColor }: {
  title: string; value: string; sub: string; badge?: string | null;
  highlight?: boolean; pillColor?: string;
}) {
  return (
    <div className={`p-3 rounded-lg border ${highlight ? "bg-green-50 border-green-300" : "bg-white border-gray-200"}`}>
      <div className="text-[11px] text-gray-500 uppercase tracking-wide">{title}</div>
      {pillColor ? (
        <div className="mt-1">
          <span className="inline-block px-2 py-0.5 rounded text-white text-xs font-semibold" style={{ backgroundColor: pillColor }}>
            {value}
          </span>
        </div>
      ) : (
        <div className={`text-lg font-bold mt-0.5 ${highlight ? "text-green-700" : "text-gray-900"}`}>{value}</div>
      )}
      <div className="text-[11px] text-gray-500">{sub}</div>
      {badge && <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">{badge}</span>}
    </div>
  );
}

// ─── Crop Result Card ───────────────────────────────────
function CropResultCard({ rec, rank, inputs }: { rec: any; rank: number; inputs: any }) {
  const [open, setOpen] = useState(false);
  const conf = rec.confidence;
  return (
    <div
      className="bg-white rounded-xl shadow-md p-5 border-l-[5px] transition-transform hover:scale-[1.01]"
      style={{ borderLeftColor: conf.color }}
    >
      {/* Top row */}
      <div className="flex flex-col md:flex-row gap-4 md:items-center">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-green-600 text-white font-bold flex items-center justify-center shrink-0">
            #{rank}
          </div>
          <div className="min-w-0">
            <h3 className="text-xl font-bold text-gray-900 truncate">{rec.cropName}</h3>
            {rec.localName && <p className="text-xs text-gray-500 truncate">{rec.localName}</p>}
            <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full border border-gray-300 text-gray-600">
              {rec.cropCategory}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-start md:items-center gap-1">
          <span className="font-bold text-sm" style={{ color: conf.color }}>{conf.label}</span>
          <Stars n={conf.stars} />
        </div>
        <div className="flex items-center gap-3">
          <CircularScore value={rec.finalScore} color={conf.color} />
          <div className="text-xs text-gray-500">Match<br />Score</div>
        </div>
      </div>

      {/* Score bars */}
      <div className="mt-5 grid grid-cols-7 gap-2">
        <ScoreBar label="N" value={rec.scores.nitrogen} />
        <ScoreBar label="P" value={rec.scores.phosphorus} />
        <ScoreBar label="K" value={rec.scores.potassium} />
        <ScoreBar label="pH" value={rec.scores.ph} />
        <ScoreBar label="Season" value={rec.scores.season} />
        <ScoreBar label="Water" value={rec.scores.water} />
        <ScoreBar label="Soil" value={rec.scores.soil} />
      </div>

      {open && <DetailPanel rec={rec} inputs={inputs} />}

      <button
        onClick={() => setOpen((o) => !o)}
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-green-700 hover:text-green-800"
      >
        {open ? "Hide Details" : "View Details"}
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
    </div>
  );
}

// ─── Results Section ────────────────────────────────────
function ResultsSection({ results, formState }: { results: any; formState: FormState }) {
  if (!results) return null;
  const recs = results.recommendations || [];
  const summary = results.inputSummary;
  const soilLabel = soilMapping.userFacingOptions.find((o: any) => o.id === formState.soilTypeId)?.label || "";
  const waterLabel = waterConfig.userOptions.find((o: any) => o.id === formState.waterAvailabilityId)?.label || "";

  const inputs = {
    nitrogen: formState.nitrogen, phosphorus: formState.phosphorus, potassium: formState.potassium,
    ph: formState.ph, season: formState.season, soilLabel, waterLabel,
  };

  return (
    <section id="results-section" className="max-w-5xl mx-auto px-4 md:px-0 mt-10 pb-16">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Recommendations for Your Farm</h2>
        <div className="flex flex-wrap gap-2 mt-3">
          <Pill icon={<MapPin size={12} />}>{summary.state}, {summary.district}</Pill>
          <Pill bg={seasonChipColor(summary.season)} text="#fff">{summary.season}</Pill>
          <Pill>{summary.soilType}</Pill>
          <Pill>NPK: N:{formState.nitrogen} P:{formState.phosphorus} K:{formState.potassium}</Pill>
        </div>
        {results.districtClimate && (
          <p className="text-xs text-gray-500 mt-2">
            Based on {summary.district}'s climate — {results.districtClimate.agro_climatic_zone}
          </p>
        )}
      </div>

      {recs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <AlertCircle size={40} className="mx-auto text-orange-500" />
          <p className="mt-3 font-semibold text-gray-800">No crops matched for the selected season and conditions.</p>
          <p className="text-sm text-gray-500 mt-1">Try selecting a different season or adjusting your nutrient values.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {recs.map((r: any, i: number) => (
            <CropResultCard key={r.cropName} rec={r} rank={i + 1} inputs={inputs} />
          ))}
        </div>
      )}
    </section>
  );
}

function Pill({ children, bg, text, icon }: any) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border border-gray-200"
      style={{ backgroundColor: bg || "#f3f4f6", color: text || "#374151" }}>
      {icon}{children}
    </span>
  );
}

// ─── Recommendation Form ────────────────────────────────
function RecommendationForm({
  formState, setFormState, errors, loading, onSubmit,
  districtClimate, suggestedSoils,
}: {
  formState: FormState; setFormState: (s: FormState) => void;
  errors: Record<string, string>; loading: boolean; onSubmit: () => void;
  districtClimate: any; suggestedSoils: string[];
}) {
  const [advOpen, setAdvOpen] = useState(false);
  const [tip, setTip] = useState(false);

  const states = useMemo(() => getStateList(districtData), []);
  const dists = useMemo(() => getDistrictList(formState.state, districtData), [formState.state]);

  const setField = (patch: Partial<FormState>) => setFormState({ ...formState, ...patch });

  const onStateChange = (v: string) => setField({ state: v, district: "", soilTypeId: "" });

  const onDistrictChange = (v: string) => {
    const sug = getSuggestedSoilTypesForDistrict(formState.state, v, districtData, soilMapping);
    setFormState({
      ...formState,
      district: v,
      soilTypeId: sug.length === 1 ? sug[0] : formState.soilTypeId,
    });
  };

  const phNum = Number(formState.ph) || 7;
  const band = phBand(phNum);

  return (
    <section className="max-w-[900px] mx-auto px-4 md:px-0 mt-8">
      <div className="bg-white rounded-xl shadow-md p-6 md:p-8">
        {/* Farm & Soil Details */}
        <h2 className="text-base font-semibold text-green-700 mb-4">Farm & Soil Details</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="State" error={errors.state}>
            <Combobox value={formState.state} onChange={onStateChange}
              options={states} placeholder="Select state" error={!!errors.state} />
          </Field>

          <Field label="District" error={errors.district}>
            <Combobox value={formState.district} onChange={onDistrictChange}
              options={dists}
              placeholder={formState.state ? "Select district" : "Select a state first"}
              disabled={!formState.state} error={!!errors.district} />
          </Field>

          <Field label="Soil Type" subLabel="Pre-suggested from your district — you can change it" error={errors.soilTypeId}>
            <div className="relative">
              <select
                value={formState.soilTypeId}
                onChange={(e) => setField({ soilTypeId: e.target.value })}
                className={`w-full px-3 py-2.5 rounded-lg border bg-white shadow-sm appearance-none pr-9
                  ${errors.soilTypeId ? "border-red-500" : "border-gray-300"}`}
              >
                <option value="">Select soil type</option>
                {soilMapping.userFacingOptions.map((o: any) => {
                  const sug = suggestedSoils.includes(o.id);
                  return (
                    <option key={o.id} value={o.id}>
                      {o.label}{sug ? " ★" : ""}
                    </option>
                  );
                })}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            {suggestedSoils.length > 0 && (
              <p className="text-xs text-green-700 mt-1">
                Suggested for this district: {suggestedSoils.map((id) =>
                  soilMapping.userFacingOptions.find((o: any) => o.id === id)?.label).filter(Boolean).join(", ")}
              </p>
            )}
          </Field>

          <Field label="Water Availability" error={errors.waterAvailabilityId}>
            <div className="relative">
              <select
                value={formState.waterAvailabilityId}
                onChange={(e) => setField({ waterAvailabilityId: e.target.value })}
                className={`w-full px-3 py-2.5 rounded-lg border bg-white shadow-sm appearance-none pr-9
                  ${errors.waterAvailabilityId ? "border-red-500" : "border-gray-300"}`}
              >
                <option value="">Select water availability</option>
                {waterConfig.userOptions.map((o: any) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
              <Droplets size={16} className="absolute right-9 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </Field>
        </div>

        {/* Season */}
        <div className="mt-5">
          <label className="text-sm font-medium text-gray-700">Crop Season</label>
          <div className="grid grid-cols-2 gap-3 mt-2">
            {SEASONS.map(({ id, label, sub, Icon }) => {
              const active = formState.season === id;
              return (
                <button
                  type="button"
                  key={id}
                  onClick={() => setField({ season: id })}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 transition text-left
                    ${active ? "bg-green-600 text-white border-green-700"
                             : "bg-white text-gray-700 border-gray-200 hover:border-green-400"}`}
                >
                  <Icon size={22} />
                  <div>
                    <div className="font-semibold text-sm">{label}</div>
                    <div className={`text-xs ${active ? "text-white/80" : "text-gray-500"}`}>{sub}</div>
                  </div>
                </button>
              );
            })}
          </div>
          {errors.season && <p className="text-xs text-red-600 mt-1">{errors.season}</p>}
        </div>

        {/* Nutrient inputs */}
        <div className="mt-6 flex items-center gap-2 relative">
          <h2 className="text-base font-semibold text-green-700">Soil Test / Nutrient Values (kg/ha)</h2>
          <button type="button" onMouseEnter={() => setTip(true)} onMouseLeave={() => setTip(false)}
            onClick={() => setTip((t) => !t)} className="text-gray-400 hover:text-gray-600">
            <HelpCircle size={16} />
          </button>
          {tip && (
            <div className="absolute z-10 left-0 top-7 max-w-xs bg-gray-900 text-white text-xs p-2 rounded shadow-lg">
              Enter your soil test report values or your planned fertilizer dose in kg per hectare.
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
          <NumberField label="Nitrogen (N)" unit="kg/ha" value={formState.nitrogen}
            onChange={(v) => setField({ nitrogen: v })} min={0} max={300} placeholder="e.g. 100" error={errors.nitrogen} />
          <NumberField label="Phosphorus (P)" unit="kg/ha" value={formState.phosphorus}
            onChange={(v) => setField({ phosphorus: v })} min={0} max={200} placeholder="e.g. 60" error={errors.phosphorus} />
          <NumberField label="Potassium (K)" unit="kg/ha" value={formState.potassium}
            onChange={(v) => setField({ potassium: v })} min={0} max={500} placeholder="e.g. 60" error={errors.potassium} />
        </div>

        {/* pH */}
        <div className="mt-6">
          <label className="text-sm font-medium text-gray-700">Soil pH</label>
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center mt-2">
            <input
              type="number" step={0.1} min={3.5} max={9.5}
              value={formState.ph}
              onChange={(e) => setField({ ph: e.target.value })}
              placeholder="e.g. 6.8"
              className={`w-full md:w-32 px-3 py-2.5 rounded-lg border bg-white shadow-sm
                ${errors.ph ? "border-red-500" : "border-gray-300"}`}
            />
            <input
              type="range" min={3.5} max={9.5} step={0.1}
              value={formState.ph || 7}
              onChange={(e) => setField({ ph: e.target.value })}
              className="flex-1 w-full accent-green-600"
            />
          </div>
          <div className="grid grid-cols-5 gap-1 mt-3 text-[10px] text-center">
            {[
              { range: "3.5–5.5", label: "Strongly Acidic", color: "#ef4444" },
              { range: "5.5–6.5", label: "Slightly Acidic", color: "#eab308" },
              { range: "6.5–7.5", label: "Neutral / Ideal", color: "#16a34a" },
              { range: "7.5–8.5", label: "Slightly Alkaline", color: "#f97316" },
              { range: "8.5–9.5", label: "Strongly Alkaline", color: "#dc2626" },
            ].map((b) => {
              const active = b.label === band.label && formState.ph !== "";
              return (
                <div key={b.range}
                  className="rounded-md p-1 transition"
                  style={{
                    backgroundColor: b.color,
                    color: "#fff",
                    opacity: !formState.ph ? 0.7 : active ? 1 : 0.45,
                    transform: active ? "scale(1.05)" : "scale(1)",
                  }}>
                  <div className="font-bold">{b.range}</div>
                  <div>{b.label}</div>
                </div>
              );
            })}
          </div>
          {errors.ph && <p className="text-xs text-red-600 mt-1">{errors.ph}</p>}
        </div>

        {/* Advanced collapsible */}
        <div className="mt-6 border border-gray-200 rounded-lg">
          <button
            type="button"
            onClick={() => setAdvOpen((o) => !o)}
            className="w-full flex items-center justify-between p-3 text-sm font-medium text-gray-700"
          >
            <span>Advanced — Climate Data (auto-filled from district)</span>
            {advOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {advOpen && (
            <div className="bg-gray-100 p-4 border-t border-gray-200 transition-all">
              {districtClimate && (
                <div className="flex items-center gap-2 text-xs text-green-700 mb-3">
                  <span className="w-2 h-2 rounded-full bg-green-600" />
                  Auto-filled from district data
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <ClimateItem Icon={Thermometer} label="Avg Temperature"
                  value={districtClimate ? `${districtClimate.avg_min_temp_c}°C – ${districtClimate.avg_max_temp_c}°C` : "—"} />
                <ClimateItem Icon={Droplets} label="Avg Humidity"
                  value={districtClimate ? `${districtClimate.avg_humidity_percent} %` : "—"} />
                <ClimateItem Icon={Leaf} label="Agro-Climatic Zone"
                  value={districtClimate?.agro_climatic_zone || "—"} />
                <ClimateItem Icon={Cloud} label="Annual Rainfall"
                  value={districtClimate ? `${districtClimate.annual_rainfall_mm} mm` : "—"} />
                <ClimateItem Icon={Droplets} label="Water Source"
                  value={districtClimate?.primary_water_source || "—"} />
                <ClimateItem Icon={TrendingUp} label="Irrigation Cover"
                  value={districtClimate ? `${districtClimate.irrigation_coverage} % irrigated` : "—"} />
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="button"
          disabled={loading}
          onClick={onSubmit}
          className="mt-6 w-full h-[52px] rounded-lg font-semibold text-white text-lg transition flex items-center justify-center gap-2 disabled:opacity-70"
          style={{ backgroundColor: loading ? C.dark : C.primary }}
          onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = C.dark)}
          onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = C.primary)}
        >
          {loading ? (<><Loader2 className="animate-spin" size={20} /> Analysing your farm data...</>)
                   : (<>Get Crop Recommendations →</>)}
        </button>
      </div>
    </section>
  );
}

function Field({ label, subLabel, error, children }: any) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {subLabel && <p className="text-[11px] text-gray-500 mb-1">{subLabel}</p>}
      <div className={subLabel ? "" : "mt-1"}>{children}</div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function NumberField({ label, unit, value, onChange, min, max, placeholder, error }: { label: string; unit: string; value: string; onChange: (v: string) => void; min: number; max: number; placeholder: string; error?: string }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="relative mt-1">
        <input
          type="number" min={min} max={max} step={1}
          value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className={`w-full pl-3 pr-16 py-2.5 rounded-lg border bg-white shadow-sm
            ${error ? "border-red-500" : "border-gray-300"}`}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-medium text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
          {unit}
        </span>
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function ClimateItem({ Icon, label, value }: any) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={16} className="text-green-700 mt-0.5 shrink-0" />
      <div>
        <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
        <div className="font-medium text-gray-900">{value}</div>
      </div>
    </div>
  );
}

// ─── Root Page ──────────────────────────────────────────
export default function RecommendationPage() {
  const [formState, setFormState] = useState<FormState>({
    state: "", district: "", soilTypeId: "",
    nitrogen: "", phosphorus: "", potassium: "", ph: "",
    season: "", waterAvailabilityId: "",
  });
  const [districtClimate, setDistrictClimate] = useState<any>(null);
  const [suggestedSoils, setSuggestedSoils] = useState<string[]>([]);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Recompute climate + suggested soils whenever state/district change
  const updateForm = (next: FormState) => {
    if (next.state !== formState.state || next.district !== formState.district) {
      if (next.state && next.district) {
        setDistrictClimate(resolveDistrictClimate(next.state, next.district, districtData));
        setSuggestedSoils(getSuggestedSoilTypesForDistrict(next.state, next.district, districtData, soilMapping));
      } else {
        setDistrictClimate(null);
        setSuggestedSoils([]);
      }
    }
    setFormState(next);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formState.state) e.state = "Please select a state";
    if (!formState.district) e.district = "Please select a district";
    if (!formState.soilTypeId) e.soilTypeId = "Please select a soil type";
    if (!formState.season) e.season = "Please select a season";
    if (!formState.waterAvailabilityId) e.waterAvailabilityId = "Please select water availability";
    if (formState.nitrogen === "") e.nitrogen = "Required";
    if (formState.phosphorus === "") e.phosphorus = "Required";
    if (formState.potassium === "") e.potassium = "Required";
    if (formState.ph === "") e.ph = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = () => {
    if (!validate()) return;
    setLoading(true);
    const userInputs = {
      state: formState.state, district: formState.district, soilTypeId: formState.soilTypeId,
      nitrogen: Number(formState.nitrogen), phosphorus: Number(formState.phosphorus),
      potassium: Number(formState.potassium), ph: Number(formState.ph),
      season: formState.season, waterAvailabilityId: formState.waterAvailabilityId,
    };
    const out = getRecommendations(userInputs, cropData, districtData, soilMapping, waterConfig,
      { topN: 5, includeAll: false });
    setResults(out);
    setLoading(false);
    setTimeout(() => {
      document.getElementById("results-section")?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.pageBg, color: C.text, fontFamily: "Inter, system-ui, sans-serif" }}>
      <PageHeader />
      <RecommendationForm
        formState={formState}
        setFormState={updateForm}
        errors={errors}
        loading={loading}
        onSubmit={onSubmit}
        districtClimate={districtClimate}
        suggestedSoils={suggestedSoils}
      />
      <ResultsSection results={results} formState={formState} />
    </div>
  );
}
