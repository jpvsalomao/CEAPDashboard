import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials not configured. Voting feature will be disabled.',
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local'
  );
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = !!supabase;

/**
 * Detects if the user is in an in-app browser (Instagram, Facebook, LinkedIn, etc.)
 * Google OAuth doesn't work in these browsers due to security restrictions.
 */
export function isInAppBrowser(): boolean {
  if (typeof window === 'undefined' || !navigator?.userAgent) return false;

  const ua = navigator.userAgent.toLowerCase();

  // Common in-app browser identifiers
  const inAppIndicators = [
    'fban',           // Facebook App
    'fbav',           // Facebook App
    'fb_iab',         // Facebook In-App Browser
    'instagram',      // Instagram
    'linkedinapp',    // LinkedIn (Android)
    'linkedin',       // LinkedIn (iOS - sometimes just "LinkedIn")
    'threads',        // Threads
    'barcelonathread', // Threads (internal codename)
    'twitter',        // Twitter/X in-app
    'line/',          // LINE app
    'wv)',            // Android WebView
    'webview',        // Generic WebView
    'tiktok',         // TikTok
    'snapchat',       // Snapchat
    'whatsapp',       // WhatsApp
    'telegram',       // Telegram
  ];

  // Additional check: iOS in-app browsers often don't identify themselves
  // but lack Safari's full capabilities. Check for WebKit without Safari.
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const hasSafari = ua.includes('safari') && !ua.includes('crios') && !ua.includes('fxios');
  const hasChrome = ua.includes('crios');
  const hasFirefox = ua.includes('fxios');

  // If on iOS, has WebKit, but is NOT Safari/Chrome/Firefox, it's likely an in-app browser
  if (isIOS && ua.includes('applewebkit') && !hasSafari && !hasChrome && !hasFirefox) {
    return true;
  }

  return inAppIndicators.some(indicator => ua.includes(indicator));
}

/**
 * Gets a friendly name for the detected in-app browser
 */
export function getInAppBrowserName(): string | null {
  if (typeof window === 'undefined' || !navigator?.userAgent) return null;

  const ua = navigator.userAgent.toLowerCase();

  if (ua.includes('instagram')) return 'Instagram';
  if (ua.includes('fban') || ua.includes('fbav') || ua.includes('fb_iab')) return 'Facebook';
  if (ua.includes('linkedinapp') || ua.includes('linkedin')) return 'LinkedIn';
  if (ua.includes('threads') || ua.includes('barcelonathread')) return 'Threads';
  if (ua.includes('twitter')) return 'Twitter/X';
  if (ua.includes('tiktok')) return 'TikTok';
  if (ua.includes('whatsapp')) return 'WhatsApp';
  if (ua.includes('telegram')) return 'Telegram';
  if (ua.includes('line/')) return 'LINE';
  if (ua.includes('snapchat')) return 'Snapchat';

  // Generic fallback for unidentified in-app browsers
  return 'este app';
}
