export function MalamBackground() {
  return (
    <svg
      className="absolute inset-0 h-full w-full pointer-events-none rounded-2xl"
      viewBox="0 0 334 208"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="bg-malam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--art-green)" />
          <stop offset="100%" stopColor="var(--art-green-dark)" />
        </linearGradient>
      </defs>
      <rect width="334" height="208" fill="url(#bg-malam)" />
      {/* Bulan sabit emas */}
      <path
        d="M282 24A22 22 0 1 0 282 68A30 30 0 0 0 282 24Z"
        fill="var(--art-gold)"
      />
      {/* Bintang-bintang putih kecil */}
      <circle cx="40" cy="35" r="1.5" fill="var(--color-surface)" opacity="0.8" />
      <circle cx="85" cy="65" r="1" fill="var(--color-surface)" opacity="0.7" />
      <circle cx="160" cy="25" r="1.5" fill="var(--color-surface)" opacity="0.6" />
      <circle cx="210" cy="75" r="1" fill="var(--color-surface)" opacity="0.7" />
      <circle cx="130" cy="110" r="1.2" fill="var(--color-surface)" opacity="0.5" />
    </svg>
  )
}

export function SenjaBackground() {
  return (
    <svg
      className="absolute inset-0 h-full w-full pointer-events-none rounded-2xl"
      viewBox="0 0 334 208"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="bg-senja" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--art-green)" />
          <stop offset="100%" stopColor="var(--art-green-dark)" />
        </linearGradient>
      </defs>
      <rect width="334" height="208" fill="url(#bg-senja)" />
      {/* Lingkaran emas senja */}
      <circle cx="250" cy="72" r="28" fill="var(--art-gold)" opacity="0.9" />
      {/* Siluet masjid */}
      <path
        d="M0 208V176h60v-18a30 30 0 0 1 60 0v18h40v-70l6-12 6 12v70h30v-26h36v26h96v32z"
        fill="var(--art-green-dark)"
      />
    </svg>
  )
}

export function PolaBackground() {
  return (
    <svg
      className="absolute inset-0 h-full w-full pointer-events-none rounded-2xl"
      viewBox="0 0 334 208"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="bg-pola" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--art-green)" />
          <stop offset="100%" stopColor="var(--art-green-dark)" />
        </linearGradient>
        <pattern
          id="rhombus-pattern"
          width="24"
          height="24"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M12 0 L24 12 L12 24 L0 12 Z"
            fill="none"
            stroke="var(--art-gold)"
            strokeWidth="1"
            strokeOpacity="0.3"
          />
        </pattern>
      </defs>
      <rect width="334" height="208" fill="url(#bg-pola)" />
      <rect width="334" height="208" fill="url(#rhombus-pattern)" />
    </svg>
  )
}
