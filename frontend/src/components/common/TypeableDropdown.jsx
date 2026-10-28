import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * TypeableDropdown (Combobox)
 * Allows free-form typing while showing a filterable dropdown of existing options.
 */
export default function TypeableDropdown({
  name,
  value = '',
  onChange,
  options = [],
  placeholder = 'Type or select...',
  required = false,
  disabled = false,
  className = '',
  uppercase = false,
  id,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Filter options based on current input text
  const cleanOptions = Array.isArray(options)
    ? options.filter((opt) => opt !== null && opt !== undefined && String(opt).trim() !== '')
    : [];

  const filteredOptions = cleanOptions.filter((opt) =>
    String(opt).toLowerCase().includes((value || '').toLowerCase())
  );

  const handleInputChange = (e) => {
    if (onChange) {
      onChange(e);
    }
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleSelectOption = (option) => {
    if (onChange) {
      onChange({
        target: {
          name,
          value: option,
        },
      });
    }
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
    if (!isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          type="text"
          name={name}
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            if (!disabled && cleanOptions.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete="off"
          className={`w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl pl-3.5 pr-9 py-2.5 text-xs sm:text-sm font-medium focus:outline-none focus:border-[#01390f] focus:bg-white transition-all ${
            uppercase ? 'uppercase' : ''
          } ${disabled ? 'bg-slate-100 cursor-not-allowed text-slate-400' : 'cursor-text'} ${className}`}
        />

        <button
          type="button"
          tabIndex={-1}
          onClick={toggleDropdown}
          disabled={disabled}
          aria-label={`Toggle ${name} dropdown`}
          className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 transition-transform cursor-pointer rounded-lg hover:bg-slate-100/80"
        >
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#01390f]' : ''}`}
          />
        </button>
      </div>

      {/* DROPDOWN MENU */}
      {isOpen && cleanOptions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar py-1 animate-in fade-in zoom-in-95 duration-150">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, idx) => {
              const isSelected = String(value).trim().toLowerCase() === String(option).trim().toLowerCase();
              return (
                <button
                  key={`${option}-${idx}`}
                  type="button"
                  onClick={() => handleSelectOption(option)}
                  className={`w-full text-left px-3.5 py-2 text-xs sm:text-sm font-medium transition-colors flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 text-[#01390f] font-semibold'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-[#01390f]'
                  }`}
                >
                  <span className="truncate">{option}</span>
                  {isSelected && <Check size={14} className="text-[#01390f] shrink-0 ml-2" />}
                </button>
              );
            })
          ) : (
            <div className="px-3.5 py-2.5 text-xs text-slate-400 italic text-center">
              No matching existing options
              <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                (Your typed input will be saved as new)
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
