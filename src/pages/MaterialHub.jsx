import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase, uploadMaterialFile } from '../lib/supabase';
import Modal from '../components/Modal';
import { Gamepad2, FileText, Video, Link as LinkIcon, Plus, Upload, Search, Filter, Lock, Globe, Trash2, Loader2, Sparkles, Eye } from 'lucide-react';

export default function MaterialHub() {
  const { user, isTeacher, isAdmin } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter state
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('document');
  const [subject, setSubject] = useState('Toán Học');
  const [grade, setGrade] = useState('Lớp 10');
  const [isPublic, setIsPublic] = useState(true);
  const [embedUrl, setEmbedUrl] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Preview Modal
  const [previewItem, setPreviewItem] = useState(null);

  useEffect(() => {
    fetchMaterials();
  }, [user]);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('materials')
        .select(`
          *,
          profiles:author_id (full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMaterials(data || []);
    } catch (err) {
      console.error("Lỗi lấy danh sách học liệu:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaterial = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      let finalFileUrl = embedUrl;

      // Upload file nếu là tài liệu, video hoặc html5 zip
      if (type !== 'game_iframe' && file) {
        finalFileUrl = await uploadMaterialFile(file, type);
      }

      if (!finalFileUrl) {
        throw new Error('Vui lòng chọn file tải lên hoặc nhập đường dẫn liên kết Game.');
      }

      const { data, error } = await supabase
        .from('materials')
        .insert({
          title,
          description,
          type,
          file_url: finalFileUrl,
          subject,
          grade,
          is_public: isPublic,
          author_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      setMaterials(prev => [data, ...prev]);
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error("Lỗi thêm học liệu:", err);
      alert(`Không thể đăng tải học liệu: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMaterial = async (matId) => {
    if (!window.confirm('Bạn có chắc muốn xóa học liệu này?')) return;
    try {
      const { error } = await supabase.from('materials').delete().eq('id', matId);
      if (error) throw error;
      setMaterials(prev => prev.filter(m => m.id !== matId));
    } catch (err) {
      alert(`Không thể xóa: ${err.message}`);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setType('document');
    setEmbedUrl('');
    setFile(null);
  };

  const filteredMaterials = materials.filter(m => {
    const matchesType = selectedType === 'all' || m.type === selectedType;
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          m.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getTypeIcon = (mType) => {
    switch (mType) {
      case 'game_iframe':
      case 'game_html5':
        return <Gamepad2 className="w-5 h-5 text-amber-400" />;
      case 'video':
        return <Video className="w-5 h-5 text-indigo-400" />;
      default:
        return <FileText className="w-5 h-5 text-emerald-400" />;
    }
  };

  const canCreate = isTeacher || isAdmin;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 p-6 rounded-3xl border border-amber-500/20 shadow-xl">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Gamepad2 className="w-7 h-7 text-amber-400" />
            Kho Học Liệu & Trò Chơi Giáo Dục Tương Tác
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Lưu trữ tài liệu PDF, Video bài giảng, nhúng Game Wordwall/Quizizz và Upload trực tiếp Game HTML5 Zip.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            Tải Học Liệu / Game Mới
          </button>
        )}
      </div>

      {/* Filter & Search Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          {['all', 'document', 'video', 'game_iframe', 'game_html5'].map(t => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                selectedType === t
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {t === 'all' && 'Tất cả'}
              {t === 'document' && '📄 Tài Liệu'}
              {t === 'video' && '🎥 Video'}
              {t === 'game_iframe' && '🌐 Game Embed (Wordwall/Quizizz)'}
              {t === 'game_html5' && '📦 Game HTML5 (.zip)'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Tìm theo tên học liệu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Material Grid */}
      {loading ? (
        <div className="py-16 flex justify-center text-slate-400">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center space-y-3 border border-dashed border-slate-800">
          <Gamepad2 className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-xs text-slate-400">Chưa có học liệu hoặc game nào phù hợp.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMaterials.map((m) => {
            const isOwner = m.author_id === user?.id || isAdmin;

            return (
              <div
                key={m.id}
                className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-amber-500/40 transition group flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                        {getTypeIcon(m.type)}
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-slate-300 border border-slate-800">
                        {m.subject}
                      </span>
                    </div>

                    {m.is_public ? (
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <Globe className="w-3 h-3" /> Công khai
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Nội bộ
                      </span>
                    )}
                  </div>

                  <h4 className="text-base font-bold text-slate-100 group-hover:text-amber-400 transition">
                    {m.title}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-2">{m.description || 'Không có mô tả.'}</p>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">Tác giả: {m.profiles?.full_name || 'Giáo viên'}</span>

                  <div className="flex items-center gap-2">
                    {isOwner && (
                      <button
                        onClick={() => handleDeleteMaterial(m.id)}
                        className="p-1 text-slate-500 hover:text-red-400 transition"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => setPreviewItem(m)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition text-xs"
                    >
                      <Eye className="w-3.5 h-3.5" /> Xem / Chơi
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Tải Học Liệu / Game */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Đăng Tải Học Liệu / Game Giáo Dục">
        <form onSubmit={handleAddMaterial} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Tên Học Liệu / Trò Chơi *</label>
            <input
              type="text"
              required
              placeholder="VD: Trò chơi Đấu Trí Toán Học Lớp 10"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Loại Định Dạng *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              >
                <option value="document">📄 Tài Liệu (PDF / DOCX / PPTX)</option>
                <option value="video">🎥 Video Bài Giảng (MP4)</option>
                <option value="game_iframe">🌐 Game Embed (Wordwall/Quizizz/Kahoot)</option>
                <option value="game_html5">📦 Game HTML5 Đóng Gói (.zip)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Môn Học</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              >
                <option value="Toán Học">Toán Học</option>
                <option value="Tiếng Anh">Tiếng Anh</option>
                <option value="Vật Lý">Vật Lý</option>
                <option value="Hóa Học">Hóa Học</option>
                <option value="Ngữ Văn">Ngữ Văn</option>
                <option value="Tin Học">Tin Học</option>
              </select>
            </div>
          </div>

          {/* Input Dynamic: File Upload hoặc Embed Link */}
          {type === 'game_iframe' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Đường Dẫn Game iFrame (URL Embed) *</label>
              <input
                type="url"
                required
                placeholder="https://wordwall.net/embed/..."
                value={embedUrl}
                onChange={(e) => setEmbedUrl(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Tải File Từ Máy Tính *</label>
              <input
                type="file"
                required
                accept={
                  type === 'document' ? '.pdf,.docx,.doc,.pptx,.ppt' :
                  type === 'video' ? '.mp4,.webm' : '.zip'
                }
                onChange={(e) => setFile(e.target.files[0])}
                className="w-full text-xs text-slate-400 border border-slate-700 rounded-xl bg-slate-900 p-2.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-500/20 file:text-amber-400 hover:file:bg-amber-500/30"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Mô Tả Học Liệu</label>
            <textarea
              rows={3}
              placeholder="Nội dung tóm tắt hoặc hướng dẫn chơi trò chơi..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
            />
            <label htmlFor="isPublic" className="text-xs text-slate-300">Chia sẻ Công khai trong Kho Học liệu chung</label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-400">Hủy</button>
            <button type="submit" disabled={uploading} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 disabled:opacity-50">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? 'Đang tải lên Supabase...' : 'Đăng Tải Tùy Chọn'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Preview / Play Item */}
      {previewItem && (
        <Modal isOpen={!!previewItem} onClose={() => setPreviewItem(null)} title={previewItem.title} maxWidth="max-w-4xl">
          <div className="space-y-4">
            <p className="text-xs text-slate-400">{previewItem.description}</p>

            {previewItem.type === 'game_iframe' || previewItem.type === 'game_html5' ? (
              <iframe
                src={previewItem.file_url}
                title={previewItem.title}
                className="w-full h-[500px] rounded-xl border border-slate-800"
              />
            ) : previewItem.type === 'video' ? (
              <video controls src={previewItem.file_url} className="w-full rounded-xl border border-slate-800 max-h-[500px]" />
            ) : (
              <div className="p-8 text-center space-y-4 bg-slate-900 rounded-xl border border-slate-800">
                <FileText className="w-12 h-12 text-emerald-400 mx-auto" />
                <p className="text-xs text-slate-300">File tài liệu (PDF / Word / PowerPoint)</p>
                <a
                  href={previewItem.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                >
                  Mở File Xem Chi Tiết
                </a>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
