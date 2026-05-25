/**
 * Supabase server client — intended for server-side API routes only.
 *
 * IMPORTANT: This file uses process.env (Node.js) which works in Vercel
 * serverless functions. It is NEVER included in the frontend bundle.
 *
 * The API routes (api/) already access Supabase directly via REST
 * using the storage.js helper. This file is provided for future
 * use if a full Supabase client SDK is needed server-side.
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.SUPABASE_URL ||
  ''

const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  ''

// Only create client if both values are present
// Service role key has admin access — NEVER expose to frontend
export const supabaseServer = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null
