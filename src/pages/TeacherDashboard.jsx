import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import Modal from '../components/Modal';
import { School, Plus, BookOpen, Users, Gamepad2, Copy, Check, ArrowRight, Loader2, Sparkles } from 'lucide-react';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  // Form state tạo lớp mới
  const [className, setClassName] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('Toán Học');
  const [grade, setGrade] = useState('Lớp 10');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchTeacherClasses();
  }, [user]);

  const fetchTeacherClasses = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          class_members (count)
        `)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClasses(data || []);
    } catch (err) {
      console.error("Lỗi lấy danh sách lớp:", err);
    } finally {
      setLoading(false);
    }
  };

  const generateJoinCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    setCreating(true);
    const code = generateJoinCode();

    try {
      const { data, error } = await supabase
        .from('classes')
        .insert({
          name: className,
          description: description,
          subject: subject,
          grade: grade,
          code: code,
          teacher_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      setClasses(prev => [data, ...prev]);
      setIsModalOpen(false);
      setClassName('');
      setDescription('');
    } catch (err) {
      console.error("Lỗi tạo lớp học:", err);
      alert(`Không thể tạo lớp học: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-6 rounded-3xl border border-indigo-500/20 shadow-xl">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <School className="w-7 h-7 text-indigo-400" />
            Bảng Điều Khiển Giáo Viên
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Quản lý danh sách Lớp học, tạo Mã gia nhập (Join Code), giao bài tập và tải học liệu/game giáo dục.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          Tạo Lớp Học Mới
        </button>
      </div>

      {/* Class List Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-200">Danh Sách Lớp Học Do Tôi Quản Lý ({classes.length})</h3>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center text-slate-400">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : classes.length === 0 ? (
          <div className="glass-panel p-12 rounded-3xl text-center space-y-4 border border-dashed border-slate-800">
            <div className="w-16 h-16 bg-slate-800 text-indigo-400 rounded-full flex items-center justify-center mx-auto">
              <School className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-slate-200">Chưa có Lớp học nào</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Hãy nhấn nút "Tạo Lớp Học Mới" ở phía trên để bắt đầu nhận học sinh và giao bài tập tương tác!
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              <Plus className="w-4 h-4" /> Tạo Lớp Học Ngay
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {classes.map((c) => {
              const studentCount = c.class_members?.[0]?.count || 0;
              return (
                <div
                  key={c.id}
                  className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-indigo-500/40 transition group flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {c.subject} - {c.grade}
                      </span>
                      <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                        <span className="text-[10px] font-mono text-slate-400">Code:</span>
                        <strong className="text-xs font-mono text-emerald-400">{c.code}</strong>
                        <button
                          onClick={() => copyCode(c.code)}
                          className="p-1 hover:text-emerald-300 text-slate-400 transition"
                          title="Sao chép Mã lớp"
                        >
                          {copiedCode === c.code ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    <h4 className="text-lg font-bold text-slate-100 group-hover:text-indigo-400 transition">
                      {c.name}
                    </h4>
                    <p className="text-xs text-slate-400 line-clamp-2">{c.description || 'Không có mô tả.'}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Users className="w-4 h-4 text-emerald-400" />
                      <span>{studentCount} Học sinh</span>
                    </div>

                    <button
                      onClick={() => navigate(`/classes/${c.id}`)}
                      className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
                    >
                      <span>Vào Lớp Học</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Tạo Lớp Học */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Tạo Lớp Học Mới">
        <form onSubmit={handleCreateClass} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Tên Lớp Học *</label>
            <input
              type="text"
              required
              placeholder="Ví dụ: Lớp 10A1 - Chuyên Toán"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Môn Học</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="Toán Học">Toán Học</option>
                <option value="Tiếng Anh">Tiếng Anh</option>
                <option value="Vật Lý">Vật Lý</option>
                <option value="Hóa Học">Hóa Học</option>
                <option value="Ngữ Văn">Ngữ Văn</option>
                <option value="Tin Học">Tin Học</option>
                <option value="Khoa Học Trái Đất">Khoa Học Trái Đất</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Khối Lớp</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="Lớp 1-5">Khối Tiểu Học (1-5)</option>
                <option value="Lớp 6">Lớp 6</option>
                <option value="Lớp 7">Lớp 7</option>
                <option value="Lớp 8">Lớp 8</option>
                <option value="Lớp 9">Lớp 9</option>
                <option value="Lớp 10">Lớp 10</option>
                <option value="Lớp 11">Lớp 11</option>
                <option value="Lớp 12">Lớp 12</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Mô Tả Lớp Học</label>
            <textarea
              rows={3}
              placeholder="Giới thiệu về lớp học, lịch học hoặc nội dung tổng quan..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Tạo Lớp Học
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
