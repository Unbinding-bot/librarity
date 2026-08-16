/* ================================================
   Library Games - Supabase Client Configuration
   PostgreSQL database for leaderboards
   ================================================ */

// Supabase Configuration
// IMPORTANT: Replace these with your actual Supabase project credentials
const SUPABASE_CONFIG = {
    url: 'https://supabase.com/dashboard/project/wiqwrrhlriyaqxrmitzo', // e.g., 'https://xxxxx.supabase.co'
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpcXdycmhscml5YXF4cm1pdHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4ODA3OTYsImV4cCI6MjEwMjQ1Njc5Nn0.pw9XCB806F0dNatpqaylbjVX4guT4pImE6KiOF8Pxak', // Public anon key (safe to expose)
};

// Initialize Supabase client
let supabase = null;

/**
 * Initialize Supabase client
 * @returns {Object} Supabase client instance
 */
function initSupabase() {
    if (!window.supabase) {
        console.warn('Supabase library not loaded. Leaderboard features will be disabled.');
        return null;
    }
    
    if (!supabase) {
        // Check if config is set
        if (SUPABASE_CONFIG.url === 'YOUR_SUPABASE_URL') {
            console.warn('Supabase not configured. Leaderboard features disabled.');
            return null;
        }
        
        supabase = window.supabase.createClient(
            SUPABASE_CONFIG.url,
            SUPABASE_CONFIG.anonKey
        );
        
        console.log('✓ Supabase client initialized');
    }
    
    return supabase;
}

/**
 * Submit a score to the leaderboard
 * @param {Object} scoreData - Score data
 * @param {string} scoreData.gameType - Game type (e.g., 'wordle', 'spelling_bee')
 * @param {string} scoreData.gameMode - Game mode ('daily' or 'random')
 * @param {string} scoreData.playerName - Player name (default: 'Anonymous')
 * @param {number} scoreData.score - Score value
 * @param {number} scoreData.timeTaken - Time taken in seconds (optional)
 * @returns {Promise<Object>} Insert result
 */
async function submitScore({ gameType, gameMode, playerName = 'Anonymous', score, timeTaken = null }) {
    const client = initSupabase();
    if (!client) {
        throw new Error('Supabase not initialized');
    }
    
    try {
        // Validate input
        if (!gameType || !gameMode || score === undefined) {
            throw new Error('Missing required fields: gameType, gameMode, score');
        }
        
        // Ensure score is a number
        const scoreValue = parseInt(score);
        if (isNaN(scoreValue)) {
            throw new Error('Score must be a number');
        }
        
        // Prepare data
        const data = {
            game_type: gameType,
            game_mode: gameMode,
            player_name: playerName || 'Anonymous',
            score: scoreValue,
            time_taken: timeTaken ? parseInt(timeTaken) : null,
            date_played: new Date().toISOString().split('T')[0] // YYYY-MM-DD
        };
        
        // Insert into database
        const { data: result, error } = await client
            .from('leaderboards')
            .insert([data])
            .select();
        
        if (error) {
            throw error;
        }
        
        console.log('✓ Score submitted:', result);
        return result[0];
        
    } catch (error) {
        console.error('Error submitting score:', error);
        throw error;
    }
}

/**
 * Get leaderboard entries
 * @param {Object} options - Query options
 * @param {string} options.gameType - Filter by game type (optional)
 * @param {string} options.gameMode - Filter by game mode (optional)
 * @param {string} options.period - Time period: 'daily', 'weekly', 'all' (default: 'all')
 * @param {number} options.limit - Maximum number of results (default: 100)
 * @param {number} options.offset - Offset for pagination (default: 0)
 * @returns {Promise<Array>} Array of leaderboard entries
 */
async function getLeaderboard({ 
    gameType = null, 
    gameMode = null, 
    period = 'all',
    limit = 100,
    offset = 0
} = {}) {
    const client = initSupabase();
    if (!client) {
        throw new Error('Supabase not initialized');
    }
    
    try {
        let query = client.from('leaderboards').select('*');
        
        // Apply filters
        if (gameType) {
            query = query.eq('game_type', gameType);
        }
        
        if (gameMode) {
            query = query.eq('game_mode', gameMode);
        }
        
        // Apply time period filter
        const today = new Date().toISOString().split('T')[0];
        
        if (period === 'daily') {
            query = query.eq('date_played', today);
        } else if (period === 'weekly') {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const weekAgoStr = weekAgo.toISOString().split('T')[0];
            query = query.gte('date_played', weekAgoStr);
        }
        // 'all' = no additional filter
        
        // Order by score (descending) then time taken (ascending)
        query = query
            .order('score', { ascending: false })
            .order('time_taken', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: false });
        
        // Apply pagination
        query = query.range(offset, offset + limit - 1);
        
        const { data, error } = await query;
        
        if (error) {
            throw error;
        }
        
        // Add rank to each entry
        const rankedData = data.map((entry, index) => ({
            ...entry,
            rank: offset + index + 1
        }));
        
        return rankedData;
        
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        throw error;
    }
}

/**
 * Get player's rank for a specific score
 * @param {Object} options - Query options
 * @param {string} options.gameType - Game type
 * @param {string} options.gameMode - Game mode
 * @param {number} options.score - Score to check rank for
 * @param {number} options.timeTaken - Time taken (for tie-breaking)
 * @returns {Promise<number>} Player's rank
 */
