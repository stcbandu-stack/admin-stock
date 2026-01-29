/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface WindowEventMap {
    'show-toast': CustomEvent<{ message: string; type: 'success' | 'error' | 'warning' | 'info' }>;
    'auth-change': CustomEvent<{ user: import('@supabase/supabase-js').User | null }>;
    'open-login': Event;
  }
}

export {};
