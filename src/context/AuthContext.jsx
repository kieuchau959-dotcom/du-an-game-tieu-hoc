import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext({
  user: null,
  profile: null,
  session: null,
  loading: true,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
  isAdmin: false,
  isTeacher: false,
  isStudent: false,
  supabaseConfigured: false
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configured] = useState(isSupabaseConfigured());

  const fetchProfile = async (userId, userMetaData = {}) => {
    if (!userId || !configured) {
      setProfile(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Lỗi lấy thông tin Profile:', error);
      }

      if (data) {
        setProfile(data);
      } else {
        // Nếu trigger DB bị chậm hoặc chưa chạy xong, dùng fallback từ user_metadata
        setProfile({
          id: userId,
          email: userMetaData.email || '',
          full_name: userMetaData.full_name || userMetaData.name || 'Người dùng',
          role: userMetaData.role || 'student',
          avatar_url: ''
        });
      }
    } catch (err) {
      console.error('Catch profile error:', err);
    }
  };

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    // Lấy session hiện tại
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.user_metadata);
      }
      setLoading(false);
    });

    // Lắng nghe thay đổi Auth State
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id, session.user.user_metadata);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [configured]);

  const signUp = async ({ email, password, fullName, role = 'student' }) => {
    if (!configured) {
      throw new Error("Supabase chưa được cấu hình! Vui lòng kiểm tra file .env.");
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role
        }
      }
    });
    if (error) throw error;
    return data;
  };

  const signIn = async ({ email, password }) => {
    if (!configured) {
      throw new Error("Supabase chưa được cấu hình! Vui lòng kiểm tra file .env.");
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    if (configured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, user.user_metadata);
    }
  };

  const role = profile?.role || user?.user_metadata?.role || 'student';
  const isAdmin = role === 'admin';
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
        isAdmin,
        isTeacher,
        isStudent,
        supabaseConfigured: configured
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
