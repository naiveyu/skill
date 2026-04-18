import { SVGProps } from 'react'

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number
}

const defaultProps = (size: number = 16): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const
})

// ---- Sidebar tabs ----

export function FilesIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 18v-6" />
      <path d="M14 18v-3" />
    </svg>
  )
}

export function SearchIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

export function TagIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props}>
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
    </svg>
  )
}

export function RefreshCwIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props}>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  )
}

// ---- File tree ----

export function FileTextIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 13H8" />
      <path d="M16 17H8" />
      <path d="M16 13h-2" />
    </svg>
  )
}

export function MarkdownIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props} strokeWidth={1.5}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M6 8v8l3-3 3 3V8" />
      <path d="M18 16l-2-4-2 4" />
    </svg>
  )
}

export function FolderIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props}>
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    </svg>
  )
}

export function FolderOpenIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props}>
      <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

export function ImageIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props}>
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  )
}

export function CodeIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props}>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  )
}

export function PaletteIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props}>
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  )
}

export function PdfIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 12h4" />
      <path d="M10 16h4" />
    </svg>
  )
}

// ---- Chevrons ----

export function ChevronRightIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

export function ChevronDownIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

// ---- General ----

export function XIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

export function CircleIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props} fill="currentColor" stroke="none">
      <circle cx="12" cy="12" r="5" />
    </svg>
  )
}

// ---- Sync ----

export function WifiIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props}>
      <path d="M12 20h.01" />
      <path d="M2 8.82a15 15 0 0 1 20 0" />
      <path d="M5 12.859a10 10 0 0 1 14 0" />
      <path d="M8.5 16.429a5 5 0 0 1 7 0" />
    </svg>
  )
}

export function BluetoothIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props}>
      <path d="m7 7 10 10-5 5V2l5 5L7 17" />
    </svg>
  )
}

export function SmartphoneIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props}>
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
      <path d="M12 18h.01" />
    </svg>
  )
}

// ---- Editor ----

export function HistoryIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  )
}

export function EyeIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props}>
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function EyeOffIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props}>
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <path d="m2 2 20 20" />
    </svg>
  )
}

export function SaveIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props}>
      <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
      <path d="M7 3v4a1 1 0 0 0 1 1h7" />
    </svg>
  )
}

// ---- Editor: scroll & outline ----

export function ArrowUpIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props}>
      <path d="m5 12 7-7 7 7" />
      <path d="M12 19V5" />
    </svg>
  )
}

export function ArrowDownIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props}>
      <path d="m19 12-7 7-7-7" />
      <path d="M12 5v14" />
    </svg>
  )
}

export function ListIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props}>
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
      <path d="M3 6h.01" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M8 6h13" />
    </svg>
  )
}

// ---- Status bar ----

export function GlobeIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  )
}

// ---- Welcome page ----

export function PenLineIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props}>
      <path d="M12 20h9" />
      <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
    </svg>
  )
}

export function FolderOpenDotIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props}>
      <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
      <circle cx="14" cy="15" r="1" fill="currentColor" />
    </svg>
  )
}

export function FileJsonIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 12a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1 1 1 0 0 1 1 1v1a1 1 0 0 0 1 1" />
      <path d="M14 18a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1 1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1" />
    </svg>
  )
}

// ---- Feedback ----

export function MessageCircleIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props}>
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  )
}

export function BugIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props}>
      <path d="m8 2 1.88 1.88" />
      <path d="M14.12 3.88 16 2" />
      <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
      <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" />
      <path d="M12 20v-9" />
      <path d="M6.53 9C4.6 8.8 3 7.1 3 5" />
      <path d="M6 13H2" />
      <path d="M3 21c0-2.1 1.7-3.9 3.8-4" />
      <path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" />
      <path d="M22 13h-4" />
      <path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" />
    </svg>
  )
}

export function LightbulbIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props}>
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </svg>
  )
}

// ---- Publish ----

export function ShareIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props}>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" x2="12" y1="2" y2="15" />
    </svg>
  )
}

// ---- AI ----

export function SparklesIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props}>
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4" />
      <path d="M22 5h-4" />
    </svg>
  )
}

// ---- App Logo (origami crane) ----

export function UserIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

export function AppLogoIcon({ size = 64, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      {...props}
    >
      <defs>
        <linearGradient id="logo-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <path d="M32 26 L4 12 L22 36 Z" fill="url(#logo-g)" fillOpacity={0.7} />
      <path d="M22 36 L4 56 L10 52 L26 40 Z" fill="url(#logo-g)" fillOpacity={0.5} />
      <path d="M32 26 L22 36 L32 46 Z" fill="url(#logo-g)" fillOpacity={0.6} />
      <path d="M32 26 L42 36 L32 46 Z" fill="url(#logo-g)" fillOpacity={0.85} />
      <path d="M32 26 L60 12 L42 36 Z" fill="url(#logo-g)" />
      <path d="M42 36 L60 6 L56 12 L40 30 Z" fill="url(#logo-g)" fillOpacity={0.9} />
      <line x1="4" y1="12" x2="32" y2="36" stroke="white" strokeOpacity={0.15} strokeWidth={0.5} />
      <line x1="60" y1="12" x2="32" y2="36" stroke="white" strokeOpacity={0.15} strokeWidth={0.5} />
    </svg>
  )
}