async function getPlayerRank({ gameType, gameMode, score, timeTaken = null }) {
    const client = initSupabase();
    if (!client) {
        throw new Error('Supabase not initialized');
    }
    
    try {
        // Count how many scores are better
        let query = client
            .from('leaderboards')
            .select('score, time_taken', { count: 'exact', head: false })
            .eq('game_type', gameType)
            .eq('game_mode', gameMode);
        
        // Scores higher than current score
        query = query.or(`score.gt.${score},and(score.eq.${score},time_taken.lt.${timeTaken || 9999999})`);
        
        const { count, error } = await query;
        
        if (error) {
            throw error;
        }
        
        // Rank is count of better scores + 1
        return (count || 0) + 1;
        
    } catch (error) {
        console.error('Error getting player rank:', error);
        throw error;
    }
}

/**
 * Get leaderboard statistics
 * @param {Object} options - Query options
 * @param {string} options.gameType - Game type
 * @param {string} options.gameMode - Game mode
 * @returns {Promise<Object>} Statistics
 */
async function getLeaderboardStats({ gameType, gameMode }) {
    const client = initSupabase();
    if (!client) {
        throw new Error('Supabase not initialized');
    }
    
    try {
        // Get total count
        const { count: totalCount } = await client
            .from('leaderboards')
            .select('*', { count: 'exact', head: true })
            .eq('game_type', gameType)
            .eq('game_mode', gameMode);
        
        // Get today's count
        const today = new Date().toISOString().split('T')[0];
        const { count: todayCount } = await client
            .from('leaderboards')
            .select('*', { count: 'exact', head: true })
            .eq('game_type', gameType)
            .eq('game_mode', gameMode)
            .eq('date_played', today);
        
        // Get top score
        const { data: topScores } = await client
            .from('leaderboards')
            .select('score, player_name')
            .eq('game_type', gameType)
            .eq('game_mode', gameMode)
            .order('score', { ascending: false })
            .limit(1);
        
        return {
            totalEntries: totalCount || 0,
            todayEntries: todayCount || 0,
            topScore: topScores?.[0]?.score || 0,
            topPlayer: topScores?.[0]?.player_name || 'N/A'
        };
        
    } catch (error) {
        console.error('Error getting leaderboard stats:', error);
        throw error;
    }
}

/**
 * Subscribe to real-time leaderboard updates
 * @param {Object} options - Subscription options
 * @param {string} options.gameType - Game type to subscribe to
 * @param {string} options.gameMode - Game mode to subscribe to
 * @param {Function} options.onInsert - Callback when new score is inserted
 * @returns {Object} Subscription object (call .unsubscribe() to stop)
 */
function subscribeToLeaderboard({ gameType, gameMode, onInsert }) {
    const client = initSupabase();
    if (!client) {
        throw new Error('Supabase not initialized');
    }
    
    try {
        const subscription = client
            .channel(`leaderboard:${gameType}:${gameMode}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'leaderboards',
                    filter: `game_type=eq.${gameType},game_mode=eq.${gameMode}`
                },
                (payload) => {
                    console.log('New score received:', payload.new);
                    if (onInsert) {
                        onInsert(payload.new);
                    }
                }
            )
            .subscribe();
        
        return subscription;
        
    } catch (error) {
        console.error('Error subscribing to leaderboard:', error);
        throw error;
    }
}

/**
 * Test database connection
 * @returns {Promise<boolean>} Connection status
 */
async function testConnection() {
    const client = initSupabase();
    if (!client) {
        return false;
    }
    
    try {
        // Try to fetch one row
        const { data, error } = await client
            .from('leaderboards')
            .select('id')
            .limit(1);
        
        if (error) {
            console.error('Database connection test failed:', error);
            return false;
        }
        
        console.log('✓ Database connection successful');
        return true;
        
    } catch (error) {
        console.error('Database connection error:', error);
        return false;
    }
}

/**
 * Health check (for keep-alive)
 * @returns {Promise<string>} Health status
 */
async function healthCheck() {
    const client = initSupabase();
    if (!client) {
        throw new Error('Supabase not initialized');
    }
    
    try {
        const { data, error } = await client.rpc('health_check');
        
        if (error) {
            throw error;
        }
        
        return data;
        
    } catch (error) {
        console.error('Health check failed:', error);
        throw error;
    }
}

// Export functions
export {
    initSupabase,
    submitScore,
    getLeaderboard,
    getPlayerRank,
    getLeaderboardStats,
    subscribeToLeaderboard,
    testConnection,
    healthCheck
};

// Make available globally for non-module scripts
if (typeof window !== 'undefined') {
    window.supabaseClient = {
        initSupabase,
        submitScore,
        getLeaderboard,
        getPlayerRank,
        getLeaderboardStats,
        subscribeToLeaderboard,
        testConnection,
        healthCheck
    };
}

/**
 * Submit a visitor logbook entry to Supabase
 * @param {string} name
 * @param {string} message
 * @returns {Promise<Object>} inserted row
 */
async function submitLogbookEntry({ name = 'Anonymous', message }) {
    const client = initSupabase();
    if (!client) throw new Error('Supabase not initialized');

    const { data, error } = await client
        .from('visitor_logbook')
        .insert([{ name: name.trim().slice(0, 40), message: message.trim().slice(0, 280) }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Fetch visitor logbook entries (most recent first)
 * @param {number} limit   Max entries to return (default 100)
 * @param {number} offset  For pagination
 * @returns {Promise<Array>}
 */
async function getLogbookEntries({ limit = 100, offset = 0 } = {}) {
    const client = initSupabase();
    if (!client) throw new Error('Supabase not initialized');

    const { data, error } = await client
        .from('visitor_logbook')
        .select('id, name, message, created_at')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
}

export { submitLogbookEntry, getLogbookEntries };

// Add to global too
if (typeof window !== 'undefined') {
    window.supabaseClient.submitLogbookEntry = submitLogbookEntry;
    window.supabaseClient.getLogbookEntries  = getLogbookEntries;
}
