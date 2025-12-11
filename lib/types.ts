// TypeScript interfaces for the trivia game show

export interface Session {
  id: string;
  p1_name: string | null;
  p2_name: string | null;
  round_name: string | null;
  q_number: number;
  q_text: string | null;
  p1_score: number;
  p2_score: number;
  p1_round1_score: number;
  p1_round2_score: number;
  p1_round3_score: number;
  p2_round1_score: number;
  p2_round2_score: number;
  p2_round3_score: number;
  created_at: string;
}

export interface SessionMedia {
  id: string;
  session_id: string;
  image_url: string;
  created_at: string;
}
