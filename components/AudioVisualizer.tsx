"use client";

import { useRive, useStateMachineInput } from "@rive-app/react-canvas";
import { useEffect, useState } from "react";

interface AudioVisualizerProps {
  isActive: boolean;
}

export default function AudioVisualizer({ isActive }: AudioVisualizerProps) {
  const [mouthValue, setMouthValue] = useState(0);

  const { rive, RiveComponent } = useRive({
    src: "/gorilla.riv",
    autoplay: true,
    stateMachines: "State Machine 1",
  });

  const mouthInput = useStateMachineInput(rive, "State Machine 1", "mouth");

  // Animate mouth value when active
  useEffect(() => {
    if (!isActive) {
      setMouthValue(0);
      return;
    }

    const interval = setInterval(() => {
      // Random value between 20 and 100 when active
      setMouthValue(Math.floor(Math.random() * 80) + 20);
    }, 100);

    return () => clearInterval(interval);
  }, [isActive]);

  // Update Rive input when mouthValue changes
  useEffect(() => {
    if (mouthInput) {
      mouthInput.value = mouthValue;
    }
  }, [mouthValue, mouthInput]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-[512px] h-[512px]">
        <RiveComponent />
      </div>
      <span className="text-xs text-gray-400">
        {isActive ? "AI SPEAKING" : "Listening..."}
      </span>
    </div>
  );
}
