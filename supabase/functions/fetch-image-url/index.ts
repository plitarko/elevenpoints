// Supabase Edge Function: fetch-image-url
// Fetches a random image from Unsplash based on a topic
// and stores it in the session_media table for Round 3

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface FetchImageRequest {
  session_id: string;
  topic: string;
}

interface UnsplashPhoto {
  urls: {
    regular: string;
    small: string;
    thumb: string;
  };
}

interface UnsplashSearchResponse {
  results: UnsplashPhoto[];
  total: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const unsplashAccessKey = Deno.env.get("UNSPLASH_ACCESS_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: FetchImageRequest = await req.json();
    const { session_id, topic } = body;

    console.log(`[fetch-image-url] Session: ${session_id}, Topic: ${topic}`);

    if (!session_id || !topic) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "session_id and topic are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch random image from Unsplash
    const unsplashUrl = new URL("https://api.unsplash.com/search/photos");
    unsplashUrl.searchParams.set("query", topic);
    unsplashUrl.searchParams.set("orientation", "landscape");
    unsplashUrl.searchParams.set("per_page", "10");

    const unsplashResponse = await fetch(unsplashUrl.toString(), {
      headers: {
        Authorization: `Client-ID ${unsplashAccessKey}`,
      },
    });

    if (!unsplashResponse.ok) {
      console.error(
        `[fetch-image-url] Unsplash error:`,
        unsplashResponse.statusText
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to fetch image from Unsplash",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const unsplashData: UnsplashSearchResponse = await unsplashResponse.json();

    if (!unsplashData.results || unsplashData.results.length === 0) {
      console.error(`[fetch-image-url] No images found for topic: ${topic}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `No images found for topic: ${topic}`,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Pick a random image from the results
    const randomIndex = Math.floor(Math.random() * unsplashData.results.length);
    const selectedImage = unsplashData.results[randomIndex];
    const imageUrl = selectedImage.urls.regular;

    console.log(`[fetch-image-url] Selected image: ${imageUrl}`);

    // Store the image URL in session_media table
    const { error: insertError } = await supabase
      .from("session_media")
      .insert({
        session_id,
        image_url: imageUrl,
      });

    if (insertError) {
      console.error(`[fetch-image-url] Insert error:`, insertError);
      return new Response(
        JSON.stringify({
          success: false,
          error: insertError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[fetch-image-url] Image stored successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        image_url: imageUrl,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error(`[fetch-image-url] Unexpected error:`, err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
