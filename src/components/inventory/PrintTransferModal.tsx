import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Printer, Calendar } from 'lucide-react';
import { toLocalISODate, formatDate } from '@/utils/format';

interface PrintTransferModalProps {
  show: boolean;
  onClose: () => void;
  selectedItems: any[];
}

export const PrintTransferModal = ({ show, onClose, selectedItems }: PrintTransferModalProps) => {
  if (!show) return null;

  const handlePrint = () => {
    window.print();
  };

  const [printDate, setPrintDate] = useState<string>(toLocalISODate(new Date()));
  const dateInputRef = useRef<HTMLInputElement>(null);

  const parsedDate = new Date(printDate);
  const displayDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

  const openDatePicker = () => {
    if (dateInputRef.current && 'showPicker' in HTMLInputElement.prototype) {
      try {
        dateInputRef.current.showPicker();
      } catch (e) {
        dateInputRef.current.focus();
      }
    } else if (dateInputRef.current) {
      dateInputRef.current.focus();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:p-0 print:bg-white print:absolute print:left-0 print:top-0 print:w-full print:h-auto print:overflow-visible print:block">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-gray-100 w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden print:w-full print:h-auto print:rounded-none print:shadow-none print:bg-white print:overflow-visible print:block print:border-none"
        >
          {/* Header */}
          <div className="bg-white p-4 flex items-center justify-between border-b border-gray-200 print:hidden shrink-0">
            <h2 className="text-lg font-bold text-gray-800">In Biên Bản Bàn Giao</h2>
            <div className="flex items-center gap-3">
              <div
                className="relative flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={openDatePicker}
              >
                <Calendar size={16} className="text-gray-500 z-10 pointer-events-none" />
                <span className="text-sm font-medium text-gray-700 z-10 pointer-events-none">
                  {formatDate(printDate)}
                </span>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={printDate}
                  onChange={(e) => setPrintDate(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
                />
              </div>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-700 transition-colors"
              >
                <Printer size={18} />
                In ngay
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Preview Area (Screen Only) */}
          <div className="flex-1 overflow-auto p-4 md:p-12 print:hidden custom-scrollbar bg-[#525659]">
            <div className="flex flex-col gap-8 items-center pb-12">
              {(() => {
                const ITEMS_PER_FIRST_PAGE = 7;
                const ITEMS_PER_OTHER_PAGE = 12;

                const pages: any[][] = [];
                let currentItems = [...selectedItems];

                // First page
                pages.push(currentItems.slice(0, ITEMS_PER_FIRST_PAGE));
                currentItems = currentItems.slice(ITEMS_PER_FIRST_PAGE);

                // Other pages
                while (currentItems.length > 0) {
                  pages.push(currentItems.slice(0, ITEMS_PER_OTHER_PAGE));
                  currentItems = currentItems.slice(ITEMS_PER_OTHER_PAGE);
                }

                return pages.map((pageItems, pageIdx) => (
                  <div
                    key={pageIdx}
                    className="bg-white w-[210mm] p-[15mm] md:p-[20mm] shadow-2xl text-black relative flex flex-col mb-8 last:mb-0"
                    style={{ fontFamily: '"Times New Roman", Times, serif' }}
                  >
                    {/* Page Number Indicator */}
                    <div className="absolute -left-16 top-0 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap bg-black/20 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/10 shadow-xl">
                      Trang {pageIdx + 1}
                    </div>

                    {/* Content */}
                    {pageIdx === 0 && (
                      <>
                        <div className="text-center mb-8 relative">
                          <h3 className="text-2xl font-bold uppercase mb-2">
                            BIÊN BẢN BÀN GIAO VẬT TƯ
                          </h3>
                          <p className="italic text-base">Số: ...../CĐX</p>
                        </div>

                        <div className="mb-6 leading-relaxed text-[15px]">
                          <p>
                            Hôm nay, ngày {displayDate.getDate().toString().padStart(2, '0')} tháng{' '}
                            {(displayDate.getMonth() + 1).toString().padStart(2, '0')} năm{' '}
                            {displayDate.getFullYear()} tại Công ty Cổ phần XNK Con đường Xanh.
                          </p>
                          <p>Chúng tôi gồm các bên dưới đây:</p>
                        </div>

                        <div className="mb-6 space-y-5 text-[15px]">
                          <p>Một bên là:</p>
                          <div>
                            <p className="font-bold">1. Bên giao vật tư</p>
                            <div className="space-y-1.5 mt-2 ml-4">
                              <div className="flex items-end">
                                <span className="w-24 shrink-0">Ông/Bà</span>
                                <span className="mr-2 shrink-0">:</span>
                                <span className="flex-1 border-b border-dotted border-gray-300 min-h-[1.2em]"></span>
                                <span className="w-16 shrink-0 ml-2">Chức vụ</span>
                                <span className="mr-2 shrink-0">:</span>
                                <span className="w-48 border-b border-dotted border-gray-300 min-h-[1.2em]"></span>
                              </div>
                              <div className="flex items-end">
                                <span className="w-24 shrink-0">Tên công ty</span>
                                <span className="mr-2 shrink-0">:</span>
                                <span className="flex-1 border-b border-dotted border-gray-300 min-h-[1.2em]"></span>
                              </div>
                              <div className="flex items-end">
                                <span className="w-24 shrink-0">Địa chỉ</span>
                                <span className="mr-2 shrink-0">:</span>
                                <span className="flex-1 border-b border-dotted border-gray-300 min-h-[1.2em]"></span>
                              </div>
                              <div className="flex items-end">
                                <span className="w-24 shrink-0">Số điện thoại</span>
                                <span className="mr-2 shrink-0">:</span>
                                <span className="flex-1 border-b border-dotted border-gray-300 min-h-[1.2em]"></span>
                              </div>
                            </div>
                          </div>

                          <p>Và bên kia là:</p>
                          <div>
                            <p className="font-bold">2. Bên nhận vật tư</p>
                            <div className="space-y-1.5 mt-2 ml-4">
                              <div className="flex items-end">
                                <span className="w-24 shrink-0">Ông/Bà</span>
                                <span className="mr-2 shrink-0">:</span>
                                <span className="flex-1 border-b border-dotted border-gray-300 min-h-[1.2em]"></span>
                                <span className="w-16 shrink-0 ml-2">Chức vụ</span>
                                <span className="mr-2 shrink-0">:</span>
                                <span className="w-48 border-b border-dotted border-gray-300 min-h-[1.2em]"></span>
                              </div>
                              <div className="flex items-end">
                                <span className="w-24 shrink-0">Tên công ty</span>
                                <span className="mr-2 shrink-0">:</span>
                                <span className="flex-1 border-b border-dotted border-gray-300 min-h-[1.2em]"></span>
                              </div>
                              <div className="flex items-end">
                                <span className="w-24 shrink-0">Địa chỉ</span>
                                <span className="mr-2 shrink-0">:</span>
                                <span className="flex-1 border-b border-dotted border-gray-300 min-h-[1.2em]"></span>
                              </div>
                              <div className="flex items-end">
                                <span className="w-24 shrink-0">Số điện thoại</span>
                                <span className="mr-2 shrink-0">:</span>
                                <span className="flex-1 border-b border-dotted border-gray-300 min-h-[1.2em]"></span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mb-4 text-[15px]">
                          <p>
                            Bên nhận vật tư đã kiểm tra số lượng, chủng loại, tình trạng vật tư và
                            đồng ý nhận vật tư với danh mục, số lượng, giá trị như sau :
                          </p>
                        </div>
                      </>
                    )}

                    <table className="w-full border-separate border-spacing-0 mb-6 text-[15px]">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border-y border-l border-gray-200 px-2 py-2 text-center w-12 first:rounded-tl-lg">
                            Stt
                          </th>
                          <th className="border-y border-l border-gray-200 px-2 py-2 text-center">
                            Tên vật tư, hàng hóa
                          </th>
                          <th className="border-y border-l border-gray-200 px-2 py-2 text-center">
                            Số lượng
                          </th>
                          <th className="border-y border-l border-gray-200 px-2 py-2 text-center">
                            Thành tiền
                          </th>
                          <th className="border-y border-x border-gray-200 px-2 py-2 text-center last:rounded-tr-lg">
                            Ghi chú
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageItems.map((item, index) => {
                          const actualIndex =
                            pages.slice(0, pageIdx).reduce((acc, p) => acc + p.length, 0) +
                            index +
                            1;
                          return (
                            <tr key={item.id}>
                              <td className="border-b border-l border-gray-200 px-2 py-2 text-center">
                                {actualIndex}
                              </td>
                              <td className="border-b border-l border-gray-200 px-2 py-2">
                                {item.materials?.name}
                              </td>
                              <td className="border-b border-l border-gray-200 px-2 py-2 text-center font-bold">
                                {item.quantity} {item.materials?.unit}
                              </td>
                              <td className="border-b border-l border-gray-200 px-2 py-2"></td>
                              <td className="border-b border-x border-gray-200 px-2 py-2">
                                {item.notes}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {pageIdx === pages.length - 1 && (
                      <div className="mt-8">
                        <div className="mb-8 space-y-2 text-[15px]">
                          <p>Hai bên đã cùng kiểm tra và giao nhận số lượng vật tư như trên.</p>
                          <div className="flex items-end">
                            <span className="shrink-0 mr-2">Ý kiến của các bên :</span>
                            <span className="flex-1 border-b border-dotted border-gray-300 min-h-[1.2em]"></span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 text-center mt-8 text-[15px] break-inside-avoid">
                          <div>
                            <p className="font-bold mb-20">Bên giao</p>
                          </div>
                          <div>
                            <p className="font-bold mb-20">Bên nhận</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ));
              })()}
            </div>
          </div>
        </motion.div>

        {/* Portal for Print Only */}
        {createPortal(
          <div className="hidden print:block">
            <style>{`
              @media print {
                #root { display: none !important; }
                body { visibility: hidden !important; background: white !important; margin: 0 !important; }
                .print-container {
                  visibility: visible !important;
                  display: block !important;
                  position: absolute !important;
                  top: 0 !important;
                  left: 0 !important;
                  width: 100% !important;
                  background: white !important;
                  font-family: "Times New Roman", Times, serif !important;
                }
                .print-container * {
                  visibility: visible !important;
                  font-family: "Times New Roman", Times, serif !important;
                }
                @page {
                  size: A4 portrait;
                  margin: 15mm 20mm;
                }
              }
            `}</style>

            <div className="print-container">
              <div className="text-center mb-8 relative">
                <h3 className="text-2xl font-bold uppercase mb-2">BIÊN BẢN BÀN GIAO VẬT TƯ</h3>
                <p className="italic text-base">Số: ...../CĐX</p>
              </div>

              <div className="mb-6 leading-relaxed text-[15px]">
                <p>
                  Hôm nay, ngày {displayDate.getDate().toString().padStart(2, '0')} tháng{' '}
                  {(displayDate.getMonth() + 1).toString().padStart(2, '0')} năm{' '}
                  {displayDate.getFullYear()} tại Công ty Cổ phần XNK Con đường Xanh.
                </p>
                <p>Chúng tôi gồm các bên dưới đây:</p>
              </div>

              <div className="mb-6 space-y-5 text-[15px]">
                <p>Một bên là:</p>
                <div>
                  <p className="font-bold">1. Bên giao vật tư</p>
                  <div className="space-y-1.5 mt-2 ml-4">
                    <div className="flex items-end">
                      <span className="w-24 shrink-0">Ông/Bà</span>
                      <span className="mr-2 shrink-0">:</span>
                      <span className="flex-1 overflow-hidden whitespace-nowrap">
                        ........................................................................................................................................................................................................
                      </span>
                      <span className="w-16 shrink-0 ml-2">Chức vụ</span>
                      <span className="mr-2 shrink-0">:</span>
                      <span className="w-48 overflow-hidden whitespace-nowrap">
                        ........................................................................................................................................................................................................
                      </span>
                    </div>
                    <div className="flex items-end">
                      <span className="w-24 shrink-0">Tên công ty</span>
                      <span className="mr-2 shrink-0">:</span>
                      <span className="flex-1 overflow-hidden whitespace-nowrap">
                        ........................................................................................................................................................................................................
                      </span>
                    </div>
                    <div className="flex items-end">
                      <span className="w-24 shrink-0">Địa chỉ</span>
                      <span className="mr-2 shrink-0">:</span>
                      <span className="flex-1 overflow-hidden whitespace-nowrap">
                        ........................................................................................................................................................................................................
                      </span>
                    </div>
                    <div className="flex items-end">
                      <span className="w-24 shrink-0">Số điện thoại</span>
                      <span className="mr-2 shrink-0">:</span>
                      <span className="flex-1 overflow-hidden whitespace-nowrap">
                        ........................................................................................................................................................................................................
                      </span>
                    </div>
                  </div>
                </div>

                <p>Và bên kia là:</p>
                <div>
                  <p className="font-bold">2. Bên nhận vật tư</p>
                  <div className="space-y-1.5 mt-2 ml-4">
                    <div className="flex items-end">
                      <span className="w-24 shrink-0">Ông/Bà</span>
                      <span className="mr-2 shrink-0">:</span>
                      <span className="flex-1 overflow-hidden whitespace-nowrap">
                        ........................................................................................................................................................................................................
                      </span>
                      <span className="w-16 shrink-0 ml-2">Chức vụ</span>
                      <span className="mr-2 shrink-0">:</span>
                      <span className="w-48 overflow-hidden whitespace-nowrap">
                        ........................................................................................................................................................................................................
                      </span>
                    </div>
                    <div className="flex items-end">
                      <span className="w-24 shrink-0">Tên công ty</span>
                      <span className="mr-2 shrink-0">:</span>
                      <span className="flex-1 overflow-hidden whitespace-nowrap">
                        ........................................................................................................................................................................................................
                      </span>
                    </div>
                    <div className="flex items-end">
                      <span className="w-24 shrink-0">Địa chỉ</span>
                      <span className="mr-2 shrink-0">:</span>
                      <span className="flex-1 overflow-hidden whitespace-nowrap">
                        ........................................................................................................................................................................................................
                      </span>
                    </div>
                    <div className="flex items-end">
                      <span className="w-24 shrink-0">Số điện thoại</span>
                      <span className="mr-2 shrink-0">:</span>
                      <span className="flex-1 overflow-hidden whitespace-nowrap">
                        ........................................................................................................................................................................................................
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4 text-[15px]">
                <p>
                  Bên nhận vật tư đã kiểm tra số lượng, chủng loại, tình trạng vật tư và đồng ý nhận
                  vật tư với danh mục, số lượng, giá trị như sau :
                </p>
              </div>

              <table className="w-full border-separate border-spacing-0 mb-6 text-[15px]">
                <thead className="print:table-header-group">
                  <tr className="bg-gray-50 print:bg-transparent">
                    <th className="border-y border-l border-gray-200 px-2 py-2 text-center w-12 first:rounded-tl-lg">
                      Stt
                    </th>
                    <th className="border-y border-l border-gray-200 px-2 py-2 text-center">
                      Tên vật tư, hàng hóa
                    </th>
                    <th className="border-y border-l border-gray-200 px-2 py-2 text-center">
                      Số lượng
                    </th>
                    <th className="border-y border-l border-gray-200 px-2 py-2 text-center">
                      Thành tiền
                    </th>
                    <th className="border-y border-x border-gray-200 px-2 py-2 text-center last:rounded-tr-lg">
                      Ghi chú
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {selectedItems.map((item, index) => (
                    <tr key={item.id} className="break-inside-avoid">
                      <td className="border-b border-l border-gray-200 px-2 py-2 text-center">
                        {index + 1}
                      </td>
                      <td className="border-b border-l border-gray-200 px-2 py-2">
                        {item.materials?.name}
                      </td>
                      <td className="border-b border-l border-gray-200 px-2 py-2 text-center font-bold">
                        {item.quantity} {item.materials?.unit}
                      </td>
                      <td className="border-b border-l border-gray-200 px-2 py-2"></td>
                      <td className="border-b border-x border-gray-200 px-2 py-2">{item.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mb-8 space-y-2 text-[15px]">
                <p>Hai bên đã cùng kiểm tra và giao nhận số lượng vật tư như trên.</p>
                <div className="flex items-end">
                  <span className="shrink-0 mr-2">Ý kiến của các bên :</span>
                  <span className="flex-1 overflow-hidden whitespace-nowrap">
                    ................................................................................................................................................................................................................................................................................................
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 text-center mt-8 text-[15px] break-inside-avoid">
                <div>
                  <p className="font-bold mb-24">Bên giao</p>
                </div>
                <div>
                  <p className="font-bold mb-24">Bên nhận</p>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
      </div>
    </AnimatePresence>
  );
};
