// Rename this file to config.js for local/static hosting use.
// Supabase anon key is safe for browser use when RLS is enabled; never put service_role here.
window.ZENAI_CONFIG = {
  SUPABASE_URL: 'https://YOUR_PROJECT.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',
  API_BASE: 'https://YOUR_BACKEND.example.com'
};
