// Supabase Edge Function: update-question
// Updates the current question text and number for a session

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface UpdateQuestionRequest {
  session_id: string;
  q_text: string;
  q_number: number;
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

    const body: UpdateQuestionRequest = await req.json();
    const { session_id, q_text, q_number } = body;

    console.log(`[update-question] Session: ${session_id}, Q#: ${q_number}`);
    console.log(`[update-question] Text: ${q_text}`);

    if (!session_id || !q_text || q_number === undefined) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "session_id, q_text, and q_number are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data, error } = await supabase
      .from("sessions")
      .update({ q_text, q_number })
      .eq("id", session_id)
      .select()
      .single();

    if (error) {
      console.error(`[update-question] Error:`, error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[update-question] Success`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          q_number,
          q_text,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error(`[update-question] Unexpected error:`, err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
