/**
 * Supabase server client — intended for server-side API routes.
 *
 * NOTE: This file uses process.env (Node.js) which works in Vercel
 * serverless functions. It does NOT use import.meta.env (Vite).
 *
 * The API routes (api/) already access Supabase directly via REST
 * using the storage.js helper, so this file is provided for future
 * use if server-side Supabase client is needed.
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ''

const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  ''

// Only create client if both values are present
export const supabaseServer = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null
