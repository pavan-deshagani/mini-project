import { createFileRoute, Link } from "@tanstack/react-router";
import RecommendationPage from "@/components/RecommendationPage";

export const Route = createFileRoute("/crop-recommendation")({
  head: () => ({
    meta: [
      { title: "Crop Recommendation System | AgriSmart" },
      {
        name: "description",
        content:
          "Get the best crops for your land based on soil, climate, season and water availability across Indian districts.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: CropRecommendationRoute,
});

function CropRecommendationRoute() {
  return (
    <div>
      {/* Back to home bar */}
      <div className="sticky top-0 z-50 flex items-center gap-3 bg-white/95 px-6 py-3 shadow-sm backdrop-blur-sm dark:bg-zinc-950/95 border-b border-gray-100 dark:border-gray-800">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand-soft transition-colors dark:text-green-400 dark:hover:bg-green-900/30"
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
          🌱 Crop Recommendation System
        </span>
      </div>
      <RecommendationPage />
    </div>
  );
}
