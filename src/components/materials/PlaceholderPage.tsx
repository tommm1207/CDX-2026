import { Settings } from 'lucide-react';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';

export const PlaceholderPage = ({ title, onBack }: { title: string; onBack?: () => void }) => (
  <div className="p-4 md:p-6 space-y-6 pb-44">
    <PageBreadcrumb title={title} onBack={onBack} />
    <div className="p-12 flex flex-col items-center justify-center text-gray-400 gap-4 bg-white rounded-2xl border border-dashed border-gray-200">
      <div className="p-4 bg-gray-50 rounded-full">
        <Settings size={48} className="animate-spin-slow" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-bold text-gray-700">{title}</h3>
        <p className="text-sm">Tính năng này đang được phát triển...</p>
      </div>
    </div>
  </div>
);
