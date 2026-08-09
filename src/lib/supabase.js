import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ayqxgekaorymguxklojw.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5cXhnZWthb3J5bWd1eGtsb2p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMDAwOTgsImV4cCI6MjEwMTU3NjA5OH0.a5CiCHUfEVkotnN-OCH8E6oKmif0PN8xdXSHfoyphao';

export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder'));
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

/**
 * Upload file lên Supabase Storage bucket 'materials'
 * @param {File} file 
 * @param {string} folderPath 
 * @returns {Promise<string>} Public URL của file
 */
export async function uploadMaterialFile(file, folderPath = 'documents') {
  if (!isSupabaseConfigured()) {
    throw new Error("Chưa cấu hình Supabase URL và ANON Key trong file .env!");
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${folderPath}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('materials')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    console.error("Storage upload error:", error);
    throw error;
  }

  const { data: publicUrlData } = supabase.storage
    .from('materials')
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
}
