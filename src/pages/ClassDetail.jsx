import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import Modal from '../components/Modal';
import ImportStudentsModal from '../components/ImportStudentsModal';
import { School, Users, Plus, Upload, BookOpen, Copy, Check, Trash2, ArrowLeft, Loader2, Gamepad2, Sparkles, CheckCircle2 } from 'lucide-react';

export default function ClassDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isTeacher, isAdmin } = useAuth();

  const [classData, setClassData] = useState(null);
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // Add student form
  const [studentEmail, setStudentEmail] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);
  const [addMsg, setAddMsg] = useState(null);

  // Assign material form
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assigning, setAssigning] = useState(false);

  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    fetchClassDetails();
  }, [id]);

  const fetchClassDetails = async () => {
    setLoading(true);
    try {
      // 1. Lấy thông tin Lớp học
      const { data: cls, error: clsErr } = await supabase
        .from('classes')
        .select(`
          *,
          profiles:teacher_id (full_name, email)
        `)
        .eq('id', id)
        .single();

      if (clsErr) throw clsErr;
      setClassData(cls);

      // 2. Lấy danh sách thành viên Lớp học
      const { data: members, error: memErr } = await supabase
        .from('class_members')
        .select(`
          id,
          joined_at,
          profiles:student_id (id, full_name, email, avatar_url)
        `)
        .eq('class_id', id);

      if (memErr) throw memErr;
      setStudents(members || []);

      // 3. Lấy danh sách bài tập đã giao trong lớp này
      const { data: assignData, error: assignErr } = await supabase
        .from('assignments')
        .select(`
          *,
          materials (*),
          student_progress (*)
        `)
        .eq('class_id', id)
        .order('created_at', { ascending: false });

      if (assignErr) throw assignErr;
      setAssignments(assignData || []);

      // 4. Lấy danh sách Học liệu / Game để giao bài
      const { data: matData } = await supabase
        .from('materials')
        .select('*')
        .order('created_at', { ascending: false });

      setAvailableMaterials(matData || []);

    } catch (err) {
      console.error("Lỗi lấy chi tiết lớp:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudentByEmail = async (e) => {
    e.preventDefault();
    setAddingStudent(true);
    setAddMsg(null);

    try {
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('email', studentEmail.trim())
        .maybeSingle();

      if (profErr || !prof) {
        throw new Error('Không tìm thấy tài khoản học sinh có Email này.');
      }

      const { error: insertErr } = await supabase
        .from('class_members')
        .insert({
          class_id: id,
          student_id: prof.id
        });

      if (insertErr) {
        if (insertErr.code === '23505') throw new Error('Học sinh này đã có trong lớp!');
        throw insertErr;
      }

      setAddMsg({ type: 'success', text: `Đã thêm ${prof.full_name || prof.email} vào lớp!` });
      setStudentEmail('');
      fetchClassDetails();
      setTimeout(() => {
        setIsAddStudentModalOpen(false);
        setAddMsg(null);
      }, 1200);

    } catch (err) {
      setAddMsg({ type: 'error', text: err.message });
    } finally {
      setAddingStudent(false);
    }
  };

  const handleRemoveStudent = async (memberId) => {
    if (!window.confirm('Bạn có chắc muốn xóa học sinh này khỏi lớp?')) return;
    try {
      const { error } = await supabase.from('class_members').delete().eq('id', memberId);
      if (error) throw error;
      setStudents(prev => prev.filter(m => m.id !== memberId));
    } catch (err) {
      alert(`Không thể xóa: ${err.message}`);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!selectedMaterialId) return;
    setAssigning(true);

    try {
      const { error } = await supabase
        .from('assignments')
        .insert({
          class_id: id,
          material_id: selectedMaterialId,
          due_date: dueDate ? new Date(dueDate).toISOString() : null
        });

      if (error) throw error;

      setIsAssignModalOpen(false);
      setSelectedMaterialId('');
      setDueDate('');
      fetchClassDetails();
    } catch (err) {
      alert(`Lỗi giao bài tập: ${err.message}`);
    } finally {
      setAssigning(false);
    }
  };

  const copyJoinCode = () => {
    if (!classData?.code) return;
    navigator.clipboard.writeText(classData.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (loading) {
    return (
      <div className="py-24 flex justify-center text-slate-400">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="py-12 text-center text-slate-400 space-y-3">
        <p>Không tìm thấy thông tin Lớp học.</p>
        <button onClick={() => navigate('/classes')} className="text-xs text-indigo-400 underline">Quay về danh sách</button>
      </div>
    );
  }

  const canManage = isTeacher || isAdmin;

  return (
    <div className="space-y-6">
      {/* Back button & Header */}
      <div className="space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </button>

        <div className="glass-panel p-6 rounded-3xl border border-indigo-500/20 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {classData.subject} • {classData.grade}
                </span>
                <span className="text-xs text-slate-400">Giáo viên: <strong>{classData.profiles?.full_name}</strong></span>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-100 mt-1">{classData.name}</h2>
              <p className="text-xs text-slate-400 mt-1">{classData.description || 'Chưa có mô tả.'}</p>
            </div>

            {/* Join Code Card */}
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex items-center gap-3">
              <div>
                <div className="text-[10px] text-slate-400">Mã Gia Nhập Lớp:</div>
                <div className="text-lg font-extrabold font-mono text-emerald-400 tracking-wider">{classData.code}</div>
              </div>
              <button
                onClick={copyJoinCode}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 transition border border-slate-700"
                title="Sao chép Mã"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Teacher Action Buttons */}
          {canManage && (
            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsAddStudentModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                <Plus className="w-4 h-4 text-indigo-400" /> Thêm Học Sinh
              </button>

              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                <Upload className="w-4 h-4 text-emerald-400" /> Import File Excel/CSV
              </button>

              <button
                onClick={() => setIsAssignModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20"
              >
                <BookOpen className="w-4 h-4" /> Giao Bài Tập / Game
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Student Roster & Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Student Roster */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              Sĩ Số Lớp ({students.length})
            </h3>
          </div>

          {students.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">Chưa có học sinh nào trong lớp.</p>
          ) : (
            <div className="space-y-2">
              {students.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-200 flex items-center justify-center font-bold text-xs">
                      {m.profiles?.full_name?.charAt(0) || 'S'}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-200">{m.profiles?.full_name}</div>
                      <div className="text-[10px] text-slate-400">{m.profiles?.email}</div>
                    </div>
                  </div>

                  {canManage && (
                    <button
                      onClick={() => handleRemoveStudent(m.id)}
                      className="p-1 rounded text-slate-500 hover:text-red-400 transition"
                      title="Xóa khỏi lớp"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Assigned Materials */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              Bài Tập & Game Đã Giao Trong Lớp ({assignments.length})
            </h3>
          </div>

          {assignments.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Chưa có bài tập hoặc game nào được giao cho lớp học này.
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((a) => {
                const mat = a.materials;
                const completedCount = a.student_progress?.filter(p => p.status === 'completed').length || 0;
                const isGame = mat?.type === 'game_iframe' || mat?.type === 'game_html5';

                return (
                  <div
                    key={a.id}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/30 transition flex flex-wrap items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isGame ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {isGame ? '🎮 Game' : '📄 Học liệu'}
                        </span>
                        <h4 className="text-sm font-bold text-slate-100">{mat?.title}</h4>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1">{mat?.description}</p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right text-xs">
                        <div className="text-slate-300 font-semibold">{completedCount} / {students.length} Đã nộp</div>
                        <div className="text-[10px] text-slate-400">
                          {a.due_date ? `Hạn: ${new Date(a.due_date).toLocaleDateString('vi-VN')}` : 'Không có hạn'}
                        </div>
                      </div>

                      <button
                        onClick={() => navigate(`/assignments/${a.id}`)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                      >
                        Chi Tiết
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Import CSV */}
      <ImportStudentsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        classId={id}
        onImportSuccess={fetchClassDetails}
      />

      {/* Modal Thêm Học sinh qua Email */}
      <Modal isOpen={isAddStudentModalOpen} onClose={() => setIsAddStudentModalOpen(false)} title="Thêm Học Sinh Theo Email">
        <form onSubmit={handleAddStudentByEmail} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Học Sinh</label>
            <input
              type="email"
              required
              placeholder="hocsinh@gmail.com"
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {addMsg && (
            <div className={`p-3 rounded-xl text-xs ${addMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
              {addMsg.text}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setIsAddStudentModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-400">Hủy</button>
            <button type="submit" disabled={addingStudent} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold">
              {addingStudent ? 'Đang thêm...' : 'Thêm Vào Lớp'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Giao Bài Tập */}
      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Giao Bài Tập / Game Cho Lớp">
        <form onSubmit={handleCreateAssignment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Chọn Học Liệu / Game *</label>
            <select
              required
              value={selectedMaterialId}
              onChange={(e) => setSelectedMaterialId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- Chọn từ Kho Học Liệu --</option>
              {availableMaterials.map((m) => (
                <option key={m.id} value={m.id}>
                  [{m.type.toUpperCase()}] {m.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Hạn Nộp Bài (Deadline)</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setIsAssignModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-400">Hủy</button>
            <button type="submit" disabled={assigning} className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold">
              {assigning ? 'Đang giao...' : 'Giao Bài Ngay'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
