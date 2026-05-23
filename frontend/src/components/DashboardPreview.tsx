/**
 * Visual mock of the AI Code Reviewer dashboard, rendered as inline
 * SVG so it's crisp at any size and never breaks.
 *
 * Used by the Home page's "hero preview" section. If you'd rather use
 * a real screenshot or stock photo, replace the contents of this
 * component with an `<img src="…" />` or the `<HeroImage src=…>`
 * variant below.
 */

import React from "react";

/** SVG mock of the dashboard. */
export default function DashboardPreview(): JSX.Element {
  return (
    <svg
      viewBox="0 0 1280 720"
      xmlns="http://www.w3.org/2000/svg"
      className="block h-full w-full"
      role="img"
      aria-label="AI Code Reviewer dashboard preview"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="dp-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0b1020" />
          <stop offset="100%" stopColor="#1a2240" />
        </linearGradient>
        <linearGradient id="dp-accent" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#c084fc" />
        </linearGradient>
        <linearGradient id="dp-ring-green" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
        <linearGradient id="dp-ring-amber" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="dp-ring-rose" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#e11d48" />
        </linearGradient>
        <filter id="dp-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="6"
            stdDeviation="14"
            floodColor="#000"
            floodOpacity="0.45"
          />
        </filter>
      </defs>

      {/* Backdrop */}
      <rect width="1280" height="720" fill="url(#dp-bg)" />
      <circle cx="220" cy="160" r="280" fill="#6366f1" fillOpacity="0.18" />
      <circle cx="1080" cy="540" r="240" fill="#a855f7" fillOpacity="0.16" />

      {/* App window chrome */}
      <g filter="url(#dp-shadow)">
        <rect
          x="80"
          y="60"
          width="1120"
          height="600"
          rx="22"
          fill="#0f1530"
          stroke="#1f2a4b"
          strokeWidth="1.5"
        />
        {/* Title bar */}
        <rect
          x="80"
          y="60"
          width="1120"
          height="46"
          rx="22"
          fill="#11172b"
          stroke="#1f2a4b"
          strokeWidth="1.5"
        />
        <rect x="80" y="92" width="1120" height="14" fill="#11172b" />
        <circle cx="108" cy="83" r="6" fill="#ef4444" />
        <circle cx="128" cy="83" r="6" fill="#fbbf24" />
        <circle cx="148" cy="83" r="6" fill="#22c55e" />

        {/* Browser URL bar */}
        <rect
          x="190"
          y="72"
          width="540"
          height="22"
          rx="11"
          fill="#0b1020"
          stroke="#1f2a4b"
          strokeWidth="1"
        />
        <text
          x="208"
          y="88"
          fill="#94a3b8"
          fontSize="12"
          fontFamily="ui-monospace, monospace"
        >
          ai-code-reviewer.local/dashboard
        </text>
      </g>

      {/* Sidebar */}
      <g>
        <rect x="100" y="126" width="180" height="514" rx="14" fill="#11172b" />
        {/* Logo block */}
        <rect x="120" y="144" width="32" height="32" rx="8" fill="url(#dp-accent)" />
        <text x="162" y="166" fill="#ffffff" fontWeight="700" fontSize="14">
          Reviewer
        </text>

        {/* Nav items */}
        {[
          { label: "Dashboard", y: 210, active: true },
          { label: "Charts", y: 246, active: false },
          { label: "Settings", y: 282, active: false },
        ].map((item) => (
          <g key={item.label}>
            <rect
              x="116"
              y={item.y - 16}
              width="148"
              height="28"
              rx="8"
              fill={item.active ? "#6366f1" : "transparent"}
              fillOpacity={item.active ? 0.18 : 1}
            />
            <text
              x="132"
              y={item.y + 2}
              fill={item.active ? "#e2e8f0" : "#94a3b8"}
              fontSize="13"
              fontWeight={item.active ? "600" : "500"}
            >
              {item.label}
            </text>
          </g>
        ))}

        {/* Avatar block */}
        <rect x="116" y="556" width="148" height="60" rx="10" fill="#0b1020" />
        <circle cx="138" cy="586" r="14" fill="url(#dp-accent)" />
        <text x="160" y="582" fill="#e2e8f0" fontSize="12" fontWeight="600">
          ashwin
        </text>
        <text x="160" y="598" fill="#64748b" fontSize="10">
          GitHub connected
        </text>
      </g>

      {/* Main panel */}
      <g>
        {/* Page heading */}
        <text x="310" y="160" fill="#ffffff" fontSize="22" fontWeight="700">
          Your Reviews
        </text>
        <text x="310" y="180" fill="#94a3b8" fontSize="12">
          Every pull request our AI has analyzed for you.
        </text>

        {/* Stat cards row */}
        <g>
          {[
            { label: "TOTAL PRs", value: "128", accent: "#818cf8", x: 310 },
            { label: "AVG SCORE", value: "8.4 / 10", accent: "#34d399", x: 522 },
            { label: "BUGS", value: "47", accent: "#fbbf24", x: 734 },
            { label: "SECURITY", value: "12", accent: "#fb7185", x: 946 },
          ].map((stat) => (
            <g key={stat.label}>
              <rect
                x={stat.x}
                y="204"
                width="200"
                height="80"
                rx="14"
                fill="#11172b"
                stroke="#1f2a4b"
              />
              <text
                x={stat.x + 18}
                y="228"
                fill={stat.accent}
                fontSize="10"
                fontWeight="700"
                letterSpacing="2"
              >
                {stat.label}
              </text>
              <text
                x={stat.x + 18}
                y="266"
                fill="#ffffff"
                fontSize="22"
                fontWeight="700"
              >
                {stat.value}
              </text>
            </g>
          ))}
        </g>

        {/* Review cards */}
        {[
          {
            y: 310,
            repo: "acme/payments",
            pr: "#482  Refactor checkout error handling",
            score: "9",
            ring: "url(#dp-ring-green)",
            tags: [
              { label: "LOW", color: "#38bdf8", text: "#082f49" },
              { label: "MEDIUM", color: "#fbbf24", text: "#3f2d04" },
            ],
            summary: "Tight diff. One bug, three suggestions, no security risks.",
          },
          {
            y: 430,
            repo: "acme/web",
            pr: "#1203  Add dark-mode toggle and persist via localStorage",
            score: "7",
            ring: "url(#dp-ring-amber)",
            tags: [
              { label: "HIGH", color: "#fb923c", text: "#431407" },
              { label: "MEDIUM", color: "#fbbf24", text: "#3f2d04" },
              { label: "LOW", color: "#38bdf8", text: "#082f49" },
            ],
            summary: "Missing memoization may re-render the whole tree on toggle.",
          },
          {
            y: 550,
            repo: "acme/api",
            pr: "#812  Stream LLM responses from /v1/completions",
            score: "4",
            ring: "url(#dp-ring-rose)",
            tags: [
              { label: "CRITICAL", color: "#f43f5e", text: "#4c0519" },
              { label: "HIGH", color: "#fb923c", text: "#431407" },
            ],
            summary: "API key leaks into log lines and unbounded buffer growth.",
          },
        ].map((card) => (
          <g key={card.y}>
            <rect
              x="310"
              y={card.y}
              width="836"
              height="100"
              rx="14"
              fill="#11172b"
              stroke="#1f2a4b"
            />
            <text
              x="332"
              y={card.y + 28}
              fill="#ffffff"
              fontWeight="700"
              fontSize="13"
            >
              {card.repo}
            </text>
            <text
              x="332"
              y={card.y + 50}
              fill="#cbd5f5"
              fontSize="12"
            >
              {card.pr}
            </text>
            <text
              x="332"
              y={card.y + 74}
              fill="#64748b"
              fontSize="11"
              fontStyle="italic"
            >
              {card.summary}
            </text>

            {/* Tag chips */}
            {card.tags.map((tag, i) => (
              <g key={tag.label}>
                <rect
                  x={332 + i * 78}
                  y={card.y + 80}
                  width={72}
                  height={16}
                  rx={8}
                  fill={tag.color}
                  fillOpacity="0.18"
                  stroke={tag.color}
                  strokeOpacity="0.5"
                />
                <text
                  x={332 + i * 78 + 36}
                  y={card.y + 92}
                  fill={tag.color}
                  fontSize="9"
                  fontWeight="700"
                  letterSpacing="1.5"
                  textAnchor="middle"
                >
                  {tag.label}
                </text>
              </g>
            ))}

            {/* Score ring */}
            <g transform={`translate(${1070}, ${card.y + 50})`}>
              <circle
                r="28"
                fill="none"
                stroke="#1f2a4b"
                strokeWidth="5"
              />
              <circle
                r="28"
                fill="none"
                stroke={card.ring}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${(2 * Math.PI * 28 * Number(card.score)) / 10} ${2 * Math.PI * 28}`}
                transform="rotate(-90)"
              />
              <text
                x="0"
                y="3"
                fill="#ffffff"
                fontSize="16"
                fontWeight="700"
                textAnchor="middle"
              >
                {card.score}
              </text>
              <text
                x="0"
                y="18"
                fill="#94a3b8"
                fontSize="8"
                letterSpacing="1.5"
                textAnchor="middle"
              >
                / 10
              </text>
            </g>
          </g>
        ))}
      </g>
    </svg>
  );
}

/**
 * Optional alternative: render a real image / GIF / Unsplash photo
 * by importing this instead of `DashboardPreview` in `Home.tsx`.
 *
 *   import { HeroImage } from "../components/DashboardPreview";
 *   <HeroImage src="https://images.unsplash.com/photo-1551288049-..." alt="..." />
 */
export function HeroImage({
  src,
  alt,
}: {
  src: string;
  alt: string;
}): JSX.Element {
  return (
    <img
      src={src}
      alt={alt}
      className="block h-full w-full object-cover"
      loading="lazy"
    />
  );
}
