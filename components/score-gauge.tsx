"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface ScoreGaugeProps {
  score: number
  maxScore?: number
  size?: "sm" | "md" | "lg"
}

export function ScoreGauge({ score, maxScore = 5, size = "lg" }: ScoreGaugeProps) {
  const percentage = (score / maxScore) * 100
  const angle = (percentage / 100) * 180 - 90 // -90 to 90 degrees
  
  const getScoreColor = (score: number) => {
    if (score >= 4.0) return "#2ecc71"
    if (score >= 3.0) return "#e2a92b"
    if (score >= 2.0) return "#d4871a"
    return "#e05252"
  }

  const getScoreLabel = (score: number) => {
    if (score >= 4.5) return "Bajo"
    if (score >= 4) return "Bajo-Medio"
    if (score >= 3) return "Medio"
    if (score >= 2) return "Moderado-Alto"
    return "Alto"
  }

  const sizeClasses = {
    sm: { container: "w-32 h-20", text: "text-xl", label: "text-[10px]" },
    md: { container: "w-48 h-28", text: "text-3xl", label: "text-xs" },
    lg: { container: "w-64 h-36", text: "text-4xl", label: "text-sm" },
  }

  return (
    <div className={cn("relative flex flex-col items-center", sizeClasses[size].container)}>
      {/* Gauge background */}
      <svg viewBox="0 0 200 110" className="w-full h-full">
        {/* Depth markers */}
        {[0, 1, 2, 3, 4, 5].map((mark) => {
          const markAngle = ((mark / 5) * 180 - 90) * (Math.PI / 180)
          const x1 = 100 + Math.cos(markAngle) * 75
          const y1 = 100 + Math.sin(markAngle) * 75
          const x2 = 100 + Math.cos(markAngle) * 85
          const y2 = 100 + Math.sin(markAngle) * 85
          const labelX = 100 + Math.cos(markAngle) * 65
          const labelY = 100 + Math.sin(markAngle) * 65
          
          return (
            <g key={mark}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="currentColor"
                strokeWidth="2"
                className="text-brass/40"
              />
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[10px] font-mono"
              >
                {mark}
              </text>
            </g>
          )
        })}

        {/* Background arc */}
        <path
          d="M 15 100 A 85 85 0 0 1 185 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          className="text-navy-medium"
        />
        
        {/* Colored segments */}
        <path
          d="M 15 100 A 85 85 0 0 1 58 32"
          fill="none"
          stroke="#e05252"
          strokeWidth="12"
          strokeLinecap="round"
          opacity="0.6"
        />
        <path
          d="M 58 32 A 85 85 0 0 1 100 15"
          fill="none"
          stroke="#d4871a"
          strokeWidth="12"
          opacity="0.6"
        />
        <path
          d="M 100 15 A 85 85 0 0 1 142 32"
          fill="none"
          stroke="#e2a92b"
          strokeWidth="12"
          opacity="0.6"
        />
        <path
          d="M 142 32 A 85 85 0 0 1 185 100"
          fill="none"
          stroke="#2ecc71"
          strokeWidth="12"
          strokeLinecap="round"
          opacity="0.6"
        />

        {/* Needle */}
        <motion.g
          initial={{ rotate: -90 }}
          animate={{ rotate: angle }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
          style={{ transformOrigin: "100px 100px" }}
        >
          <polygon
            points="100,25 95,100 100,105 105,100"
            className="fill-brass"
          />
        </motion.g>

        {/* Center circle */}
        <circle cx="100" cy="100" r="12" className="fill-navy-dark stroke-brass" strokeWidth="3" />
        <circle cx="100" cy="100" r="5" className="fill-brass" />
      </svg>

      {/* Score display */}
      <div className="absolute bottom-0 flex flex-col items-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          className={cn("font-bold font-mono", sizeClasses[size].text)}
          style={{ color: getScoreColor(score) }}
        >
          {score.toFixed(1)}
        </motion.span>
        <span className={cn("text-muted-foreground", sizeClasses[size].label)}>
          / {maxScore}
        </span>
      </div>
    </div>
  )
}
