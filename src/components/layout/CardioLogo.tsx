export type CardioArea = "front" | "writer" | "admin";

function getAreaColour(area: CardioArea) {
  if (area === "admin") return "text-red-500";
  if (area === "writer") return "text-amber-500";
  return "text-emerald-500";
}

export default function CardioLogo({
  area,
  className = "",
  size = "default",
}: {
  area: CardioArea;
  className?: string;
  size?: "default" | "footer";
}) {
  const dimensions = size === "footer" ? "h-5 w-14" : "h-7 w-20";

  return (
    <svg
      viewBox="0 0 76 30"
      className={`${dimensions} shrink-0 ${getAreaColour(area)} ${className}`.trim()}
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 16h13l5-10 7 19 8-16 6 7h33" opacity="0.22" />
      <path d="M2 16h13l5-10 7 19 8-16 6 7h33" strokeDasharray="22 64">
        <animate
          attributeName="stroke-dashoffset"
          from="86"
          to="0"
          dur="1.35s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  );
}
