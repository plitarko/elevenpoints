// Supabase Edge Function: update-session
// Generic function to update any session fields
// Called by ElevenLabs tools: set_player1_name, set_player2_name,
// set_round_name, update_question, update_scores

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface UpdateSessionRequest {
  session_id: string;
  p1_name?: string;
  p2_name?: string;
  round_name?: string;
  q_number?: number;
  q_text?: string;
  p1_score?: number;
  p2_score?: number;
  p1_round1_score?: number;
  p1_round2_score?: number;
  p1_round3_score?: number;
  p2_round1_score?: number;
  p2_round2_score?: number;
  p2_round3_score?: number;
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

    const body: UpdateSessionRequest = await req.json();
    const { session_id, ...updateFields } = body;

    console.log(`[update-session] Session: ${session_id}`);
    console.log(`[update-session] Fields:`, updateFields);

    if (!session_id) {
      return new Response(
        JSON.stringify({ success: false, error: "session_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Filter out undefined values
    const cleanedFields = Object.fromEntries(
      Object.entries(updateFields).filter(([_, v]) => v !== undefined)
    );

    if (Object.keys(cleanedFields).length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No fields to update" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data, error } = await supabase
      .from("sessions")
      .update(cleanedFields)
      .eq("id", session_id)
      .select()
      .single();

    if (error) {
      console.error(`[update-session] Error:`, error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[update-session] Success:`, data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(`[update-session] Unexpected error:`, err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
