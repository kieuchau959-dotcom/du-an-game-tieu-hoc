import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const isSupabaseConfigured = () => {
  return (
    supabaseUrl &&
    supabaseUrl !== 'https://placeholder.supabase.co' &&
    supabaseAnonKey &&
    supabaseAnonKey !== 'placeholder-key'
  );
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
