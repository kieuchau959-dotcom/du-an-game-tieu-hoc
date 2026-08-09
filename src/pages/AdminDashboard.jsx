import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Users, School, Gamepad2, ShieldCheck, TrendingUp, Search, Loader2, UserCheck } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, classes: 0, materials: 0, progress: 0 });
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // 1. Đếm số liệu thống kê
      const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: classesCount } = await supabase.from('classes').select('*', { count: 'exact', head: true });
      const { count: materialsCount } = await supabase.from('materials').select('*', { count: 'exact', head: true });
      const { count: progressCount } = await supabase.from('student_progress').select('*', { count: 'exact', head: true });

      setStats({
        users: usersCount || 0,
        classes: classesCount || 0,
        materials: materialsCount || 0,
        progress: progressCount || 0
      });

      // 2. Lấy danh sách người dùng
      const { data: usersData, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsersList(usersData || []);

    } catch (err) {
      console.error("Lỗi lấy dữ liệu Admin:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    setUpdatingId(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error("Lỗi đổi role:", err);
      alert(`Không thể cập nhật quyền: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = usersList.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-rose-400" />
          Bảng Điều Khiển Quản Quản Trị Hệ Thống (Admin)
        </h2>
        <p className="text-xs text-slate-400">
          Quản lý toàn bộ người dùng, lớp học, học liệu và theo dõi chỉ số hệ thống EduHub.
        </p>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Tổng Người Dùng</p>
            <h3 className="text-2xl font-extrabold text-slate-100 mt-1">{stats.users}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Tổng Lớp Học</p>
            <h3 className="text-2xl font-extrabold text-slate-100 mt-1">{stats.classes}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <School className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Học Liệu & Game</p>
            <h3 className="text-2xl font-extrabold text-slate-100 mt-1">{stats.materials}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Gamepad2 className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Lượt Hoàn Thành Bài</p>
            <h3 className="text-2xl font-extrabold text-slate-100 mt-1">{stats.progress}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* User Management Section */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-400" />
              Danh Sách Người Dùng & Phân Quyền Vai Trò
            </h3>
            <p className="text-xs text-slate-400">Thay đổi trực tiếp quyền Admin / Giáo viên / Học sinh</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center text-slate-400">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">Chưa có người dùng nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">Họ và Tên</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Vai Trò Hiện Tại</th>
                  <th className="p-3 text-right">Hành Động Phân Quyền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-semibold text-slate-200">{u.full_name || 'Chưa cập nhật'}</td>
                    <td className="p-3 font-mono text-slate-400">{u.email}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        u.role === 'admin' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        u.role === 'teacher' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                        'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {u.role ? u.role.toUpperCase() : 'STUDENT'}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <select
                        value={u.role || 'student'}
                        disabled={updatingId === u.id}
                        onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="student">Học sinh</option>
                        <option value="teacher">Giáo viên</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
