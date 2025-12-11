// Supabase Edge Function: set-player-name
// Sets a player's name for the game session

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SetPlayerNameRequest {
  session_id: string;
  player_number: "player1" | "player2";
  name: string;
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

    const body: SetPlayerNameRequest = await req.json();
    const { session_id, player_number, name } = body;

    console.log(`[set-player-name] Session: ${session_id}, Player: ${player_number}, Name: ${name}`);

    // Validate required fields
    if (!session_id || !player_number || !name) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: session_id, player_number, name",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate player_number
    if (!["player1", "player2"].includes(player_number)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid player_number. Must be 'player1' or 'player2'",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Determine which field to update
    const fieldName = player_number === "player1" ? "p1_name" : "p2_name";

    // Update the session
    const { data, error } = await supabase
      .from("sessions")
      .update({ [fieldName]: name })
      .eq("id", session_id)
      .select()
      .single();

    if (error) {
      console.error(`[set-player-name] Error:`, error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[set-player-name] Success:`, data);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          player_number,
          name,
          session_id,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error(`[set-player-name] Unexpected error:`, err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
