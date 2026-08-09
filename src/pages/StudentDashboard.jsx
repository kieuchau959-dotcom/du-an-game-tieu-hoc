import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import Modal from '../components/Modal';
import { GraduationCap, KeyRound, Gamepad2, Trophy, Clock, CheckCircle2, ArrowRight, Loader2, BookOpen, AlertCircle } from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [enrolledClasses, setEnrolledClasses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [stats, setStats] = useState({ completed: 0, totalScore: 0, avgScore: 0 });
  const [loading, setLoading] = useState(true);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState(null);

  useEffect(() => {
    fetchStudentData();
  }, [user]);

  const fetchStudentData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Lấy danh sách lớp đã tham gia
      const { data: memberData, error: memberErr } = await supabase
        .from('class_members')
        .select(`
          joined_at,
          classes (*)
        `)
        .eq('student_id', user.id);

      if (memberErr) throw memberErr;
      const classesList = memberData?.map(m => m.classes).filter(Boolean) || [];
      setEnrolledClasses(classesList);

      // 2. Lấy bài tập/game được giao trong các lớp học này
      if (classesList.length > 0) {
        const classIds = classesList.map(c => c.id);
        const { data: assignData, error: assignErr } = await supabase
          .from('assignments')
          .select(`
            *,
            materials (*),
            classes (name),
            student_progress (*)
          `)
          .in('class_id', classIds)
          .order('created_at', { ascending: false });

        if (assignErr) throw assignErr;

        // Lọc bớt progress của người dùng hiện tại
        const formattedAssignments = assignData?.map(a => {
          const userProgress = a.student_progress?.find(p => p.student_id === user.id);
          return {
            ...a,
            userStatus: userProgress?.status || 'not_started',
            userScore: userProgress?.score || 0
          };
        }) || [];

        setAssignments(formattedAssignments);

        // Tính chỉ số thành tích
        const completedItems = formattedAssignments.filter(a => a.userStatus === 'completed');
        const sumScore = completedItems.reduce((acc, curr) => acc + (curr.userScore || 0), 0);
        setStats({
          completed: completedItems.length,
          totalScore: sumScore,
          avgScore: completedItems.length > 0 ? Math.round(sumScore / completedItems.length) : 0
        });
      }

    } catch (err) {
      console.error("Lỗi lấy dữ liệu Học sinh:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClass = async (e) => {
    e.preventDefault();
    setJoining(true);
    setJoinError(null);

    const cleanCode = joinCode.trim().toUpperCase();

    try {
      // Tìm lớp theo code
      const { data: classData, error: searchErr } = await supabase
        .from('classes')
        .select('id, name')
        .eq('code', cleanCode)
        .single();

      if (searchErr || !classData) {
        throw new Error('Mã lớp học không tồn tại. Vui lòng kiểm tra lại!');
      }

      // Thêm học sinh vào class_members
      const { error: joinErr } = await supabase
        .from('class_members')
        .insert({
          class_id: classData.id,
          student_id: user.id
        });

      if (joinErr) {
        if (joinErr.code === '23505') {
          throw new Error('Bạn đã gia nhập lớp học này rồi!');
        }
        throw joinErr;
      }

      setIsJoinModalOpen(false);
      setJoinCode('');
      fetchStudentData();
    } catch (err) {
      console.error("Lỗi gia nhập lớp:", err);
      setJoinError(err.message);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 p-6 rounded-3xl border border-emerald-500/20 shadow-xl">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-emerald-400" />
            Góc Học Tập & Game Tương Tác
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Gia nhập lớp học bằng Mã Code, hoàn thành bài tập và chinh phục điểm số cao!
          </p>
        </div>

        <button
          onClick={() => setIsJoinModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-500/20"
        >
          <KeyRound className="w-4 h-4" />
          Nhập Mã Gia Nhập Lớp
        </button>
      </div>

      {/* Achievement Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Đã Hoàn Thành</div>
            <div className="text-xl font-extrabold text-slate-100">{stats.completed} Bài học/Game</div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Điểm Trung Bình</div>
            <div className="text-xl font-extrabold text-amber-400">{stats.avgScore} / 100</div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Lớp Đã Gia Nhập</div>
            <div className="text-xl font-extrabold text-slate-100">{enrolledClasses.length} Lớp</div>
          </div>
        </div>
      </div>

      {/* Enrolled Classes List */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-200">Lớp Học Của Tôi</h3>

        {loading ? (
          <div className="py-12 flex justify-center text-slate-400">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : enrolledClasses.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl text-center space-y-3 border border-dashed border-slate-800">
            <p className="text-xs text-slate-400">Bạn chưa tham gia lớp học nào.</p>
            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
            >
              Nhập Mã Lớp Để Gia Nhập Ngay
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrolledClasses.map((c) => (
              <div
                key={c.id}
                onClick={() => navigate(`/classes/${c.id}`)}
                className="glass-panel p-4 rounded-xl border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition flex items-center justify-between"
              >
                <div>
                  <h4 className="text-sm font-bold text-slate-100">{c.name}</h4>
                  <span className="text-[11px] text-slate-400">{c.subject} • {c.grade}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-400" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assigned Materials & Interactive Games */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-200">Bài Tập & Game Giáo Dục Được Giao</h3>

        {loading ? null : assignments.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl text-center text-xs text-slate-400">
            Chưa có bài tập hoặc game nào được giao.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignments.map((a) => {
              const mat = a.materials;
              const isGame = mat?.type === 'game_iframe' || mat?.type === 'game_html5';

              return (
                <div
                  key={a.id}
                  className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-indigo-500/40 transition space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isGame ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {isGame ? '🎮 Game Tương Tác' : '📄 Học Liệu / Bài Học'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Lớp: {a.classes?.name}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-slate-100">{mat?.title}</h4>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{mat?.description}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <div className="text-xs">
                      {a.userStatus === 'completed' ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Đã xong ({a.userScore} điểm)
                        </span>
                      ) : (
                        <span className="text-amber-400 font-medium">Chưa hoàn thành</span>
                      )}
                    </div>

                    <button
                      onClick={() => navigate(`/assignments/${a.id}`)}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow"
                    >
                      <span>{isGame ? 'Vào Chơi Game' : 'Xem Học Liệu'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Gia nhập Lớp */}
      <Modal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} title="Gia Nhập Lớp Học">
        <form onSubmit={handleJoinClass} className="space-y-4">
          <p className="text-xs text-slate-400">
            Vui lòng nhập Mã Lớp Học (6 ký tự) do Giáo viên của bạn cung cấp.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Mã Lớp Học (Join Code)</label>
            <input
              type="text"
              required
              maxLength={6}
              placeholder="VD: X7Y29Z"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="w-full text-center tracking-widest uppercase font-mono text-lg py-3 bg-slate-900 border border-slate-700 rounded-xl text-emerald-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {joinError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{joinError}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsJoinModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={joining || !joinCode.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              Gia Nhập Ngay
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
