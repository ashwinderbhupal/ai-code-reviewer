/**
 * Inline SVG icon set used throughout the dashboard.
 *
 * Bundling icons as React components (instead of pulling in a library
 * like lucide-react) keeps the build small and avoids another peer
 * dependency.
 */

import React from "react";

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

function withDefaults({
  size = 16,
  className = "",
  ...rest
}: IconProps): React.SVGProps<SVGSVGElement> {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    "aria-hidden": true,
    ...rest,
  };
}

export const BugIcon = (props: IconProps): JSX.Element => (
  <svg {...withDefaults(props)}>
    <path d="M8 6a4 4 0 0 1 8 0" />
    <rect x="6" y="8" width="12" height="11" rx="6" />
    <path d="M12 8v11M3 12h3M18 12h3M5 6l2 2M19 6l-2 2M5 18l2-2M19 18l-2-2" />
  </svg>
);

export const ShieldIcon = (props: IconProps): JSX.Element => (
  <svg {...withDefaults(props)}>
    <path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

export const ZapIcon = (props: IconProps): JSX.Element => (
  <svg {...withDefaults(props)}>
    <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
  </svg>
);

export const SparkleIcon = (props: IconProps): JSX.Element => (
  <svg {...withDefaults(props)}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
  </svg>
);

export const WrenchIcon = (props: IconProps): JSX.Element => (
  <svg {...withDefaults(props)}>
    <path d="M14 7a4 4 0 1 1-5 5l-6 6 3 3 6-6a4 4 0 0 1 5-5l-2-2 2-2 2 2-2 2-3-3z" />
  </svg>
);

export const GitHubIcon = (props: IconProps): JSX.Element => (
  <svg {...withDefaults({ strokeWidth: 0, fill: "currentColor", ...props })}>
    <path d="M12 .5C5.73.5.67 5.56.67 11.83c0 5.02 3.25 9.27 7.76 10.78.57.1.78-.24.78-.55v-2.1c-3.16.69-3.83-1.36-3.83-1.36-.52-1.31-1.27-1.66-1.27-1.66-1.04-.71.08-.69.08-.69 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.52-.29-5.18-1.26-5.18-5.6 0-1.24.45-2.25 1.18-3.04-.12-.29-.51-1.45.11-3.02 0 0 .96-.31 3.15 1.16a10.9 10.9 0 0 1 5.74 0c2.18-1.47 3.14-1.16 3.14-1.16.63 1.57.23 2.73.11 3.02.73.79 1.18 1.8 1.18 3.04 0 4.35-2.67 5.31-5.21 5.59.41.35.77 1.04.77 2.11v3.13c0 .31.2.66.78.55a11.34 11.34 0 0 0 7.76-10.78C23.33 5.56 18.27.5 12 .5z" />
  </svg>
);

export const ExternalLinkIcon = (props: IconProps): JSX.Element => (
  <svg {...withDefaults(props)}>
    <path d="M14 4h6v6" />
    <path d="M20 4L10 14" />
    <path d="M20 13v7H4V4h7" />
  </svg>
);

export const CopyIcon = (props: IconProps): JSX.Element => (
  <svg {...withDefaults(props)}>
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
  </svg>
);

export const DownloadIcon = (props: IconProps): JSX.Element => (
  <svg {...withDefaults(props)}>
    <path d="M12 4v12" />
    <path d="M7 11l5 5 5-5" />
    <path d="M5 20h14" />
  </svg>
);

export const ChevronIcon = (props: IconProps): JSX.Element => (
  <svg {...withDefaults(props)}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const SunIcon = (props: IconProps): JSX.Element => (
  <svg {...withDefaults(props)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

export const MoonIcon = (props: IconProps): JSX.Element => (
  <svg {...withDefaults(props)}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);

export const SearchIcon = (props: IconProps): JSX.Element => (
  <svg {...withDefaults(props)}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </svg>
);

export const SettingsIcon = (props: IconProps): JSX.Element => (
  <svg {...withDefaults(props)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);

export const ChartIcon = (props: IconProps): JSX.Element => (
  <svg {...withDefaults(props)}>
    <path d="M3 3v18h18" />
    <path d="M7 15l4-4 4 4 5-7" />
  </svg>
);

export const AlertIcon = (props: IconProps): JSX.Element => (
  <svg {...withDefaults(props)}>
    <path d="M12 3l10 18H2L12 3z" />
    <path d="M12 9v6M12 18h.01" />
  </svg>
);

export const InboxIcon = (props: IconProps): JSX.Element => (
  <svg {...withDefaults(props)}>
    <path d="M3 13l3-9h12l3 9" />
    <path d="M3 13h6l1 2h4l1-2h6v6H3z" />
  </svg>
);

export const RefreshIcon = (props: IconProps): JSX.Element => (
  <svg {...withDefaults(props)}>
    <path d="M3 12a9 9 0 0 1 16-5.7L21 4" />
    <path d="M21 4v5h-5" />
    <path d="M21 12a9 9 0 0 1-16 5.7L3 20" />
    <path d="M3 20v-5h5" />
  </svg>
);
