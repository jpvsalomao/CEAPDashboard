import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getISOWeekNumber, type LeaderboardEntry } from '../types/voting';
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

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return { error: new Error('Supabase not configured') };

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/votar`,
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

// Vote submission hook
export function useSubmitVote() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submitVote = useCallback(async (deputyId: number, deputyName: string) => {
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
      });

      if (insertError) {
        // Unique constraint violation = already voted this week
        if (insertError.code === '23505') {
          setError('Você já votou esta semana. Volte na próxima!');
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

// Check if user has voted this week
export function useHasVotedThisWeek() {
  const [hasVoted, setHasVoted] = useState(false);
  const [currentVote, setCurrentVote] = useState<{ deputyId: number; deputyName: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const checkVoteStatus = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        setHasVoted(false);
        setCurrentVote(null);
        setLoading(false);
        return;
      }

      const weekNumber = getISOWeekNumber();

      const { data, error } = await supabase
        .from('votes')
        .select('deputy_id, deputy_name')
        .eq('user_email', user.email)
        .eq('week_number', weekNumber)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error checking vote status:', error);
      }

      if (data) {
        setHasVoted(true);
        setCurrentVote({ deputyId: data.deputy_id, deputyName: data.deputy_name });
      } else {
        setHasVoted(false);
        setCurrentVote(null);
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

  return { hasVoted, currentVote, loading, refetch: checkVoteStatus };
}
