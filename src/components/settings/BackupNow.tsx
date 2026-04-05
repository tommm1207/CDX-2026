import { useState } from 'react';
import { Download } from 'lucide-react';
import { motion } from 'motion/react';
import { utils, write, writeFile } from 'xlsx';
import { supabase } from '../../supabaseClient';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { BACKUP_TABLES } from './Backup';

export const BackupNow = ({ onBack, addToast }: { onBack: () => void, addToast: (msg: string, type?: 'success' | 'error' | 'info') => void }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const handleFullBackup = async () => {
    setLoading(true);
    setStatus('Đang chuẩn bị dữ liệu...');

    try {
      const workbook = utils.book_new();

      // 1. Tạo trang bìa TỔNG QUAN
      const summaryData = [
        ['HỆ THỐNG QUẢN LÝ KHO & NHÂN SỰ CDX 2026'],
        [''],
        ['BÁO CÁO SAO LƯU DỮ LIỆU TOÀN BỘ'],
        ['Ngày thực hiện:', new Date().toLocaleString('vi-VN')],
        ['Số lượng bảng:', BACKUP_TABLES.length],
        ['Danh sách bảng:', BACKUP_TABLES.map(t => t.label).join(', ')],
        [''],
        ['Chi tiết các bảng dữ liệu được liệt kê ở các Tab bên dưới.'],
      ];
      const summarySheet = utils.aoa_to_sheet(summaryData);
      summarySheet['!cols'] = [{ wch: 25 }, { wch: 60 }];
      utils.book_append_sheet(workbook, summarySheet, 'TỔNG QUAN');

      // 2. Thêm dữ liệu các bảng
      const labels: string[] = [];
      for (const table of BACKUP_TABLES) {
        labels.push(table.label);
        setStatus(`Đang tải bảng: ${table.label}...`);
        const { data, error } = await supabase.from(table.id).select('*');
        if (error) {
          console.error(`Error fetching ${table.id}:`, error);
          continue;
        }

        if (data && data.length > 0) {
          const worksheet = utils.json_to_sheet(data);
          
          // Tự động giãn cột
          const keys = Object.keys(data[0]);
          worksheet['!cols'] = keys.map(key => {
            const maxLen = Math.max(
              key.toString().length,
              ...data.map(row => (row[key] ? row[key].toString().length : 0))
            );
            return { wch: Math.min(maxLen + 2, 50) };
          });

          utils.book_append_sheet(workbook, worksheet, table.label.substring(0, 31).replace(/\//g, '-'));
        }
      }

      setStatus('Đang tạo file Excel...');
      const fileName = `CDX_Full_Backup_${new Date().toISOString().split('T')[0]}.xlsx`;

      const email = localStorage.getItem('backup_email');

      if (email) {
        setStatus(`Đang gửi email tới ${email}...`);
        const fileData = write(workbook, { type: 'base64', bookType: 'xlsx' });

        const response = await fetch('/api/send-backup', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-api-key': 'cdx-secret-2026'
          },
          body: JSON.stringify({
            email,
            fileName,
            fileData,
            tableList: labels
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to send email');
        }
      }

      setStatus('Hoàn tất!');
      addToast('Sao lưu toàn bộ dữ liệu thành công!' + (email ? ` Đã gửi tới email ${email}.` : ''), 'success');
    } catch (err: any) {
      console.error('Backup error:', err);
      addToast('Đã xảy ra lỗi khi sao lưu dữ liệu: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageBreadcrumb title="Sao lưu toàn phần" onBack={onBack} />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-6">
        <div className={`p-8 rounded-full ${loading ? 'bg-primary/10 animate-pulse' : 'bg-primary/10'}`}>
          <Download size={64} className="text-primary" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-800">Sao lưu toàn bộ dữ liệu</h2>
          <p className="text-gray-500 max-w-md">
            Hệ thống sẽ xuất toàn bộ dữ liệu từ tất cả các bảng ra một file Excel duy nhất để bạn có thể lưu trữ ngoại tuyến.
          </p>
        </div>

        {loading && (
          <div className="w-full max-w-xs bg-gray-100 rounded-full h-2 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 2, repeat: Infinity }}
              className="bg-primary h-full"
            />
          </div>
        )}

        <p className="text-sm font-medium text-primary h-5">{status}</p>

        <div className="flex gap-4 w-full">
          <button
            onClick={handleFullBackup}
            disabled={loading}
            className="flex-1 bg-primary text-white font-bold py-4 rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-3 shadow-lg shadow-green-900/20 disabled:opacity-50"
          >
            <Download size={20} />
            {loading ? 'ĐANG SAO LƯU...' : 'BẮT ĐẦU SAO LƯU'}
          </button>
          <button
            onClick={onBack}
            disabled={loading}
            className="px-8 bg-gray-100 text-gray-600 font-bold py-4 rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
};
