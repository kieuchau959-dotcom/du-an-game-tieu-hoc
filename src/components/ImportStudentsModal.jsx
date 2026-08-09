import React, { useState } from 'react';
import Modal from './Modal';
import { supabase } from '../lib/supabase';
import Papa from 'papaparse';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, Download } from 'lucide-react';

export default function ImportStudentsModal({ isOpen, onClose, classId, onImportSuccess }) {
  const [file, setFile] = useState(null);
  const [emailText, setEmailText] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const downloadSampleCsv = () => {
    const csvContent = "data:text/csv;charset=utf-8,email,full_name\nhocsinh1@gmail.com,Nguyễn Văn A\nhocsinh2@gmail.com,Trần Thị B\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "mau_danh_sach_hoc_sinh.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      setMessage(null);
    }
  };

  const processImport = async () => {
    setLoading(true);
    setMessage(null);

    let emailsToImport = [];

    if (file) {
      await new Promise((resolve) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const parsedEmails = results.data
              .map(row => row.email || row.Email || Object.values(row)[0])
              .filter(e => e && e.includes('@'));
            emailsToImport = parsedEmails;
            resolve();
          },
          error: () => resolve()
        });
      });
    }

    if (emailText.trim()) {
      const textEmails = emailText
        .split('\n')
        .map(e => e.trim())
        .filter(e => e && e.includes('@'));
      emailsToImport = [...new Set([...emailsToImport, ...textEmails])];
    }

    if (emailsToImport.length === 0) {
      setMessage({ type: 'error', text: 'Vui lòng chọn file CSV hoặc nhập danh sách Email hợp lệ.' });
      setLoading(false);
      return;
    }

    try {
      // Truy vấn tìm ID các học sinh có email tương ứng trong bảng profiles
      const { data: matchedProfiles, error: profileErr } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('email', emailsToImport);

      if (profileErr) throw profileErr;

      if (!matchedProfiles || matchedProfiles.length === 0) {
        setMessage({
          type: 'error',
          text: `Không tìm thấy tài khoản học sinh nào trong hệ thống trùng với danh sách Email cung cấp. (Cần đăng ký tài khoản trước).`
        });
        setLoading(false);
        return;
      }

      // Lắp các bản ghi để chèn vào class_members
      const memberRecords = matchedProfiles.map(p => ({
        class_id: classId,
        student_id: p.id
      }));

      const { error: insertErr } = await supabase
        .from('class_members')
        .upsert(memberRecords, { onConflict: 'class_id,student_id' });

      if (insertErr) throw insertErr;

      setMessage({
        type: 'success',
        text: `Đã thêm thành công ${matchedProfiles.length} học sinh vào lớp học!`
      });

      if (onImportSuccess) onImportSuccess();
      setTimeout(() => {
        onClose();
        setFile(null);
        setEmailText('');
        setMessage(null);
      }, 1500);

    } catch (err) {
      console.error("Lỗi Import:", err);
      setMessage({ type: 'error', text: `Có lỗi xảy ra: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Danh Sách Học Sinh">
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-slate-800/60 p-3 rounded-xl border border-slate-700">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Tải về file CSV mẫu định dạng chuẩn:</span>
          </div>
          <button
            onClick={downloadSampleCsv}
            className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium underline"
          >
            <Download className="w-3.5 h-3.5" /> Mẫu CSV
          </button>
        </div>

        {/* Upload File */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Cách 1: Chọn File Excel / CSV</label>
          <input
            type="file"
            accept=".csv, .xlsx, .xls"
            onChange={handleFileUpload}
            className="w-full text-xs text-slate-400 border border-slate-700 rounded-xl bg-slate-900 p-2.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/20 file:text-emerald-400 hover:file:bg-emerald-500/30"
          />
          {file && <p className="text-xs text-emerald-400 mt-1">Đã chọn: {file.name}</p>}
        </div>

        {/* Hoặc Nhập Email */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Cách 2: Nhập danh sách Email (Mỗi dòng 1 email)</label>
          <textarea
            rows={4}
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
            placeholder="hocsinh1@gmail.com&#10;hocsinh2@gmail.com"
            className="w-full text-xs bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
          />
        </div>

        {message && (
          <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
          >
            Hủy
          </button>
          <button
            onClick={processImport}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-lg shadow-emerald-600/20 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Thêm Học Sinh
          </button>
        </div>
      </div>
    </Modal>
  );
}
