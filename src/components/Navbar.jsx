import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, ShieldCheck, GraduationCap, School, AlertTriangle } from 'lucide-react';

export default function Navbar() {
  const { user, profile, signOut, supabaseConfigured } = useAuth();

  const userRole = profile?.role || user?.user_metadata?.role || 'student';
  const fullName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Người dùng';

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldCheck className="w-3.5 h-3.5" /> ADMIN
          </span>
        );
      case 'teacher':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <School className="w-3.5 h-3.5" /> GIÁO VIÊN
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <GraduationCap className="w-3.5 h-3.5" /> HỌC SINH
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
      {!supabaseConfigured && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-400 flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Chế độ xem trước: Chưa điền <strong>VITE_SUPABASE_URL</strong> và <strong>VITE_SUPABASE_ANON_KEY</strong> trong file <code className="bg-slate-800 px-1 rounded">.env</code>. Vui lòng cập nhật để truy vấn Database Supabase thực tế!
          </span>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/20">
            EH
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-indigo-400 bg-clip-text text-transparent">
              EduHub Game Platform
            </h1>
            <p className="text-[10px] text-slate-400 hidden sm:block">Quản lý Giáo dục & Game Tương Tác</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/50 rounded-xl px-3 py-1.5">
            <div className="w-8 h-8 rounded-lg bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-sm">
              {fullName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-slate-200">{fullName}</div>
              <div className="text-[10px] text-slate-400">{user?.email}</div>
            </div>
            {getRoleBadge(userRole)}
          </div>

          <button
            onClick={signOut}
            title="Đăng xuất"
            className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition border border-transparent hover:border-red-500/20"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
