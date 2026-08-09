import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import Html5GamePlayer from '../components/Html5GamePlayer';
import { ArrowLeft, BookOpen, Clock, CheckCircle2, FileText, Video, Loader2, Trophy } from 'lucide-react';

export default function AssignmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [assignment, setAssignment] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchAssignmentDetail();
  }, [id, user]);

  const fetchAssignmentDetail = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: assign, error: assignErr } = await supabase
        .from('assignments')
        .select(`
          *,
          materials (*),
          classes (name, subject, grade)
        `)
        .eq('id', id)
        .single();

      if (assignErr) throw assignErr;
      setAssignment(assign);

      // Lấy tiến độ của học sinh hiện tại
      const { data: prog } = await supabase
        .from('student_progress')
        .select('*')
        .eq('assignment_id', id)
        .eq('student_id', user.id)
        .maybeSingle();

      setProgress(prog || null);

    } catch (err) {
      console.error("Lỗi lấy thông tin bài tập:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsCompleted = async () => {
    setUpdating(true);
    try {
      const { data, error } = await supabase
        .from('student_progress')
        .upsert({
          assignment_id: id,
          student_id: user.id,
          status: 'completed',
          score: 100,
          completed_at: new Date().toISOString()
        }, { onConflict: 'assignment_id,student_id' })
        .select()
        .single();

      if (error) throw error;
      setProgress(data);
    } catch (err) {
      alert(`Không thể lưu tiến độ: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex justify-center text-slate-400">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="py-12 text-center text-slate-400 space-y-3">
        <p>Không tìm thấy bài tập hoặc bạn không có quyền truy cập.</p>
        <button onClick={() => navigate(-1)} className="text-xs text-indigo-400 underline">Quay lại</button>
      </div>
    );
  }

  const mat = assignment.materials;
  const isGame = mat?.type === 'game_iframe' || mat?.type === 'game_html5';
  const isCompleted = progress?.status === 'completed';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Quay lại
      </button>

      {/* Assignment Header Card */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              isGame ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              {isGame ? '🎮 Game Tương Tác' : '📄 Học Liệu / Bài Học'}
            </span>
            <span className="text-xs text-slate-400">Lớp: <strong>{assignment.classes?.name}</strong></span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {isCompleted ? (
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Đã hoàn thành ({progress.score} điểm)
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                Chưa nộp bài
              </span>
            )}
          </div>
        </div>

        <h2 className="text-2xl font-bold text-slate-100">{mat?.title}</h2>
        <p className="text-xs text-slate-400">{mat?.description || 'Không có hướng dẫn thêm.'}</p>
      </div>

      {/* Play Game or View Material Content */}
      {isGame ? (
        <Html5GamePlayer
          material={mat}
          assignmentId={id}
          onComplete={() => fetchAssignmentDetail()}
        />
      ) : (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6">
          {mat?.type === 'video' ? (
            <video controls src={mat.file_url} className="w-full rounded-2xl border border-slate-800 max-h-[540px]" />
          ) : (
            <div className="p-12 text-center bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
              <FileText className="w-16 h-16 text-emerald-400 mx-auto" />
              <div>
                <h4 className="text-base font-bold text-slate-100">{mat?.title}</h4>
                <p className="text-xs text-slate-400 mt-1">Định dạng file tài liệu giáo trình</p>
              </div>
              <a
                href={mat?.file_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
              >
                Mở File Xem & Đọc Ngay
              </a>
            </div>
          )}

          {/* Mark Completed Toggle */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <div className="text-xs text-slate-400">
              Nhấn nút bên phải để đánh dấu hoàn thành bài học này.
            </div>

            <button
              onClick={handleMarkAsCompleted}
              disabled={updating || isCompleted}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition shadow ${
                isCompleted
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
              }`}
            >
              {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {isCompleted ? 'Đã Đánh Dấu Hoàn Thành' : 'Đánh Dấu Đã Học Xong'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
