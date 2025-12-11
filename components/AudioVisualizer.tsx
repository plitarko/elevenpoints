"use client";

import { useEffect, useState } from "react";

interface AudioVisualizerProps {
  isActive: boolean;
}

export default function AudioVisualizer({ isActive }: AudioVisualizerProps) {
  const [barHeight, setBarHeight] = useState(20);

  useEffect(() => {
    if (!isActive) {
      setBarHeight(20);
      return;
    }

    const interval = setInterval(() => {
      // Random height between 20 and 100 when active
      setBarHeight(Math.floor(Math.random() * 80) + 20);
    }, 100);

    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-16 h-24 flex items-end justify-center bg-gray-900 rounded-lg p-2">
        <div
          className="w-8 bg-orange-500 rounded-sm transition-all duration-100"
          style={{ height: `${barHeight}%` }}
        />
      </div>
      <span className="text-xs text-gray-400">
        {isActive ? "AI SPEAKING" : "Listening..."}
      </span>
    </div>
  );
}
