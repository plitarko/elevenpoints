// Supabase Edge Function: mark-answer
// Marks a player's answer as correct, incorrect, or unanswered
// Updates the appropriate round score and recalculates total score

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MarkAnswerRequest {
  session_id: string;
  player: "player1" | "player2";
  round: 1 | 2 | 3;
  question_number: 1 | 2 | 3 | 4 | 5 | 6;
  verdict: "correct" | "incorrect" | "unanswered";
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: MarkAnswerRequest = await req.json();
    const { session_id, player, round, question_number, verdict } = body;

    console.log(`[mark-answer] Session: ${session_id}`);
    console.log(`[mark-answer] Player: ${player}, Round: ${round}, Q: ${question_number}, Verdict: ${verdict}`);

    // Validate required fields
    if (!session_id || !player || !round || !question_number || !verdict) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: session_id, player, round, question_number, verdict",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate player
    if (!["player1", "player2"].includes(player)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid player. Must be 'player1' or 'player2'",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate round
    if (![1, 2, 3].includes(round)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid round. Must be 1, 2, or 3",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate question_number
    if (![1, 2, 3, 4, 5, 6].includes(question_number)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid question_number. Must be 1-6",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate verdict
    if (!["correct", "incorrect", "unanswered"].includes(verdict)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid verdict. Must be 'correct', 'incorrect', or 'unanswered'",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch current session
    const { data: session, error: fetchError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", session_id)
      .single();

    if (fetchError || !session) {
      console.error(`[mark-answer] Session not found:`, fetchError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Session not found",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Determine points to add (1 for correct, 0 otherwise)
    const points = verdict === "correct" ? 1 : 0;

    // Determine which round score field to update
    const playerPrefix = player === "player1" ? "p1" : "p2";
    const roundScoreField = `${playerPrefix}_round${round}_score`;

    // Get the current round score
    const currentRoundScore = session[roundScoreField] || 0;

    // Calculate new round score (add the points)
    const newRoundScore = currentRoundScore + points;

    // Calculate new total score
    const currentTotalScore = player === "player1" ? session.p1_score : session.p2_score;
    const newTotalScore = currentTotalScore + points;

    // Build update object
    const updateFields: Record<string, number> = {
      [roundScoreField]: newRoundScore,
      [`${playerPrefix}_score`]: newTotalScore,
      q_number: question_number,
    };

    console.log(`[mark-answer] Updating:`, updateFields);

    // Update the session
    const { data, error: updateError } = await supabase
      .from("sessions")
      .update(updateFields)
      .eq("id", session_id)
      .select()
      .single();

    if (updateError) {
      console.error(`[mark-answer] Update error:`, updateError);
      return new Response(
        JSON.stringify({
          success: false,
          error: updateError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[mark-answer] Success:`, data);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          player,
          round,
          question_number,
          verdict,
          points_awarded: points,
          new_round_score: newRoundScore,
          new_total_score: newTotalScore,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error(`[mark-answer] Unexpected error:`, err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
