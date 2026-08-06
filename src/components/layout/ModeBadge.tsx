import type { CardioArea } from "./CardioLogo";

function getMode(area: CardioArea) {
  if (area === "admin") return { label: "Admin", className: "bg-red-600" };
  if (area === "writer") return { label: "Back of House", className: "bg-amber-600" };
  return { label: "Front of House", className: "bg-green-600" };
}

export default function ModeBadge({ area }: { area: CardioArea }) {
  const mode = getMode(area);

  return (
    <span
      className={`relative isolate inline-flex min-h-9 shrink-0 items-center justify-center overflow-hidden rounded-full px-4 py-2 text-xs font-bold text-white shadow-sm ${mode.className}`}
      aria-label={`Current mode: ${mode.label}`}
    >
      <svg
        viewBox="0 0 76 30"
        className="pointer-events-none absolute inset-0 h-full w-full scale-x-125 text-white opacity-25"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M2 16h13l5-10 7 19 8-16 6 7h33" opacity="0.3" />
        <path d="M2 16h13l5-10 7 19 8-16 6 7h33" strokeDasharray="20 66">
          <animate attributeName="stroke-dashoffset" from="86" to="0" dur="1.7s" repeatCount="indefinite" />
        </path>
      </svg>
      <span className="relative z-10 drop-shadow-sm">{mode.label}</span>
    </span>
  );
}
