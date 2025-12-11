"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function generateSessionId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function Home() {
  const router = useRouter();
  const supabase = createClient();

  const startGame = async (testMode: boolean = false) => {
    const sessionId = generateSessionId();

    // Create session in database
    const { error } = await supabase.from("sessions").insert({
      id: sessionId,
      p1_name: null,
      p2_name: null,
      round_name: null,
      q_number: 0,
      q_text: null,
      p1_score: 0,
      p2_score: 0,
      p1_round1_score: 0,
      p1_round2_score: 0,
      p1_round3_score: 0,
      p2_round1_score: 0,
      p2_round2_score: 0,
      p2_round3_score: 0,
    });

    if (error) {
      console.error("Error creating session:", error);
      alert("Failed to create game session. Please try again.");
      return;
    }

    // Navigate to game or test-game page
    const path = testMode ? `/test-game/${sessionId}` : `/game/${sessionId}`;
    router.push(path);
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
      {/* Title */}
      <h1
        className="text-6xl md:text-8xl font-bold text-orange-500 mb-2 tracking-tight"
        style={{ fontFamily: "Impact, sans-serif" }}
      >
        ELEVENPOINTS
      </h1>
      <h2
        className="text-2xl md:text-3xl font-bold text-cyan-400 mb-12"
        style={{ fontFamily: "Impact, sans-serif" }}
      >
        TRIVIA GAME SHOW
      </h2>

      {/* Game Info */}
      <div className="max-w-md text-center mb-12 space-y-4">
        <p className="text-gray-300">
          A two-player trivia battle hosted by an AI game show host.
        </p>
        <div className="text-sm text-gray-500 space-y-1">
          <p>• 3 rounds, 1 question per person per round</p>
          <p>• 3 seconds to answer</p>
          <p>• Round 3 features image questions</p>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => startGame(false)}
          className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-black font-bold text-xl rounded transition-colors"
          style={{ fontFamily: "Impact, sans-serif" }}
        >
          START GAME
        </button>
        <button
          onClick={() => startGame(true)}
          className="px-8 py-4 bg-gray-700 hover:bg-gray-600 text-white font-bold text-xl rounded transition-colors"
          style={{ fontFamily: "Impact, sans-serif" }}
        >
          TEST MODE
        </button>
      </div>

      {/* Footer */}
      <p className="mt-12 text-gray-600 text-sm">
        Test Mode: Manual controls, no AI credits used
      </p>
    </main>
  );
}
