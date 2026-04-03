"use client"

import { motion } from "framer-motion"

export function CompassLoader({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center" style={{ width: size, height: size }}>
      <motion.svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        {/* Outer ring */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-border"
        />
        {/* Cardinal points */}
        <g className="text-brass">
          <text x="50" y="15" textAnchor="middle" fontSize="10" fill="currentColor" fontWeight="bold">N</text>
          <text x="90" y="53" textAnchor="middle" fontSize="8" fill="currentColor">E</text>
          <text x="50" y="95" textAnchor="middle" fontSize="8" fill="currentColor">S</text>
          <text x="10" y="53" textAnchor="middle" fontSize="8" fill="currentColor">O</text>
        </g>
        {/* Compass needle */}
        <g>
          <polygon
            points="50,20 45,50 50,55 55,50"
            className="fill-port-red"
          />
          <polygon
            points="50,80 45,50 50,45 55,50"
            className="fill-foreground/80"
          />
        </g>
        {/* Center circle */}
        <circle
          cx="50"
          cy="50"
          r="5"
          className="fill-brass"
        />
      </motion.svg>
    </div>
  )
}
