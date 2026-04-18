interface LogoProps {
  size?: number
  className?: string
}

export function LogoMark({ size = 32, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--color-gradient-start)" />
          <stop offset="100%" stopColor="var(--color-gradient-end)" />
        </linearGradient>
      </defs>
      {/* Origami crane — back to front rendering */}
      {/* Left wing (behind, dimmer) */}
      <path d="M32 26 L4 12 L22 36 Z" fill="url(#logo-grad)" fillOpacity="0.7" />
      {/* Tail */}
      <path d="M22 36 L4 56 L10 52 L26 40 Z" fill="url(#logo-grad)" fillOpacity="0.5" />
      {/* Body left half */}
      <path d="M32 26 L22 36 L32 46 Z" fill="url(#logo-grad)" fillOpacity="0.6" />
      {/* Body right half */}
      <path d="M32 26 L42 36 L32 46 Z" fill="url(#logo-grad)" fillOpacity="0.85" />
      {/* Right wing (front, brighter) */}
      <path d="M32 26 L60 12 L42 36 Z" fill="url(#logo-grad)" />
      {/* Head / Neck */}
      <path d="M42 36 L60 6 L56 12 L40 30 Z" fill="url(#logo-grad)" fillOpacity="0.9" />
      {/* Fold creases */}
      <line x1="4" y1="12" x2="32" y2="36" stroke="white" strokeOpacity="0.15" strokeWidth="0.5" />
      <line x1="60" y1="12" x2="32" y2="36" stroke="white" strokeOpacity="0.15" strokeWidth="0.5" />
    </svg>
  )
}

export function LogoFull({ size = 32, className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <div className="flex flex-col">
        <span
          className="text-lg font-bold leading-tight text-[var(--color-text-primary)]"
          style={{ fontSize: size * 0.56 }}
        >
          AI-Note
        </span>
        <span
          className="text-[var(--color-text-muted)] leading-tight"
          style={{ fontSize: size * 0.28 }}
        >
          你的笔记，你做主
        </span>
      </div>
    </div>
  )
}
