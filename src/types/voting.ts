// Voting system types

export interface Vote {
  id: string;
  deputy_id: number;
  deputy_name: string;
  user_email: string;
  week_number: number;
  voted_at: string;
}

export interface LeaderboardEntry {
  deputy_id: number;
  deputy_name: string;
  vote_count: number;
}

export interface VotingState {
  isAuthenticated: boolean;
  userEmail: string | null;
  hasVotedThisWeek: boolean;
  currentVote: {
    deputyId: number;
    deputyName: string;
  } | null;
}

// Get ISO week number
export function getISOWeekNumber(date: Date = new Date()): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
