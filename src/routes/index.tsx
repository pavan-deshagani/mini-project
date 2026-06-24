import { createFileRoute, Link } from "@tanstack/react-router";
import { useTheme } from "@/hooks/use-theme";
import heroFarmerImg from "@/assets/hero-farmer.jpg";
import cropBgImg from "@/assets/crop-bg.jpg";
import diseasedLeafImg from "@/assets/diseased-leaf.jpg";

const heroFarmer = { url: heroFarmerImg };
const cropBg = { url: cropBgImg };
const diseasedLeaf = { url: diseasedLeafImg };

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AgriSmart — AI for Better Farming" },
      { name: "description", content: "AI-powered crop recommendations and early plant disease detection for Indian farmers." },
    ],
  }),
  component: Index,
});

function LeafLogo() {
  return (
    <svg width="36" height="36" viewBox="0 0 40 40" fill="none" aria-hidden>
      <path d="M20 36c0-9 5-15 14-17-2 10-7 16-14 17z" fill="#4CAF50" />
      <path d="M20 36c0-9-5-15-14-17 2 10 7 16 14 17z" fill="#1B4D2E" />
      <path d="M20 36V18" stroke="#1B4D2E" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Nav() {
  const { theme, toggle } = useTheme();
  const links = ["Home", "About Us", "Features", "How It Works", "Resources", "Contact"];
  return (
    <header className="sticky top-0 z-50 bg-white shadow-[var(--shadow-nav)] transition-colors duration-300 dark:bg-zinc-950 dark:shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-8 py-4">
        <div className="flex items-center gap-3">
          <LeafLogo />
          <div className="leading-tight">
            <div className="font-display text-[22px] font-bold text-brand dark:text-white">AgriSmart</div>
            <div className="text-[11px] text-subtle dark:text-gray-400">AI for Better Farming</div>
          </div>
        </div>
        <nav className="hidden items-center gap-9 lg:flex">
          {links.map((l) => {
            const active = l === "Home";
            return (
              <a
                key={l}
                href="#"
                className={`relative text-[15px] font-medium transition-colors ${active ? "text-brand dark:text-brand-accent" : "text-charcoal hover:text-brand dark:text-gray-300 dark:hover:text-white"}`}
              >
                <span className="inline-flex items-center gap-1">
                  {l}
                  {l === "Resources" && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  )}
                </span>
                {active && <span className="absolute -bottom-2 left-0 right-0 h-[2px] rounded-full bg-brand-accent" />}
              </a>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <button onClick={toggle} aria-label="Toggle theme" className="grid h-10 w-10 place-items-center rounded-full border border-border bg-white text-charcoal transition-colors hover:bg-brand-soft dark:border-gray-700 dark:bg-gray-800 dark:text-yellow-300 dark:hover:bg-gray-700">
            {theme === "dark" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
            )}
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Login / Sign Up
          </button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-white transition-colors duration-300 dark:bg-gray-950">
      {/* Full-bleed background image with sunset visible */}
      <div className="absolute inset-0">
        <img
          src={heroFarmer.url}
          alt="Indian farmer in a white turban holding a tablet, overlooking lush crop rows at golden sunrise"
          className="h-full w-full object-cover"
          style={{ objectPosition: "70% center" }}
        />
        {/* Warm fade: fully opaque white-cream on far left fading to transparent ~55% — keeps farmer and sunset fully visible on right */}
        <div className="pointer-events-none absolute inset-0 dark:hidden" style={{background: "linear-gradient(to right, rgba(255,252,245,0.99) 0%, rgba(255,250,240,0.96) 15%, rgba(255,245,230,0.88) 26%, rgba(255,235,205,0.68) 36%, rgba(255,220,170,0.38) 46%, rgba(255,210,150,0.12) 54%, rgba(255,255,255,0) 62%)"}} />
        {/* Dark mode overlay */}
        <div className="pointer-events-none absolute inset-0 hidden bg-black/40 dark:block" />
      </div>

      <div className="relative mx-auto grid min-h-[720px] max-w-[1400px] grid-cols-1 lg:grid-cols-[52%_48%]">
        {/* Text */}
        <div className="relative z-10 flex flex-col justify-center px-8 pb-12 pt-14 lg:pb-[60px] lg:pt-[80px]">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-brand-soft px-4 py-1.5 text-[13px] font-semibold text-brand shadow-sm dark:bg-white/10 dark:text-brand-accent dark:ring-1 dark:ring-white/15">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c4 4 6 8 6 12a6 6 0 11-12 0c0-4 2-8 6-12z"/></svg>
            Smart Solutions for Smart Farmers
          </div>
          <h1
            className="mt-6 font-display font-extrabold text-[#111111] max-md:text-[44px] dark:text-white"
            style={{ fontSize: "72px", lineHeight: 0.95, letterSpacing: "-1px" }}
          >
            Grow Better.<br />
            Grow <span className="text-brand-accent">Smarter.</span>
            <span className="ml-2 inline-block align-middle">
              <svg width="44" height="44" viewBox="0 0 40 40" fill="none"><path d="M30 6c-8 1-16 6-18 14-1 5 1 10 5 13 6-1 14-6 16-14 1-5-1-10-3-13z" fill="#4CAF50"/><path d="M10 33c4-8 12-16 22-22" stroke="#1B4D2E" strokeWidth="2" strokeLinecap="round"/></svg>
            </span>
          </h1>
          <p className="mt-6 max-w-[650px] text-[18px] text-[#3d3d3d] dark:text-gray-300" style={{ lineHeight: 1.8 }}>
            Use AI-powered insights to get the best crop recommendations and detect plant diseases early. Start your journey to a healthier, more productive farm.
          </p>
          <div className="mt-9 flex flex-wrap gap-10">
            {[
              { title: "Better Yield", sub: "Increase productivity", icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1B4D2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22V8"/><path d="M12 8c0-3 2-5 5-5-1 4-3 6-5 6z"/><path d="M12 8c0-3-2-5-5-5 1 4 3 6 5 6z"/></svg>
              )},
              { title: "Early Detection", sub: "Protect your crops", icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1B4D2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z"/><path d="M9 12l2 2 4-4"/></svg>
              )},
            ].map((b) => (
              <div key={b.title} className="flex items-center gap-3">
                <div className="grid h-[52px] w-[52px] place-items-center rounded-full bg-brand-soft shadow-[0_4px_14px_rgba(27,77,46,0.10)] dark:bg-white/10 dark:ring-1 dark:ring-white/15 [&_svg]:dark:stroke-brand-accent">{b.icon}</div>
                <div>
                  <div className="text-[15px] font-bold text-charcoal dark:text-white">{b.title}</div>
                  <div className="text-[13px] text-subtle dark:text-gray-300">{b.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column spacer — image is full-bleed background */}
        <div className="hidden lg:block" />

      </div>
    </section>
  );
}

function CheckItem({ children, color }: { children: React.ReactNode; color: "green" | "blue" }) {
  const bg = color === "green" ? "bg-brand-accent" : "bg-blueink";
  return (
    <li className="flex items-center gap-3 text-[15px] text-charcoal dark:text-gray-200">
      <span className={`grid h-5 w-5 place-items-center rounded-full ${bg} text-white`}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>
      </span>
      {children}
    </li>
  );
}

type Pill = { label: string; value: string; x: number; y: number; icon: React.ReactNode; highlight?: boolean };

function CropInfographic() {
  // Coordinates relative to a 460x460 viewbox stage
  const pills: Pill[] = [
    {
      label: "pH", value: "6.5", x: 230, y: 30,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1B4D2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3v10a5 5 0 0010 0V3"/><path d="M7 8h10"/></svg>,
    },
    {
      label: "Temperature", value: "24°C", x: 50, y: 130,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E07A3B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14.76V4a2 2 0 10-4 0v10.76a4 4 0 104 0z"/></svg>,
    },
    {
      label: "Moisture", value: "65%", x: 410, y: 130,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2F8FD9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.5s7 7.5 7 12.5a7 7 0 11-14 0c0-5 7-12.5 7-12.5z"/></svg>,
    },
    {
      label: "Nutrients", value: "NPK", x: 50, y: 330,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B5A2B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="8" r="3"/><circle cx="16" cy="10" r="2.5"/><circle cx="11" cy="16" r="2.5"/></svg>,
    },
    {
      label: "Sunlight", value: "8h", x: 410, y: 330, highlight: true,
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" fill="#ffffff" stroke="none"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>,
    },
  ];
  const cx = 230, cy = 230, r = 150;

  return (
    <div className="pointer-events-none absolute right-0 top-1/2 hidden h-[500px] w-[500px] -translate-y-1/2 translate-x-6 md:block">
      <svg viewBox="0 0 460 460" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="orbitGlow" cx="50%" cy="50%" r="50%">
            <stop offset="60%" stopColor="rgba(255,255,255,0)" />
            <stop offset="85%" stopColor="rgba(255,255,255,0.55)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <radialGradient id="plantGlow" cx="50%" cy="55%" r="45%">
            <stop offset="0%" stopColor="rgba(180,230,150,0.85)" />
            <stop offset="60%" stopColor="rgba(180,230,150,0.15)" />
            <stop offset="100%" stopColor="rgba(180,230,150,0)" />
          </radialGradient>
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="leafGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7FD16A" />
            <stop offset="100%" stopColor="#2E7D34" />
          </linearGradient>
          <linearGradient id="soilGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5C3A21" />
            <stop offset="100%" stopColor="#3B2412" />
          </linearGradient>
        </defs>

        {/* Plant ambient glow */}
        <circle cx={cx} cy={cy} r={170} fill="url(#plantGlow)" />

        {/* Orbit ring with luminous glow */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#orbitGlow)" strokeWidth="18" opacity="0.7" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.2" filter="url(#softGlow)" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.6" strokeDasharray="2 6" />

        {/* Connection nodes on orbit, aligned with each pill direction */}
        {pills.map((p, i) => {
          const dx = p.x - cx, dy = p.y - cy;
          const len = Math.sqrt(dx * dx + dy * dy);
          const nx = cx + (dx / len) * r;
          const ny = cy + (dy / len) * r;
          return (
            <g key={i}>
              <circle cx={nx} cy={ny} r="6" fill="rgba(255,255,255,0.35)" filter="url(#softGlow)" />
              <circle cx={nx} cy={ny} r="3" fill="#ffffff" />
            </g>
          );
        })}

        {/* Plant illustration — centered, ~70% of stage height */}
        <g transform={`translate(${cx} ${cy + 60})`}>
          {/* soft shadow */}
          <ellipse cx="0" cy="48" rx="70" ry="10" fill="rgba(0,60,20,0.18)" />
          {/* soil mound */}
          <path d="M-78 36 Q0 8 78 36 L70 56 Q0 70 -70 56 Z" fill="url(#soilGrad)" />
          <path d="M-78 36 Q0 8 78 36" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
          {/* stem */}
          <path d="M0 30 C-4 -20 4 -90 0 -150" stroke="#2E7D34" strokeWidth="5" fill="none" strokeLinecap="round" />
          {/* leaves — left/right pairs, then top */}
          <g filter="url(#softGlow)">
            <path d="M0 -20 C-50 -30 -75 -70 -55 -95 C-25 -85 -5 -55 0 -25 Z" fill="url(#leafGrad)" />
            <path d="M0 -20 C50 -30 75 -70 55 -95 C25 -85 5 -55 0 -25 Z" fill="url(#leafGrad)" />
            <path d="M0 -70 C-55 -80 -85 -125 -60 -150 C-25 -135 -5 -105 0 -75 Z" fill="url(#leafGrad)" />
            <path d="M0 -70 C55 -80 85 -125 60 -150 C25 -135 5 -105 0 -75 Z" fill="url(#leafGrad)" />
            <path d="M0 -130 C-22 -145 -35 -175 -10 -195 C5 -180 8 -160 4 -135 Z" fill="url(#leafGrad)" />
            <path d="M0 -130 C22 -145 35 -175 10 -195 C-5 -180 -8 -160 -4 -135 Z" fill="url(#leafGrad)" />
          </g>
          {/* leaf rim light */}
          <path d="M-55 -95 C-40 -80 -15 -55 0 -25" stroke="rgba(255,255,255,0.55)" strokeWidth="0.8" fill="none" />
          <path d="M55 -95 C40 -80 15 -55 0 -25" stroke="rgba(255,255,255,0.55)" strokeWidth="0.8" fill="none" />
          <path d="M-60 -150 C-40 -130 -15 -100 0 -75" stroke="rgba(255,255,255,0.45)" strokeWidth="0.7" fill="none" />
          <path d="M60 -150 C40 -130 15 -100 0 -75" stroke="rgba(255,255,255,0.45)" strokeWidth="0.7" fill="none" />
        </g>
      </svg>

      {/* Glass pills as HTML for crisp text */}
      {pills.map((p) => (
        <div
          key={p.label}
          className={`absolute flex h-[78px] w-[78px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full text-center backdrop-blur-md ${
            p.highlight
              ? "bg-[#4CAF50] shadow-[0_0_28px_rgba(120,210,90,0.85),inset_0_0_12px_rgba(255,255,255,0.35)] ring-2 ring-white/80"
              : "bg-white/55 shadow-[0_0_22px_rgba(255,255,255,0.55),inset_0_0_10px_rgba(255,255,255,0.6)] ring-1 ring-white/80"
          }`}
          style={{ left: `${(p.x / 460) * 100}%`, top: `${(p.y / 460) * 100}%` }}
        >
          <div className="flex h-4 items-center justify-center">{p.icon}</div>
          <div className={`mt-0.5 text-[10px] font-semibold leading-tight ${p.highlight ? "text-white" : "text-brand"}`}>{p.label}</div>
          <div className={`text-[12px] font-bold leading-tight ${p.highlight ? "text-white" : "text-charcoal"}`}>{p.value}</div>
        </div>
      ))}
    </div>
  );
}


function FeatureCards() {
  return (
    <section className="mx-auto -mt-10 max-w-[1400px] px-8">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Crop Recommendation */}
        <article
          className="group relative overflow-hidden rounded-2xl p-8 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_36px_rgba(0,0,0,0.09)] dark:border dark:border-gray-700 dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
          style={{ backgroundColor: "#EEF6EE" }}
        >
          {/* Full-bleed background image — absolutely positioned to guarantee 100% fill */}
          <img
            src={cropBg.url}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover scale-110"
            style={{ objectPosition: "80% center" }}
          />
          {/* Dark mode overlay */}
          <div className="pointer-events-none absolute inset-0 hidden dark:block" style={{background: "linear-gradient(to right, rgba(17,24,39,0.95) 0%, rgba(17,24,39,0.85) 35%, rgba(17,24,39,0.55) 60%, rgba(17,24,39,0.15) 80%, transparent 100%)"}} />

          <div className="relative z-10 max-w-[58%]">
            <div className="grid h-14 w-14 place-items-center rounded-xl bg-white shadow-sm dark:bg-gray-700">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand dark:text-brand-accent"><path d="M12 22V11"/><path d="M12 11c0-4 3-7 7-7-1 5-4 7-7 7z"/><path d="M12 14c0-3-2-5-5-5 1 3 3 5 5 5z"/><path d="M4 22h16"/></svg>
            </div>
            <h2 className="mt-5 font-display text-[26px] font-bold text-brand dark:text-white">Crop Recommendation</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[#5b5b5b] dark:text-gray-300">
              Get AI-powered recommendations for the best crops to grow based on your soil, climate and location.
            </p>
            <ul className="mt-5 space-y-2.5">
              <CheckItem color="green">Soil &amp; Climate Analysis</CheckItem>
              <CheckItem color="green">High Yield Suggestions</CheckItem>
              <CheckItem color="green">Sustainable Farming</CheckItem>
            </ul>
            <Link to="/crop-recommendation" className="mt-7 inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark dark:bg-brand-accent dark:hover:bg-[#3d9140]">
              Get Recommendation
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </Link>
          </div>
        </article>

        {/* Disease Detection */}
        <article className="group relative overflow-hidden rounded-2xl bg-[#F0F4FF] p-8 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_36px_rgba(0,0,0,0.09)] dark:border dark:border-gray-700 dark:bg-gray-800">
          <div className="relative z-10 max-w-[60%]">
            <div className="grid h-14 w-14 place-items-center rounded-xl bg-white shadow-sm dark:bg-gray-700">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blueink dark:text-blue-300"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/><path d="M11 8c-1.5 1.5-2 3-2 5"/></svg>
            </div>
            <h2 className="mt-5 font-display text-[26px] font-bold text-blueink dark:text-white">Disease Detection</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[#5b5b5b] dark:text-gray-300">
              Detect plant diseases early by uploading leaf images and get AI-based solutions and treatment tips.
            </p>
            <ul className="mt-5 space-y-2.5">
              <CheckItem color="blue">Instant Disease Detection</CheckItem>
              <CheckItem color="blue">Treatment Suggestions</CheckItem>
              <CheckItem color="blue">Crop Health Protection</CheckItem>
            </ul>
            <Link to="/disease-detection" className="mt-7 inline-flex items-center gap-2 rounded-lg bg-blueink px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#12275a] dark:bg-blue-500 dark:hover:bg-blue-600">
              Detect Disease
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </Link>
          </div>
          <div className="absolute right-6 top-1/2 hidden -translate-y-1/2 flex-col items-center gap-2 md:flex">
            <div className="relative h-[240px] w-[240px] overflow-hidden rounded-2xl shadow-lg ring-2 ring-white/80 dark:ring-gray-600">
              <img src={diseasedLeaf.url} alt="Close-up of a diseased leaf with brown spots" className="h-full w-full object-cover object-center" />
            </div>
            <span className="text-[13px] font-medium text-[#5b5b5b] dark:text-gray-400">Upload Leaf Image</span>
          </div>
        </article>
      </div>
    </section>
  );
}

function Stats() {
  const items = [
    { icon: (
        <svg width="22" height="26" viewBox="0 0 24 24" fill="none" stroke="#1B4D2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M21 21v-2a4 4 0 00-3-3.87"/><path d="M17 3.13A4 4 0 0117 11"/></svg>
      ), value: "10K+", label: "Happy Farmers", sub: "Trusting AgriSmart" },
    { icon: (
        <svg width="22" height="26" viewBox="0 0 24 24" fill="none" stroke="#1B4D2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22V11"/><path d="M12 11c0-4 3-7 7-7-1 5-4 7-7 7z"/><path d="M12 14c0-3-2-5-5-5 1 3 3 5 5 5z"/></svg>
      ), value: "50+", label: "Crops Supported", sub: "For diverse environments" },
    { icon: (
        <svg width="22" height="26" viewBox="0 0 24 24" fill="none" stroke="#1B4D2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z"/><path d="M9 12l2 2 4-4"/></svg>
      ), value: "95%", label: "Accuracy", sub: "In our AI predictions" },
    { icon: (
        <svg width="22" height="26" viewBox="0 0 24 24" fill="none" stroke="#1B4D2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2c3 3.5 4.5 7.5 4.5 10S15 19 12 22c-3-3-4.5-7.5-4.5-10S9 5.5 12 2z"/></svg>
      ), value: "100+", label: "Regions Covered", sub: "Across the country" },
  ];
  return (
    <section className="mx-auto max-w-[1400px] px-8 py-12">
      <div className="grid grid-cols-2 gap-6 rounded-2xl bg-white p-8 shadow-[var(--shadow-card)] md:grid-cols-4 dark:border dark:border-gray-700 dark:bg-gray-800">
        {items.map((it) => (
          <div key={it.label} className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-soft dark:bg-gray-700 [&_svg]:dark:stroke-brand-accent">{it.icon}</div>
            <div>
              <div className="font-display text-[34px] font-bold leading-none text-brand dark:text-white">{it.value}</div>
              <div className="mt-1.5 text-[14px] font-semibold text-charcoal dark:text-gray-200">{it.label}</div>
              <div className="text-[12px] text-subtle dark:text-gray-400">{it.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Index() {
  return (
    <div className="min-h-screen bg-white transition-colors duration-300 dark:bg-gray-950">
      <Nav />
      <main>
        <Hero />
        <FeatureCards />
        <Stats />
      </main>
    </div>
  );
}