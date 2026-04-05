import { useEffect, useMemo, useState } from 'react'

export default function ProgressRing({
  value = 0,
  size = 96,
  strokeWidth = 10,
  label,
  color = '#138808',
  trackColor = '#e7e5e4',
}) {
  const clamped = Math.max(0, Math.min(100, Number(value || 0)))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const target = clamped
    let frame = 0
    const duration = 350
    const steps = 24
    const interval = duration / steps

    const timer = window.setInterval(() => {
      frame += 1
      const progress = Math.min(frame / steps, 1)
      setDisplayValue(Math.round(target * progress))
      if (progress >= 1) {
        window.clearInterval(timer)
      }
    }, interval)

    return () => window.clearInterval(timer)
  }, [clamped])

  const dashOffset = useMemo(
    () => circumference - (displayValue / 100) * circumference,
    [circumference, displayValue]
  )

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 300ms ease-in-out' }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-sm font-semibold text-stone-900">{displayValue}%</p>
        {label ? <p className="text-[10px] text-stone-500">{label}</p> : null}
      </div>
    </div>
  )
}
