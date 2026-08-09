import React, { useState, useEffect, useRef } from 'react';
import { JSZip } from 'jszip';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Play, Maximize2, Minimize2, CheckCircle, Clock, Trophy, RefreshCw, Loader2, Sparkles } from 'lucide-react';

export default function Html5GamePlayer({ material, assignmentId, onComplete }) {
  const { user } = useAuth();
  const [iframeSrc, setIframeSrc] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [gameScore, setGameScore] = useState(100);
  const [isCompleted, setIsCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const containerRef = useRef(null);

  // Bộ đếm thời gian chơi game
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadGame() {
      setLoading(true);
      setError(null);

      if (!material?.file_url) {
        setError('Không tìm thấy liên kết trò chơi.');
        setLoading(false);
        return;
      }

      // Xử lý dạng Embed iFrame (Wordwall, Quizizz, Kahoot, HTML5 web URL)
      if (material.type === 'game_iframe' || material.file_url.startsWith('http')) {
        let embedUrl = material.file_url;
        // Chuẩn hóa link Quizizz / Wordwall nếu dùng link xem thường
        if (embedUrl.includes('wordwall.net/resource/')) {
          embedUrl = embedUrl.replace('/resource/', '/embed/');
        }
        if (isMounted) {
          setIframeSrc(embedUrl);
          setLoading(false);
        }
        return;
      }

      // Xử lý HTML5 Zip Game tải từ Supabase Storage
      if (material.type === 'game_html5' && material.file_url.endsWith('.zip')) {
        try {
          const response = await fetch(material.file_url);
          const blob = await response.blob();
          const zip = await JSZip.loadAsync(blob);

          // Tìm file index.html trong file zip
          const indexFile = Object.keys(zip.files).find(
            filename => filename.toLowerCase().endsWith('index.html')
          );

          if (!indexFile) {
            throw new Error('Không tìm thấy file index.html trong gói ZIP trò chơi.');
          }

          const htmlContent = await zip.files[indexFile].async('string');
          const blobUrl = URL.createObjectURL(
            new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
          );

          if (isMounted) {
            setIframeSrc(blobUrl);
            setLoading(false);
          }
        } catch (err) {
          console.error("Lỗi đọc HTML5 Zip Game:", err);
          if (isMounted) {
            setError(`Không thể mở gói Game HTML5: ${err.message}`);
            setLoading(false);
          }
        }
      } else {
        if (isMounted) {
          setIframeSrc(material.file_url);
          setLoading(false);
        }
      }
    }

    loadGame();
  }, [material]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleFinishGame = async () => {
    if (!assignmentId || !user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('student_progress')
        .upsert({
          assignment_id: assignmentId,
          student_id: user.id,
          status: 'completed',
          score: Number(gameScore),
          completion_time_seconds: elapsedTime,
          completed_at: new Date().toISOString()
        }, { onConflict: 'assignment_id,student_id' });

      if (error) throw error;

      setIsCompleted(true);
      if (onComplete) onComplete({ score: gameScore, time: elapsedTime });
    } catch (err) {
      console.error("Lỗi cập nhật điểm game:", err);
      alert(`Không thể lưu điểm số: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div ref={containerRef} className="space-y-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            🎮
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100">{material?.title || 'Trò chơi Giáo dục'}</h4>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Thời gian: <strong className="text-slate-200">{formatTime(elapsedTime)}</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            {isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
          </button>
        </div>
      </div>

      {/* Game Display Container */}
      <div className="relative w-full h-[540px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
        {loading && (
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <p className="text-xs font-medium">Đang tải tài nguyên Game tương tác...</p>
          </div>
        )}

        {error && (
          <div className="p-6 text-center text-red-400 space-y-3">
            <p className="text-sm font-semibold">{error}</p>
            <p className="text-xs text-slate-400">Thầy/Cô vui lòng kiểm tra lại liên kết hoặc file ZIP trò chơi.</p>
          </div>
        )}

        {!loading && !error && iframeSrc && (
          <iframe
            src={iframeSrc}
            title={material?.title || 'Game'}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          />
        )}
      </div>

      {/* Bottom Completion & Score Submission Card */}
      {assignmentId && (
        <div className="glass-panel p-4 rounded-xl border border-emerald-500/30 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200">Ghi Nhận Kết Quả Game</div>
              <p className="text-[11px] text-slate-400">
                Nhập điểm số đạt được hoặc nhấn "Gửi Điểm" sau khi hoàn thành màn chơi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">Điểm số:</span>
              <input
                type="number"
                min="0"
                max="100"
                value={gameScore}
                onChange={(e) => setGameScore(e.target.value)}
                className="w-16 bg-slate-800 text-center font-bold text-emerald-400 text-sm rounded border border-slate-700 py-0.5 focus:outline-none focus:border-emerald-500"
              />
              <span className="text-xs text-slate-400">/ 100</span>
            </div>

            <button
              onClick={handleFinishGame}
              disabled={submitting || isCompleted}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition shadow-lg ${
                isCompleted
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                  : 'bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white shadow-emerald-500/20'
              }`}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isCompleted ? (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isCompleted ? 'Đã Nộp Điểm' : 'Gửi Kết Quả'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
