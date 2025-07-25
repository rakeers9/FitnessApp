// src/services/supabase.ts

import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Get our Supabase credentials from environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

// Create and configure our Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use AsyncStorage to persist user sessions
    // This means users stay logged in when they close/reopen the app
    storage: AsyncStorage,
    // Automatically refresh tokens to keep users logged in
    autoRefreshToken: true,
    // Persist the session across app restarts
    persistSession: true,
    // Detect when user switches between apps/tabs
    detectSessionInUrl: false,
  },
})