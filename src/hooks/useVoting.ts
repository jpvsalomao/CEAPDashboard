import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getISOWeekNumber, MAX_SELECTIONS, type LeaderboardEntry, type UserSelection } from '../types/voting';
import type { User } from '@supabase/supabase-js';

// Auth hook
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async (redirectPath?: string) => {
    if (!supabase) return { error: new Error('Supabase not configured') };

    // Use provided redirect path, or current page, or default to /votar
    const redirectTo = redirectPath
      ? `${window.location.origin}${redirectPath}`
      : window.location.href;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  return {
    user,
    loading,
    isAuthenticated: !!user,
    signInWithGoogle,
    signOut,
    isConfigured: isSupabaseConfigured,
  };
}

// Leaderboard hook
export function useVoteLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('vote_leaderboard')
        .select('*');

      if (fetchError) throw fetchError;
      setLeaderboard(data || []);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();

    if (!supabase) return;

    // Real-time subscription
    const channel = supabase
      .channel('votes-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'votes' },
        () => {
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [fetchLeaderboard]);

  return { leaderboard, loading, error, refetch: fetchLeaderboard };
}

// Vote submission hook (single vote - legacy support)
export function useSubmitVote() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submitVote = useCallback(async (deputyId: number, deputyName: string, selectionOrder: number = 1) => {
    if (!supabase) {
      setError('Sistema de votação não configurado');
      return false;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        setError('Você precisa estar logado para votar');
        return false;
      }

      const weekNumber = getISOWeekNumber();

      const { error: insertError } = await supabase.from('votes').insert({
        deputy_id: deputyId,
        deputy_name: deputyName,
        user_email: user.email,
        week_number: weekNumber,
        selection_order: selectionOrder,
      });

      if (insertError) {
        // Unique constraint violation
        if (insertError.code === '23505') {
          if (insertError.message?.includes('deputy_id')) {
            setError('Você já votou neste deputado esta semana.');
          } else {
            setError('Você já usou todas as suas escolhas esta semana.');
          }
        } else {
          setError('Erro ao registrar voto. Tente novamente.');
        }
        return false;
      }

      setSuccess(true);
      return true;
    } catch (err) {
      setError('Erro inesperado. Tente novamente.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setSuccess(false);
  }, []);

  return { submitVote, loading, error, success, reset };
}

// Submit multiple votes at once (for "Quem Investigar?" feature)
export function useSubmitMultipleVotes() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submitVotes = useCallback(async (selections: Array<{ deputyId: number; deputyName: string }>) => {
    if (!supabase) {
      setError('Sistema de votação não configurado');
      return false;
    }

    if (selections.length === 0) {
      setError('Selecione pelo menos um deputado');
      return false;
    }

    if (selections.length > MAX_SELECTIONS) {
      setError(`Máximo de ${MAX_SELECTIONS} seleções permitidas`);
      return false;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        setError('Você precisa estar logado para votar');
        return false;
      }

      const weekNumber = getISOWeekNumber();

      // Prepare all votes with selection order
      const votes = selections.map((selection, index) => ({
        deputy_id: selection.deputyId,
        deputy_name: selection.deputyName,
        user_email: user.email,
        week_number: weekNumber,
        selection_order: index + 1,
      }));

      const { error: insertError } = await supabase.from('votes').insert(votes);

      if (insertError) {
        if (insertError.code === '23505') {
          if (insertError.message?.includes('deputy_id')) {
            setError('Você já votou em um destes deputados esta semana.');
          } else {
            setError('Você já votou esta semana. Volte na próxima!');
          }
        } else {
          setError('Erro ao registrar votos. Tente novamente.');
        }
        return false;
      }

      setSuccess(true);
      return true;
    } catch (err) {
      setError('Erro inesperado. Tente novamente.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setSuccess(false);
  }, []);

  return { submitVotes, loading, error, success, reset };
}

// Check if user has voted this week (returns all votes)
export function useHasVotedThisWeek() {
  const [hasVoted, setHasVoted] = useState(false);
  const [currentVotes, setCurrentVotes] = useState<UserSelection[]>([]);
  const [voteCount, setVoteCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Legacy: single vote for backwards compatibility
  const currentVote = currentVotes.length > 0
    ? { deputyId: currentVotes[0].deputyId, deputyName: currentVotes[0].deputyName }
    : null;

  const checkVoteStatus = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        setHasVoted(false);
        setCurrentVotes([]);
        setVoteCount(0);
        setLoading(false);
        return;
      }

      const weekNumber = getISOWeekNumber();

      const { data, error } = await supabase
        .from('votes')
        .select('deputy_id, deputy_name, selection_order')
        .eq('user_email', user.email)
        .eq('week_number', weekNumber)
        .order('selection_order', { ascending: true });

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error checking vote status:', error);
      }

      if (data && data.length > 0) {
        setHasVoted(true);
        setVoteCount(data.length);
        setCurrentVotes(data.map(v => ({
          deputyId: v.deputy_id,
          deputyName: v.deputy_name,
          selectionOrder: v.selection_order,
        })));
      } else {
        setHasVoted(false);
        setCurrentVotes([]);
        setVoteCount(0);
      }
    } catch (err) {
      console.error('Error checking vote status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkVoteStatus();
  }, [checkVoteStatus]);

  // Check if user has voted for a specific deputy
  const hasVotedFor = useCallback((deputyId: number) => {
    return currentVotes.some(v => v.deputyId === deputyId);
  }, [currentVotes]);

  // Check if user can still vote (hasn't used all 3 slots)
  const canVote = voteCount < MAX_SELECTIONS;

  // Get next available selection order
  const nextSelectionOrder = voteCount + 1;

  return {
    hasVoted,
    currentVote,      // Legacy: first vote
    currentVotes,     // All votes
    voteCount,
    canVote,
    nextSelectionOrder,
    hasVotedFor,
    loading,
    refetch: checkVoteStatus
  };
}
