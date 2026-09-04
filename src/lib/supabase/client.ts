import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types';
import { getConfig } from '../config';

let serverClientInstance: SupabaseClient<Database> | null = null;

/**
 * Returns a Supabase client with service role / admin privileges for server-side trusted operations.
 * Never expose this client or its credentials to the browser.
 */
export function getServiceSupabaseClient(
  customClient?: SupabaseClient<Database>
): SupabaseClient<Database> {
  if (customClient) {
    return customClient;
  }

  if (serverClientInstance) {
    return serverClientInstance;
  }

  const { supabaseUrl, supabaseServiceRoleKey } = getConfig();

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    // In test environment or when env is missing, return a dummy client structure or initialize if test provides mock
    return createClient<Database>(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseServiceRoleKey || 'placeholder-key',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }

  serverClientInstance = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return serverClientInstance;
}

/**
 * Sets or overrides the active server client instance (e.g. for testing).
 */
export function setServiceSupabaseClient(client: SupabaseClient<Database> | null): void {
  serverClientInstance = client;
}

