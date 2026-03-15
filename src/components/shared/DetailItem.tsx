export const DetailItem = ({ label, value, color = "text-gray-700", className = "" }: { label: string, value: any, color?: string, className?: string }) => (
  <div className={`space-y-1 ${className}`}>
    <span className="text-[10px] font-bold text-gray-400 uppercase block">{label}</span>
    <span className={`text-sm ${color}`}>{value}</span>
  </div>
);
