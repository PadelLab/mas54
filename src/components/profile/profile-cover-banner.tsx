/** Geometric banner (purple, orange, blue, cyan) for the profile header. */
export function ProfileCoverBanner({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 320"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="1200" height="320" fill="#1e1b4b" />
        <polygon points="0,0 420,0 280,320 0,320" fill="#4f46e5" />
        <polygon points="280,0 620,0 520,320 140,320" fill="#f97316" />
        <polygon points="480,0 860,0 780,320 380,320" fill="#38bdf8" />
        <polygon points="720,0 1200,0 1200,320 640,320" fill="#7c3aed" />
        <polygon points="0,80 220,0 360,200" fill="#22d3ee" opacity="0.85" />
        <polygon points="900,0 1200,0 1200,180 980,80" fill="#fb923c" />
        <polygon points="540,40 780,0 700,220" fill="#6366f1" opacity="0.9" />
        <polygon points="200,180 480,80 420,320 80,320" fill="#0ea5e9" opacity="0.55" />
        <polygon points="760,120 1100,40 1200,320 820,320" fill="#a855f7" opacity="0.45" />
      </svg>
    </div>
  );
}
