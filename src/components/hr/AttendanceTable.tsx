import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Employee } from '@/types';
import { getDayOfWeekStr, convertSolarToLunar } from '@/utils/lunar';

interface AttendanceTableProps {
  employees: Employee[];
  days: number[];
  attendance: any[];
  loading: boolean;
  user: Employee;
  selectedMonth: number;
  selectedYear: number;
  onToggleAttendance?: (
    empId: string,
    day: number,
    action?: 'present' | 'half-day' | 'absent' | 'remove',
    otHours?: number | '',
  ) => void;
  onOpenEditModal?: (empId: string, day: number) => void;
}

export const AttendanceTable = ({
  employees,
  days,
  attendance,
  loading,
  user,
  selectedMonth,
  selectedYear,
  onToggleAttendance,
  onOpenEditModal,
}: AttendanceTableProps) => {
  const [confirmPopup, setConfirmPopup] = useState<{
    empId: string;
    day: number;
    employeeName: string;
    x: number;
    y: number;
  } | null>(null);

  const [otInput, setOtInput] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<'present' | 'half-day' | 'absent' | null>(null);

  const getStatus = (empId: string, day: number) => {
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return attendance.find((a) => a.employee_id === empId && a.date === dateStr);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-500 text-white';
      case 'half-day':
        return 'bg-amber-500 text-white';
      case 'absent':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-100 text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'present':
        return 'X';
      case 'half-day':
        return '1/2';
      case 'absent':
        return 'V';
      default:
        return '';
    }
  };

  const handleCellClick = (empId: string, empName: string, day: number, e: React.MouseEvent) => {
    if (user.role === 'User') return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const currentAtt = getStatus(empId, day);
    setOtInput(currentAtt?.overtime_hours ? String(currentAtt.overtime_hours) : '');
    setSelectedAction(currentAtt?.status || null);
    setConfirmPopup({
      empId,
      day,
      employeeName: empName,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  const handleConfirm = (action: 'present' | 'half-day' | 'absent' | 'remove') => {
    if (confirmPopup && onToggleAttendance) {
      let numericOt = 0;
      if (otInput !== '') {
        numericOt = parseFloat(otInput.replace(',', '.'));
        if (isNaN(numericOt)) numericOt = 0;
      }
      onToggleAttendance(
        confirmPopup.empId,
        confirmPopup.day,
        action,
        numericOt === 0 ? '' : numericOt,
      );
    }
    setConfirmPopup(null);
    setSelectedAction(null);
  };

  return (
    <>
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1200px] whitespace-nowrap">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider sticky left-0 z-[30] bg-primary border-r border-white/10 w-48">
                  Nhân viên
                </th>
                {days.map((d) => {
                  const dow = getDayOfWeekStr(d, selectedMonth, selectedYear);
                  const lunar = convertSolarToLunar(d, selectedMonth, selectedYear);
                  const isWeekend = dow === 'Sat' || dow === 'Sun';
                  return (
                    <th
                      key={d}
                      className={`px-1 py-2 text-[9px] font-bold uppercase tracking-wider text-center border-r border-white/10 w-10 ${isWeekend ? 'bg-black/10' : ''}`}
                    >
                      <div className="flex flex-col items-center justify-center leading-[1.1]">
                        <span className="text-[12px] font-black">{d}</span>
                        <span className="text-[8px] font-medium opacity-90">{dow}</span>
                        <span className="text-[7px] font-medium italic opacity-60 mt-0.5">
                          {lunar}
                        </span>
                      </div>
                    </th>
                  );
                })}
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center w-20">
                  Tổng
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={days.length + 2}
                    className="px-4 py-12 text-center text-gray-400 italic"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
                      <p className="text-sm">Đang tải bảng chấm công...</p>
                    </div>
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const empAtt = attendance.filter((a) => a.employee_id === emp.id);
                  const totalDays =
                    empAtt.reduce((sum, a) => sum + Number(a.hours_worked || 0), 0) / 8;
                  return (
                    <tr key={emp.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-4 py-3 sticky left-0 z-[30] bg-white group-hover:bg-gray-50 border-r border-gray-100">
                        <p className="text-xs font-bold text-gray-800 leading-tight">
                          {emp.full_name}
                        </p>
                        <p className="text-[9px] text-gray-400">{emp.code || emp.id.slice(0, 8)}</p>
                      </td>
                      {days.map((d) => {
                        const att = getStatus(emp.id, d);
                        return (
                          <td key={d} className="p-0.5 border-r border-gray-50 relative group/cell">
                            <button
                              onClick={(e) => handleCellClick(emp.id, emp.full_name, d, e)}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                onOpenEditModal?.(emp.id, d);
                              }}
                              disabled={user.role === 'User'}
                              className={`w-full aspect-square flex flex-col items-center justify-center rounded-lg text-[10px] font-black transition-all ${getStatusColor(att?.status)} ${user.role === 'User' ? 'cursor-default' : 'cursor-pointer hover:brightness-95 active:scale-95'}`}
                            >
                              <span>{getStatusLabel(att?.status)}</span>
                              {att?.overtime_hours > 0 && (
                                <span className="text-[7px] leading-none mt-0.5">
                                  +{att.overtime_hours}h
                                </span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-2 py-3 text-center text-xs font-black text-primary">
                        {totalDays.toFixed(1)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Popup */}
      <AnimatePresence>
        {confirmPopup && (
          <>
            <div className="fixed inset-0 z-[200]" onClick={() => setConfirmPopup(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="fixed z-[201] bg-white rounded-2xl shadow-2xl border border-gray-200 p-3 w-[185px]"
              style={{
                left: Math.min(confirmPopup.x - 92, window.innerWidth - 200),
                top: Math.max(confirmPopup.y - 200, 10),
              }}
            >
              <p className="text-[10px] text-gray-400 font-bold uppercase text-center mb-2 px-2 break-words">
                CHẤM CÔNG NGÀY {confirmPopup.day} <br />
                <span className="text-primary">{confirmPopup.employeeName}</span>
              </p>
              <div className="space-y-1.5">
                {/* Status selector — chỉ chọn, chưa lưu */}
                <div className="grid grid-cols-3 gap-1">
                  {(['present', 'half-day', 'absent'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedAction(s)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all active:scale-95 border-2 ${
                        selectedAction === s
                          ? s === 'present'
                            ? 'bg-green-500 border-green-500 text-white'
                            : s === 'half-day'
                            ? 'bg-amber-500 border-amber-500 text-white'
                            : 'bg-red-500 border-red-500 text-white'
                          : 'bg-gray-50 border-transparent text-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      {s === 'present' ? 'X' : s === 'half-day' ? '½' : 'V'}
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-center text-gray-300">
                  {selectedAction === 'present' ? '1 công' : selectedAction === 'half-day' ? 'Nửa công' : selectedAction === 'absent' ? 'Vắng mặt' : 'Chọn trạng thái'}
                </p>

                <div className="border-t border-gray-100 pt-1.5">
                  <p className="text-[9px] text-gray-400 mb-1 font-bold">Giờ tăng ca (TC)</p>
                  <input
                    type="text"
                    placeholder="Nhập giờ TC..."
                    value={otInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.,]/g, '');
                      setOtInput(val);
                    }}
                    className="w-full text-center text-xs font-bold text-amber-600 py-1.5 border border-gray-200 outline-none rounded-xl focus:border-primary focus:ring-1 focus:ring-primary/20"
                  />
                </div>

                {/* Nút Lưu — mới submit */}
                <button
                  onClick={() => selectedAction && handleConfirm(selectedAction)}
                  disabled={!selectedAction}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                    selectedAction
                      ? 'bg-primary text-white hover:brightness-110'
                      : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                  }`}
                >
                  {selectedAction ? '✓ Lưu chấm công' : 'Chưa chọn trạng thái'}
                </button>

                <button
                  onClick={() => handleConfirm('remove')}
                  className="w-full py-1.5 rounded-xl bg-gray-50 text-gray-400 text-[9px] font-bold hover:bg-gray-100 active:scale-95 transition-all uppercase"
                >
                  Xóa chấm công
                </button>
              </div>
              <button
                onClick={() => setConfirmPopup(null)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50"
              >
                <X size={12} className="text-gray-400" />
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
