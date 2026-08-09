import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  School, 
  BookOpen, 
  Gamepad2, 
  Users, 
  BarChart3, 
  Award, 
  FolderGit2,
  FileCode2
} from 'lucide-react';

export default function Sidebar() {
  const { profile, user } = useAuth();
  const role = profile?.role || user?.user_metadata?.role || 'student';

  const adminLinks = [
    { to: '/admin', label: 'Tổng quan Hệ thống', icon: LayoutDashboard },
    { to: '/admin/users', label: 'Quản lý Người dùng', icon: Users },
    { to: '/classes', label: 'Quản lý Lớp học', icon: School },
    { to: '/materials', label: 'Kho Học liệu & Game', icon: Gamepad2 },
    { to: '/admin/sql', label: 'SQL Schema & Logs', icon: FileCode2 },
  ];

  const teacherLinks = [
    { to: '/teacher', label: 'Bảng điều khiển', icon: LayoutDashboard },
    { to: '/classes', label: 'Lớp học của tôi', icon: School },
    { to: '/materials', label: 'Kho Học liệu & Game', icon: Gamepad2 },
    { to: '/teacher/assignments', label: 'Giao bài tập', icon: BookOpen },
    { to: '/teacher/analytics', label: 'Báo cáo & Tiến độ', icon: BarChart3 },
  ];

  const studentLinks = [
    { to: '/student', label: 'Bảng điều khiển', icon: LayoutDashboard },
    { to: '/classes', label: 'Lớp học đã tham gia', icon: School },
    { to: '/student/assignments', label: 'Bài tập & Game', icon: Gamepad2 },
    { to: '/student/history', label: 'Thành tích cá nhân', icon: Award },
  ];

  const links = role === 'admin' ? adminLinks : role === 'teacher' ? teacherLinks : studentLinks;

  return (
    <aside className="w-64 bg-slate-900/60 backdrop-blur-md border-r border-slate-800 p-4 flex flex-col justify-between hidden md:flex shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Menu {role.toUpperCase()}
        </div>
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/teacher' || item.to === '/student' || item.to === '/admin'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      <div className="glass-card p-3 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
        <div className="flex items-center gap-1.5 font-semibold text-slate-300">
          <FolderGit2 className="w-4 h-4 text-emerald-400" />
          <span>EduHub Pro v1.0</span>
        </div>
        <p className="text-[11px] text-slate-400">100% PostgreSQL Real Client Supabase RLS</p>
      </div>
    </aside>
  );
}
