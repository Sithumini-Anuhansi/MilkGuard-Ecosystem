// Simple, dependency-free DairyHub mark: a milk-drop badge + wordmark.
// `variant="light"` (default) is for light backgrounds; `variant="dark"` is
// for use on dark/gradient surfaces (sidebar, login hero).
export default function Logo({ variant = "light", showTagline = false, size = "md" }) {
  const isDark = variant === "dark";
  const sizes = {
    sm: { badge: 32, title: "text-lg", tagline: "text-[10px]" },
    md: { badge: 40, title: "text-2xl", tagline: "text-xs" },
    lg: { badge: 56, title: "text-4xl", tagline: "text-sm" },
  };
  const s = sizes[size] || sizes.md;

  return (
    <div className="flex items-center gap-3">
      <svg
        width={s.badge}
        height={s.badge}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="milkguard-logo-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>
        <path
          d="M24 4C24 4 12 20 12 30C12 36.6274 17.3726 42 24 42C30.6274 42 36 36.6274 36 30C36 20 24 4 24 4Z"
          fill="url(#milkguard-logo-grad)"
        />
        <path
          d="M18 30C18 27 20 25 20 25"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.85"
        />
      </svg>

      <div>
        <h1 className={`${s.title} font-bold leading-none ${isDark ? "text-white" : "text-blue-700"}`}>
          Dairy<span className={isDark ? "text-sky-300" : "text-sky-500"}>Hub</span>
        </h1>
        {showTagline && (
          <p className={`${s.tagline} mt-1 ${isDark ? "text-blue-200" : "text-gray-500"}`}>
            Smart Dairy Management
          </p>
        )}
      </div>
    </div>
  );
}
