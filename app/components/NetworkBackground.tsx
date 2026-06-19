'use client'

export function NetworkBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <svg
        className="h-full w-full opacity-[0.04]"
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4DD8E8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#4DD8E8" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Connection lines */}
        {[
          [400, 100, 200, 250],
          [400, 100, 550, 200],
          [400, 100, 650, 350],
          [400, 100, 150, 350],
          [400, 100, 300, 400],
          [200, 250, 150, 350],
          [550, 200, 650, 350],
          [550, 200, 300, 400],
          [200, 250, 100, 450],
          [650, 350, 550, 480],
          [300, 400, 150, 500],
          [150, 350, 100, 450],
        ].map(([x1, y1, x2, y2], i) => (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#4DD8E8"
            strokeWidth={0.5}
            opacity={0.3 + Math.random() * 0.4}
          />
        ))}

        {/* Nodes */}
        {[
          [400, 100, 6],
          [200, 250, 4],
          [550, 200, 4],
          [150, 350, 3],
          [650, 350, 3],
          [300, 400, 3],
          [100, 450, 2],
          [550, 480, 2],
          [150, 500, 2],
        ].map(([cx, cy, r], i) => (
          <g key={i}>
            <circle cx={cx} cy={cy} r={r * 4} fill="url(#nodeGlow)" />
            <circle cx={cx} cy={cy} r={r} fill="#4DD8E8" opacity={0.6} />
          </g>
        ))}
      </svg>
    </div>
  )
}
