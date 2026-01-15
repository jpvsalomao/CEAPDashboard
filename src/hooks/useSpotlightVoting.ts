/**
 * Spotlight Voting Hooks
 *
 * Handles voting on spotlight debate pages with:
 * - Google OAuth authentication (via Supabase)
 * - Vote persistence in Supabase
 * - Real-time vote count aggregation
 * - Graceful fallback when Supabase not configured
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './useVoting';

export type SpotlightVoteOption = 'investigar' | 'inconclusivo';

export interface SpotlightVoteCounts {
  investigar: number;
  inconclusivo: number;
  total: number;
}

/**
 * Hook to get vote counts for a spotlight page
 */
export function useSpotlightVoteCounts(slug: string) {
  const [counts, setCounts] = useState<SpotlightVoteCounts>({
    investigar: 0,
    inconclusivo: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCounts = useCallback(async () => {
    if (!supabase || !slug) {
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('spotlight_vote_counts')
        .select('*')
        .eq('slug', slug)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows found (valid for new spotlight)
        throw fetchError;
      }

      if (data) {
        setCounts({
          investigar: data.investigar_count || 0,
          inconclusivo: data.inconclusivo_count || 0,
          total: data.total_votes || 0,
        });
      }
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchCounts();

    if (!supabase || !slug) return;

    // Real-time subscription for live updates
    const channel = supabase
      .channel(`spotlight-votes-${slug}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'spotlight_votes',
          filter: `slug=eq.${slug}`,
        },
        () => {
          fetchCounts();
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [slug, fetchCounts]);

  return { counts, loading, error, refetch: fetchCounts };
}

/**
 * Hook to check if current user has voted on a spotlight
 */
export function useHasVotedOnSpotlight(slug: string) {
  const [hasVoted, setHasVoted] = useState(false);
  const [currentVote, setCurrentVote] = useState<SpotlightVoteOption | null>(null);
  const [loading, setLoading] = useState(true);

  const checkVoteStatus = useCallback(async () => {
    if (!supabase || !slug) {
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

      const { data, error } = await supabase
        .from('spotlight_votes')
        .select('vote_option')
        .eq('slug', slug)
        .eq('user_email', user.email)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking spotlight vote status:', error);
      }

      if (data) {
        setHasVoted(true);
        setCurrentVote(data.vote_option as SpotlightVoteOption);
      } else {
        setHasVoted(false);
        setCurrentVote(null);
      }
    } catch (err) {
      console.error('Error checking spotlight vote status:', err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    checkVoteStatus();
  }, [checkVoteStatus]);

  return { hasVoted, currentVote, loading, refetch: checkVoteStatus };
}

/**
 * Hook to submit a vote on a spotlight page
 */
export function useSubmitSpotlightVote(slug: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submitVote = useCallback(async (voteOption: SpotlightVoteOption) => {
    if (!supabase) {
      setError('Sistema de votacao nao configurado');
      return false;
    }

    if (!slug) {
      setError('Spotlight invalido');
      return false;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        setError('Voce precisa estar logado para votar');
        return false;
      }

      const { error: insertError } = await supabase.from('spotlight_votes').insert({
        slug,
        user_email: user.email,
        vote_option: voteOption,
      });

      if (insertError) {
        // Unique constraint violation = already voted
        if (insertError.code === '23505') {
          setError('Voce ja votou neste spotlight');
        } else {
          setError('Erro ao registrar voto. Tente novamente.');
          console.error('Spotlight vote error:', insertError);
        }
        return false;
      }

      setSuccess(true);
      return true;
    } catch (err) {
      setError('Erro inesperado. Tente novamente.');
      console.error('Spotlight vote error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const reset = useCallback(() => {
    setError(null);
    setSuccess(false);
  }, []);

  return { submitVote, loading, error, success, reset };
}

/**
 * Combined hook for spotlight voting
 * Provides all voting functionality in one hook
 */
export function useSpotlightVoting(slug: string) {
  const auth = useAuth();
  const voteCounts = useSpotlightVoteCounts(slug);
  const voteStatus = useHasVotedOnSpotlight(slug);
  const submitVoteHook = useSubmitSpotlightVote(slug);

  // Local state for immediate feedback (before refetch completes)
  const [localVote, setLocalVote] = useState<SpotlightVoteOption | null>(null);
  const [justVoted, setJustVoted] = useState(false);

  // Wrapper around submitVote that updates local state immediately
  const submitVote = useCallback(async (voteOption: SpotlightVoteOption) => {
    const success = await submitVoteHook.submitVote(voteOption);
    if (success) {
      // Immediate local update for instant feedback
      setLocalVote(voteOption);
      setJustVoted(true);
      // Refetch counts in background
      voteCounts.refetch();
    }
    return success;
  }, [submitVoteHook, voteCounts]);

  // Calculate percentages
  const percentages = {
    investigar: voteCounts.counts.total > 0
      ? Math.round((voteCounts.counts.investigar / voteCounts.counts.total) * 100)
      : 0,
    inconclusivo: voteCounts.counts.total > 0
      ? Math.round((voteCounts.counts.inconclusivo / voteCounts.counts.total) * 100)
      : 0,
  };

  // Use local state for immediate feedback, then server state
  const hasVoted = voteStatus.hasVoted || justVoted;
  const currentVote = voteStatus.currentVote || localVote;

  return {
    // Auth state
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    signInWithGoogle: auth.signInWithGoogle,
    signOut: auth.signOut,
    isConfigured: isSupabaseConfigured,
    authLoading: auth.loading,

    // Vote counts
    counts: voteCounts.counts,
    percentages,
    countsLoading: voteCounts.loading,
    refetchCounts: voteCounts.refetch,

    // User's vote
    hasVoted,
    currentVote,
    voteStatusLoading: voteStatus.loading,
    justVoted, // For animation trigger

    // Submit vote
    submitVote,
    submitLoading: submitVoteHook.loading,
    submitError: submitVoteHook.error,
    submitSuccess: submitVoteHook.success,
    resetSubmit: submitVoteHook.reset,
  };
}
