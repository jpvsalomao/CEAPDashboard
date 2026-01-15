// Test script for voting backend
// Run this in the browser console at http://localhost:5177/votar

// 1. First check if you're logged in by looking at the page
// 2. Then run these tests:

async function testVotingBackend() {
  // Get Supabase client from window (injected by Vite)
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');

  // You'll need to replace these with your actual values
  const supabaseUrl = 'YOUR_SUPABASE_URL';
  const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('=== Testing Voting Backend ===\n');

  // Test 1: Check if votes table exists and has correct structure
  console.log('1. Checking votes table...');
  const { data: tableInfo, error: tableError } = await supabase
    .from('votes')
    .select('*')
    .limit(1);

  if (tableError) {
    console.error('❌ Error accessing votes table:', tableError.message);
  } else {
    console.log('✅ Votes table accessible');
  }

  // Test 2: Check leaderboard view
  console.log('\n2. Checking leaderboard view...');
  const { data: leaderboard, error: leaderboardError } = await supabase
    .from('vote_leaderboard')
    .select('*')
    .limit(5);

  if (leaderboardError) {
    console.error('❌ Error accessing leaderboard:', leaderboardError.message);
  } else {
    console.log('✅ Leaderboard view accessible');
    console.log('   Current entries:', leaderboard?.length || 0);
  }

  // Test 3: Check current user session
  console.log('\n3. Checking auth status...');
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.log('⚠️  Not logged in (this is expected if you haven\'t signed in)');
  } else {
    console.log('✅ Logged in as:', user.email);

    // Test 4: Check user's current week votes
    const now = new Date();
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    const weekString = `${d.getUTCFullYear()}-W${weekNum.toString().padStart(2, '0')}`;

    console.log('\n4. Checking your votes for week:', weekString);
    const { data: userVotes, error: votesError } = await supabase
      .from('votes')
      .select('deputy_id, deputy_name, selection_order')
      .eq('user_email', user.email)
      .eq('week_number', weekString)
      .order('selection_order');

    if (votesError) {
      console.error('❌ Error checking votes:', votesError.message);
    } else {
      console.log('✅ Your votes this week:', userVotes?.length || 0, 'of 3');
      if (userVotes?.length > 0) {
        userVotes.forEach(v => {
          console.log(`   ${v.selection_order}. ${v.deputy_name} (ID: ${v.deputy_id})`);
        });
      }
    }
  }

  console.log('\n=== Tests Complete ===');
}

// Run tests
testVotingBackend();
