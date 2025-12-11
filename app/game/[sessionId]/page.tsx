"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useConversation } from "@elevenlabs/react";
import { createClient } from "@/lib/supabase/client";
import { Session, SessionMedia } from "@/lib/types";
import AudioVisualizer from "@/components/AudioVisualizer";
import Image from "next/image";

export default function GamePage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const supabase = createClient();

  // Debug: Log sessionId on mount
  useEffect(() => {
    console.log("[GamePage] Session ID from URL:", sessionId);
  }, [sessionId]);

  const [session, setSession] = useState<Session | null>(null);
  const [media, setMedia] = useState<SessionMedia[]>([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFinale, setShowFinale] = useState(false);
  const [micMuted, setMicMuted] = useState(true); // Start muted to prevent interruptions

  // ElevenLabs conversation hook with controlled mic mute state
  const conversation = useConversation({
    micMuted,
    onConnect: () => {
      console.log("[ElevenLabs] Connected");
      setIsConnecting(false);
    },
    onDisconnect: () => {
      console.log("[ElevenLabs] Disconnected");
    },
    onError: (err) => {
      console.error("[ElevenLabs] Error:", err);
      setError("Connection error. Please refresh the page.");
    },
    onMessage: (message) => {
      console.log("[ElevenLabs] Message received:", message);
    },
    onModeChange: (mode: { mode: string; [key: string]: unknown }) => {
      console.log("[ElevenLabs] Mode changed:", mode);
      // Unmute mic only when AI switches to listening mode (asking a question)
      // Mute when AI is speaking to prevent interruptions
      if (mode.mode === "listening") {
        setMicMuted(false);
        console.log("[ElevenLabs] Mic unmuted - listening for response");
      } else if (mode.mode === "speaking") {
        setMicMuted(true);
        console.log("[ElevenLabs] Mic muted - AI speaking");
      }
    },
  });

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

  // Initialize conversation
  useEffect(() => {
    const initConversation = async () => {
      try {
        console.log("[ElevenLabs] Fetching signed URL for session:", sessionId);

        // Get signed URL from our API
        const response = await fetch("/api/get-signed-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[ElevenLabs] Failed to get signed URL:", errorText);
          throw new Error("Failed to get signed URL");
        }

        const { signedUrl } = await response.json();
        console.log("[ElevenLabs] Got signed URL, starting session...");

        // Start the conversation with session_id as dynamic variable
        await conversation.startSession({
          signedUrl,
          dynamicVariables: {
            session_id: sessionId,
          },
        });
        console.log("[ElevenLabs] Session started successfully with session_id:", sessionId);
      } catch (err) {
        console.error("[ElevenLabs] Error starting conversation:", err);
        setError("Failed to connect to AI host. Please refresh the page.");
        setIsConnecting(false);
      }
    };

    initConversation();

    // Cleanup on unmount
    return () => {
      console.log("[ElevenLabs] Ending session (cleanup)");
      conversation.endSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Fetch initial data and subscribe to realtime updates
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
          console.log("Session update:", payload);
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
          console.log("New media:", payload);
          setMedia((prev) => [...prev, payload.new as SessionMedia]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(mediaChannel);
    };
  }, [sessionId, supabase, fetchSession, fetchMedia]);

  // Check for finale condition
  useEffect(() => {
    if (
      session &&
      session.q_number >= 6 &&
      conversation.status !== "connected"
    ) {
      setShowFinale(true);
    }
  }, [session, conversation.status]);

  // Determine current player (alternates each question)
  const currentPlayer =
    session && session.q_number > 0
      ? session.q_number % 2 === 1
        ? 1
        : 2
      : null;

  // Get the latest image for Round 3
  const currentImage = media.length > 0 ? media[media.length - 1] : null;
  const isRound3 = session?.round_name?.toLowerCase().includes("round 3");

  if (error) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-xl mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-black font-bold rounded"
          >
            Refresh
          </button>
        </div>
      </main>
    );
  }

  if (showFinale && session) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
        <h1
          className="text-5xl md:text-7xl font-bold text-orange-500 mb-8"
          style={{ fontFamily: "Impact, sans-serif" }}
        >
          GAME OVER
        </h1>

        {/* Winner announcement */}
        <div className="text-3xl md:text-5xl font-bold mb-12">
          {session.p1_score > session.p2_score ? (
            <span className="text-orange-500">
              {session.p1_name || "Player 1"} WINS!
            </span>
          ) : session.p2_score > session.p1_score ? (
            <span className="text-cyan-400">
              {session.p2_name || "Player 2"} WINS!
            </span>
          ) : (
            <span className="text-gray-400">IT&apos;S A TIE!</span>
          )}
        </div>

        {/* Final scores */}
        <div className="flex gap-16 mb-12">
          {/* Player 1 */}
          <div className="text-center">
            <div className="w-24 h-24 bg-orange-500 rounded-full mb-4 flex items-center justify-center">
              <span className="text-4xl font-bold text-black">
                {session.p1_score}
              </span>
            </div>
            <p className="text-orange-500 font-bold text-xl">
              {session.p1_name || "Player 1"}
            </p>
            <div className="text-sm text-gray-500 mt-2">
              <p>R1: {session.p1_round1_score}</p>
              <p>R2: {session.p1_round2_score}</p>
              <p>R3: {session.p1_round3_score}</p>
            </div>
          </div>

          {/* Player 2 */}
          <div className="text-center">
            <div className="w-24 h-24 bg-cyan-400 rounded-full mb-4 flex items-center justify-center">
              <span className="text-4xl font-bold text-black">
                {session.p2_score}
              </span>
            </div>
            <p className="text-cyan-400 font-bold text-xl">
              {session.p2_name || "Player 2"}
            </p>
            <div className="text-sm text-gray-500 mt-2">
              <p>R1: {session.p2_round1_score}</p>
              <p>R2: {session.p2_round2_score}</p>
              <p>R3: {session.p2_round3_score}</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => (window.location.href = "/")}
          className="px-8 py-4 bg-gray-700 hover:bg-gray-600 text-white font-bold text-xl rounded"
        >
          Play Again
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1
          className="text-4xl md:text-6xl font-bold text-orange-500"
          style={{ fontFamily: "Impact, sans-serif" }}
        >
          ELEVENPOINTS
        </h1>
        {session?.round_name && (
          <h2 className="text-2xl md:text-3xl text-cyan-400 mt-2">
            {session.round_name}
          </h2>
        )}
      </div>

      {/* Loading state */}
      {isConnecting && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-xl">Connecting to AI host...</p>
        </div>
      )}

      {/* Game content */}
      {!isConnecting && session && (
        <div className="max-w-4xl mx-auto">
          {/* Players */}
          <div className="flex justify-between items-start mb-8">
            {/* Player 1 */}
            {session.p1_name ? (
              <div
                className={`text-center p-4 rounded border-4 ${
                  currentPlayer === 1
                    ? "border-orange-500"
                    : "border-transparent"
                }`}
              >
                <div className="w-20 h-20 bg-orange-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-black"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="8" r="4" />
                    <ellipse cx="12" cy="20" rx="8" ry="4" />
                  </svg>
                </div>
                <p className="text-orange-500 font-bold">{session.p1_name}</p>
                <p className="text-3xl font-bold">{session.p1_score}</p>
              </div>
            ) : (
              <div className="w-20 h-20" />
            )}

            {/* Audio Visualizer */}
            <AudioVisualizer isActive={conversation.isSpeaking} />

            {/* Player 2 */}
            {session.p2_name ? (
              <div
                className={`text-center p-4 rounded border-4 ${
                  currentPlayer === 2 ? "border-cyan-400" : "border-transparent"
                }`}
              >
                <div className="w-20 h-20 bg-cyan-400 rounded-full mx-auto mb-2 flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-black"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="8" r="4" />
                    <ellipse cx="12" cy="20" rx="8" ry="4" />
                  </svg>
                </div>
                <p className="text-cyan-400 font-bold">{session.p2_name}</p>
                <p className="text-3xl font-bold">{session.p2_score}</p>
              </div>
            ) : (
              <div className="w-20 h-20" />
            )}
          </div>

          {/* Question display */}
          {session.q_text && (
            <div className="bg-gray-900 rounded p-6 mb-8">
              <p className="text-sm text-gray-500 mb-2">
                Question {session.q_number} of 6
              </p>
              <p className="text-xl md:text-2xl text-white">{session.q_text}</p>
            </div>
          )}

          {/* Image display for Round 3 */}
          {isRound3 && currentImage && (
            <div className="relative w-full aspect-video rounded overflow-hidden mb-8">
              <Image
                src={currentImage.image_url}
                alt="Round 3 image question"
                fill
                className="object-cover"
                priority
              />
            </div>
          )}

          {/* Instructions */}
          {!session.p1_name && !session.p2_name && (
            <div className="text-center text-gray-400">
              <p>Listen to the AI host and introduce yourselves!</p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
