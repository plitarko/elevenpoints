"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Session, SessionMedia } from "@/lib/types";
import AudioVisualizer from "@/components/AudioVisualizer";
import Image from "next/image";

// Game states for the test mode state machine
type GameState =
  | "welcome"
  | "get_p1_name"
  | "get_p2_name"
  | "ready"
  | "round1_intro"
  | "round1_q1"
  | "round1_a1"
  | "round1_q2"
  | "round1_a2"
  | "round2_intro"
  | "round2_q1"
  | "round2_a1"
  | "round2_q2"
  | "round2_a2"
  | "round3_intro"
  | "round3_topic"
  | "round3_q1_image"
  | "round3_q1"
  | "round3_a1"
  | "round3_q2_image"
  | "round3_q2"
  | "round3_a2"
  | "finale";

export default function TestGamePage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const supabase = createClient();

  const [session, setSession] = useState<Session | null>(null);
  const [media, setMedia] = useState<SessionMedia[]>([]);
  const [gameState, setGameState] = useState<GameState>("welcome");
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Form inputs
  const [p1NameInput, setP1NameInput] = useState("");
  const [p2NameInput, setP2NameInput] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [questionInput, setQuestionInput] = useState("");
  const [answerInput, setAnswerInput] = useState("");

  // Track current question number and round
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);

  // Fetch session data
  const fetchSession = useCallback(async () => {
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (error) {
      console.error("Error fetching session:", error);
      return;
    }

    setSession(data);
  }, [sessionId, supabase]);

  // Fetch media
  const fetchMedia = useCallback(async () => {
    const { data, error } = await supabase
      .from("session_media")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching media:", error);
      return;
    }

    setMedia(data || []);
  }, [sessionId, supabase]);

  // Initialize and subscribe
  useEffect(() => {
    fetchSession();
    fetchMedia();

    // Subscribe to session changes
    const sessionChannel = supabase
      .channel(`session-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          setSession(payload.new as Session);
        }
      )
      .subscribe();

    // Subscribe to media changes
    const mediaChannel = supabase
      .channel(`media-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "session_media",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setMedia((prev) => [...prev, payload.new as SessionMedia]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(mediaChannel);
    };
  }, [sessionId, supabase, fetchSession, fetchMedia]);

  // Simulate speaking
  const simulateSpeaking = (duration: number = 2000) => {
    setIsSpeaking(true);
    setTimeout(() => setIsSpeaking(false), duration);
  };

  // Update session via Edge Function
  const updateSession = async (updates: Record<string, unknown>) => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/update-session`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ session_id: sessionId, ...updates }),
      }
    );

    if (!response.ok) {
      console.error("Failed to update session");
    }
  };

  // Fetch image via Edge Function
  const fetchImage = async (topic: string) => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/fetch-image-url`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ session_id: sessionId, topic }),
      }
    );

    if (!response.ok) {
      console.error("Failed to fetch image");
    }
  };

  // Handle state transitions
  const handleNext = async () => {
    simulateSpeaking();

    switch (gameState) {
      case "welcome":
        setGameState("get_p1_name");
        break;

      case "get_p1_name":
        if (p1NameInput) {
          await updateSession({ p1_name: p1NameInput });
          setGameState("get_p2_name");
        }
        break;

      case "get_p2_name":
        if (p2NameInput) {
          await updateSession({ p2_name: p2NameInput });
          setGameState("ready");
        }
        break;

      case "ready":
        setGameState("round1_intro");
        break;

      case "round1_intro":
        await updateSession({ round_name: `Round 1: ${topicInput || "General"}` });
        setCurrentRound(1);
        setGameState("round1_q1");
        break;

      case "round1_q1":
        setCurrentQuestion(1);
        await updateSession({ q_number: 1, q_text: questionInput });
        setQuestionInput("");
        setGameState("round1_a1");
        break;

      case "round1_a1":
        const p1r1 = answerInput.toLowerCase() === "correct" ? 1 : 0;
        await updateSession({
          p1_score: p1r1,
          p1_round1_score: p1r1,
        });
        setAnswerInput("");
        setGameState("round1_q2");
        break;

      case "round1_q2":
        setCurrentQuestion(2);
        await updateSession({ q_number: 2, q_text: questionInput });
        setQuestionInput("");
        setGameState("round1_a2");
        break;

      case "round1_a2":
        const p2r1 = answerInput.toLowerCase() === "correct" ? 1 : 0;
        await updateSession({
          p2_score: (session?.p2_score || 0) + p2r1,
          p2_round1_score: p2r1,
        });
        setAnswerInput("");
        setTopicInput("");
        setGameState("round2_intro");
        break;

      case "round2_intro":
        await updateSession({ round_name: `Round 2: ${topicInput || "Science"}` });
        setCurrentRound(2);
        setGameState("round2_q1");
        break;

      case "round2_q1":
        setCurrentQuestion(3);
        await updateSession({ q_number: 3, q_text: questionInput });
        setQuestionInput("");
        setGameState("round2_a1");
        break;

      case "round2_a1":
        const p1r2 = answerInput.toLowerCase() === "correct" ? 1 : 0;
        await updateSession({
          p1_score: (session?.p1_score || 0) + p1r2,
          p1_round2_score: p1r2,
        });
        setAnswerInput("");
        setGameState("round2_q2");
        break;

      case "round2_q2":
        setCurrentQuestion(4);
        await updateSession({ q_number: 4, q_text: questionInput });
        setQuestionInput("");
        setGameState("round2_a2");
        break;

      case "round2_a2":
        const p2r2 = answerInput.toLowerCase() === "correct" ? 1 : 0;
        await updateSession({
          p2_score: (session?.p2_score || 0) + p2r2,
          p2_round2_score: p2r2,
        });
        setAnswerInput("");
        setTopicInput("");
        setGameState("round3_intro");
        break;

      case "round3_intro":
        setGameState("round3_topic");
        break;

      case "round3_topic":
        await updateSession({ round_name: `Round 3: ${topicInput || "Images"}` });
        setCurrentRound(3);
        setGameState("round3_q1_image");
        break;

      case "round3_q1_image":
        await fetchImage(topicInput || "nature");
        setGameState("round3_q1");
        break;

      case "round3_q1":
        setCurrentQuestion(5);
        await updateSession({ q_number: 5, q_text: questionInput });
        setQuestionInput("");
        setGameState("round3_a1");
        break;

      case "round3_a1":
        const p1r3 = answerInput.toLowerCase() === "correct" ? 1 : 0;
        await updateSession({
          p1_score: (session?.p1_score || 0) + p1r3,
          p1_round3_score: p1r3,
        });
        setAnswerInput("");
        setGameState("round3_q2_image");
        break;

      case "round3_q2_image":
        await fetchImage(topicInput || "city");
        setGameState("round3_q2");
        break;

      case "round3_q2":
        setCurrentQuestion(6);
        await updateSession({ q_number: 6, q_text: questionInput });
        setQuestionInput("");
        setGameState("round3_a2");
        break;

      case "round3_a2":
        const p2r3 = answerInput.toLowerCase() === "correct" ? 1 : 0;
        await updateSession({
          p2_score: (session?.p2_score || 0) + p2r3,
          p2_round3_score: p2r3,
        });
        setAnswerInput("");
        setGameState("finale");
        break;
    }
  };

  // Determine current player
  const currentPlayer = currentQuestion > 0 ? (currentQuestion % 2 === 1 ? 1 : 2) : null;

  // Get the latest image
  const currentImage = media.length > 0 ? media[media.length - 1] : null;

  // Render control panel based on game state
  const renderControlPanel = () => {
    switch (gameState) {
      case "welcome":
        return (
          <div className="space-y-4">
            <p className="text-gray-300">Welcome! Click Next to start the game.</p>
            <button onClick={handleNext} className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-black font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
              Next
            </button>
          </div>
        );

      case "get_p1_name":
        return (
          <div className="space-y-4">
            <p className="text-gray-300">Enter Player 1&apos;s name:</p>
            <input
              type="text"
              value={p1NameInput}
              onChange={(e) => setP1NameInput(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
              placeholder="Player 1 name"
            />
            <button onClick={handleNext} className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-black font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed" disabled={!p1NameInput}>
              Set Name
            </button>
          </div>
        );

      case "get_p2_name":
        return (
          <div className="space-y-4">
            <p className="text-gray-300">Enter Player 2&apos;s name:</p>
            <input
              type="text"
              value={p2NameInput}
              onChange={(e) => setP2NameInput(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
              placeholder="Player 2 name"
            />
            <button onClick={handleNext} className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-black font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed" disabled={!p2NameInput}>
              Set Name
            </button>
          </div>
        );

      case "ready":
        return (
          <div className="space-y-4">
            <p className="text-gray-300">
              Players ready: {session?.p1_name} vs {session?.p2_name}
            </p>
            <button onClick={handleNext} className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-black font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
              Start Round 1
            </button>
          </div>
        );

      case "round1_intro":
      case "round2_intro":
        return (
          <div className="space-y-4">
            <p className="text-gray-300">
              Enter topic for Round {currentRound}:
            </p>
            <input
              type="text"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
              placeholder="e.g., Movies, Science, History"
            />
            <button onClick={handleNext} className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-black font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
              Start Round
            </button>
          </div>
        );

      case "round3_intro":
        return (
          <div className="space-y-4">
            <p className="text-gray-300">Round 3 is the image round!</p>
            <button onClick={handleNext} className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-black font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
              Continue
            </button>
          </div>
        );

      case "round3_topic":
        return (
          <div className="space-y-4">
            <p className="text-gray-300">Enter image topic for Round 3:</p>
            <input
              type="text"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
              placeholder="e.g., landmarks, animals, food"
            />
            <button onClick={handleNext} className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-black font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
              Start Round 3
            </button>
          </div>
        );

      case "round3_q1_image":
      case "round3_q2_image":
        return (
          <div className="space-y-4">
            <p className="text-gray-300">Fetching image...</p>
            <button onClick={handleNext} className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-black font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
              Fetch Image
            </button>
          </div>
        );

      case "round1_q1":
      case "round1_q2":
      case "round2_q1":
      case "round2_q2":
      case "round3_q1":
      case "round3_q2":
        return (
          <div className="space-y-4">
            <p className="text-gray-300">
              Question {currentQuestion + 1} for{" "}
              {currentQuestion % 2 === 0 ? session?.p1_name : session?.p2_name}:
            </p>
            <input
              type="text"
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
              placeholder="Enter question text"
            />
            <button onClick={handleNext} className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-black font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed" disabled={!questionInput}>
              Ask Question
            </button>
          </div>
        );

      case "round1_a1":
      case "round1_a2":
      case "round2_a1":
      case "round2_a2":
      case "round3_a1":
      case "round3_a2":
        return (
          <div className="space-y-4">
            <p className="text-gray-300">
              Was the answer correct? (type &quot;correct&quot; for yes)
            </p>
            <input
              type="text"
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
              placeholder="correct / wrong"
            />
            <button onClick={handleNext} className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-black font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
              Submit Answer
            </button>
          </div>
        );

      case "finale":
        return (
          <div className="space-y-4">
            <p className="text-2xl font-bold text-green-500">Game Complete!</p>
            <p className="text-gray-300">
              Final Score: {session?.p1_name}: {session?.p1_score} | {session?.p2_name}:{" "}
              {session?.p2_score}
            </p>
            <button onClick={() => (window.location.href = "/")} className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-black font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
              Play Again
            </button>
          </div>
        );
    }
  };

  return (
    <main className="min-h-screen bg-black text-white p-4">

      {/* Header */}
      <div className="text-center mb-6">
        <h1
          className="text-3xl md:text-5xl font-bold text-orange-500"
          style={{ fontFamily: "Impact, sans-serif" }}
        >
          TEST MODE
        </h1>
        <p className="text-gray-500 text-sm">Session: {sessionId}</p>
        {session?.round_name && (
          <h2 className="text-xl md:text-2xl text-cyan-400 mt-2">
            {session.round_name}
          </h2>
        )}
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Game Display */}
        <div className="space-y-6">
          {/* Players */}
          <div className="flex justify-between items-start">
            {/* Player 1 */}
            <div
              className={`text-center p-4 rounded-lg border-4 ${
                currentPlayer === 1 ? "border-orange-500" : "border-transparent"
              }`}
            >
              <div className="w-16 h-16 bg-orange-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                <svg className="w-10 h-10 text-black" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="8" r="4" />
                  <ellipse cx="12" cy="20" rx="8" ry="4" />
                </svg>
              </div>
              <p className="text-orange-500 font-bold">{session?.p1_name || "Player 1"}</p>
              <p className="text-2xl font-bold">{session?.p1_score || 0}</p>
            </div>

            {/* Audio Visualizer */}
            <AudioVisualizer isActive={isSpeaking} />

            {/* Player 2 */}
            <div
              className={`text-center p-4 rounded-lg border-4 ${
                currentPlayer === 2 ? "border-cyan-400" : "border-transparent"
              }`}
            >
              <div className="w-16 h-16 bg-cyan-400 rounded-full mx-auto mb-2 flex items-center justify-center">
                <svg className="w-10 h-10 text-black" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="8" r="4" />
                  <ellipse cx="12" cy="20" rx="8" ry="4" />
                </svg>
              </div>
              <p className="text-cyan-400 font-bold">{session?.p2_name || "Player 2"}</p>
              <p className="text-2xl font-bold">{session?.p2_score || 0}</p>
            </div>
          </div>

          {/* Question display */}
          {session?.q_text && (
            <div className="bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-2">
                Question {session.q_number} of 6
              </p>
              <p className="text-lg text-white">{session.q_text}</p>
            </div>
          )}

          {/* Image display */}
          {currentRound === 3 && currentImage && (
            <div className="relative w-full aspect-video rounded-lg overflow-hidden">
              <Image
                src={currentImage.image_url}
                alt="Round 3 image"
                fill
                className="object-cover"
                priority
              />
            </div>
          )}
        </div>

        {/* Control Panel */}
        <div className="bg-gray-900 rounded-lg p-6">
          <h3 className="text-xl font-bold text-orange-500 mb-4">Control Panel</h3>
          <p className="text-sm text-gray-500 mb-4">
            State: <span className="text-cyan-400">{gameState}</span>
          </p>
          {renderControlPanel()}

          {/* Debug info */}
          <div className="mt-8 pt-4 border-t border-gray-800">
            <h4 className="text-sm font-bold text-gray-500 mb-2">Debug Info</h4>
            <pre className="text-xs text-gray-600 overflow-auto max-h-48">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </main>
  );
}
