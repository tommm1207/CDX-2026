import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { Minus, Plus } from 'lucide-react';
import { formatNumber } from '../../utils/format';

export const NumericInput = ({
  label,
  value,
  onChange,
  placeholder = "0",
  required = false,
  className = "",
  labelClassName = "text-[10px] font-bold text-gray-400 uppercase",
  inputClassName = "w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20",
  icon: Icon,
  showControls = false,
  step = 1,
  error = false,
  isDecimal = false
}: {
  label?: string,
  value: number,
  onChange: (val: number) => void,
  placeholder?: string,
  required?: boolean,
  className?: string,
  labelClassName?: string,
  inputClassName?: string,
  icon?: any,
  showControls?: boolean,
  step?: number,
  error?: boolean,
  isDecimal?: boolean
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value === 0 && displayValue === '') return;
    const formatted = isDecimal ? value.toString() : formatNumber(value);
    if (formatted !== displayValue) {
      setDisplayValue(formatted);
    }
  }, [value, isDecimal]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;

    if (isDecimal) {
      const cleanValue = rawValue.replace(/[^0-9.]/g, '');
      const parts = cleanValue.split('.');
      const finalValue = parts[0] + (parts.length > 1 ? '.' + parts.slice(1).join('') : '');

      setDisplayValue(finalValue);
      const numValue = parseFloat(finalValue);
      if (!isNaN(numValue)) {
        onChange(numValue);
      } else if (finalValue === '') {
        onChange(0);
      }
      return;
    }

    const cleanValue = rawValue.replace(/[^0-9]/g, '');
    if (cleanValue === '') {
      setDisplayValue('');
      onChange(0);
      return;
    }

    const numValue = parseInt(cleanValue, 10);
    const formatted = formatNumber(numValue);
    const cursorPosition = e.target.selectionStart || 0;
    const oldLength = rawValue.length;

    setDisplayValue(formatted);
    onChange(numValue);

    setTimeout(() => {
      if (inputRef.current) {
        const newLength = formatted.length;
        const newPosition = cursorPosition + (newLength - oldLength);
        inputRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  return (
    <div className={className}>
      {label && <label className={labelClassName}>{label} {required && '*'}</label>}
      <div className="relative flex items-center gap-2 mt-1">
        {showControls && (
          <button
            type="button"
            onClick={() => onChange(Math.max(0, value - step))}
            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Minus size={14} />
          </button>
        )}
        <div className="relative flex-1">
          {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />}
          <input
            ref={inputRef}
            type="text"
            inputMode={isDecimal ? "decimal" : "numeric"}
            value={displayValue}
            onChange={handleChange}
            placeholder={placeholder}
            required={required}
            className={`${inputClassName} ${Icon ? 'pl-10' : ''} ${error ? 'border-red-500 ring-2 ring-red-500/10' : ''} ${showControls ? 'text-center' : ''}`}
          />
        </div>
        {showControls && (
          <button
            type="button"
            onClick={() => onChange(value + step)}
            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Plus size={14} />
          </button>
        )}
      </div>
    </div>
  );
};
