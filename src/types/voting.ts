// Voting system types

export interface Vote {
  id: string;
  deputy_id: number;
  deputy_name: string;
  user_email: string;
  week_number: string;
  selection_order: number;
  voted_at: string;
}

export interface LeaderboardEntry {
  deputy_id: number;
  deputy_name: string;
  vote_count: number;
  unique_voters?: number;
  position?: number;
}

export interface UserSelection {
  deputyId: number;
  deputyName: string;
  selectionOrder: number;
}

export interface VotingState {
  isAuthenticated: boolean;
  userEmail: string | null;
  hasVotedThisWeek: boolean;
  voteCount: number;
  currentVotes: UserSelection[];
}

// Max selections per week
export const MAX_SELECTIONS = 3;

// Get ISO week string (e.g., "2026-W02")
export function getISOWeekString(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
}

// Legacy: Get ISO week number (for backwards compatibility)
export function getISOWeekNumber(date: Date = new Date()): string {
  return getISOWeekString(date);
}
