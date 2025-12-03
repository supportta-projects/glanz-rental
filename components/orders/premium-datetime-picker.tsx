"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Calendar, Clock, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { 
  format, 
  setHours, 
  setMinutes, 
  startOfToday, 
  addDays,
  isBefore, 
  isSameDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
} from "date-fns";
import { cn } from "@/lib/utils/cn";

interface PremiumDateTimePickerProps {
  value: string | null; // ISO string
  onChange: (value: string | null) => void;
  min?: Date;
  label?: string;
  disabled?: boolean;
  placeholder?: string;
}

const QUICK_PRESETS = [
  { label: "Today", days: 0 },
  { label: "Tomorrow", days: 1 },
  { label: "+2 Days", days: 2 },
  { label: "+7 Days", days: 7 },
];

export function PremiumDateTimePicker({
  value,
  onChange,
  min = startOfToday(),
  label,
  disabled = false,
  placeholder = "Select date and time",
}: PremiumDateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    value ? new Date(value) : null
  );
  const [selectedTime, setSelectedTime] = useState<{ hour: number; minute: number; period: "AM" | "PM" }>(() => {
    if (value) {
      const date = new Date(value);
      const hours24 = date.getHours();
      const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
      return { 
        hour: hours12, 
        minute: date.getMinutes(),
        period: hours24 >= 12 ? "PM" : "AM"
      };
    }
    const now = new Date();
    const hours24 = now.getHours();
    const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
    return { 
      hour: hours12, 
      minute: Math.ceil(now.getMinutes() / 15) * 15,
      period: hours24 >= 12 ? "PM" : "AM"
    };
  });
  const [currentMonth, setCurrentMonth] = useState(() => 
    value ? new Date(value) : new Date()
  );
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  const now = new Date();

  // Ensure component is mounted before using portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate dropdown position when opened and handle resize/scroll
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const calculatePosition = () => {
        if (!buttonRef.current) return;
        
        const buttonRect = buttonRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const dropdownWidth = Math.min(400, viewportWidth - 16);
        const dropdownHeight = 600; // Approximate height
        
        // For mobile, center the dropdown
        if (viewportWidth < 768) {
          setDropdownPosition({
            top: Math.max(8, (viewportHeight - dropdownHeight) / 2),
            left: Math.max(8, (viewportWidth - dropdownWidth) / 2),
          });
          return;
        }
        
        // For desktop, position relative to button
        let top = buttonRect.bottom + 8;
        let left = buttonRect.left;
        
        // Adjust if dropdown would go off screen
        if (top + dropdownHeight > viewportHeight) {
          // Show above button if no space below
          top = buttonRect.top - dropdownHeight - 8;
          if (top < 0) {
            top = 8; // Stick to top if still doesn't fit
          }
        }
        
        if (left + dropdownWidth > viewportWidth) {
          left = viewportWidth - dropdownWidth - 8;
        }
        
        if (left < 8) {
          left = 8;
        }
        
        setDropdownPosition({ top, left });
      };

      calculatePosition();
      
      // Recalculate on resize or scroll
      window.addEventListener("resize", calculatePosition);
      window.addEventListener("scroll", calculatePosition, true);
      
      return () => {
        window.removeEventListener("resize", calculatePosition);
        window.removeEventListener("scroll", calculatePosition, true);
      };
    } else {
      setDropdownPosition(null);
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Initialize from value
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      setSelectedDate(date);
      const hours24 = date.getHours();
      const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
      setSelectedTime({ 
        hour: hours12, 
        minute: date.getMinutes(),
        period: hours24 >= 12 ? "PM" : "AM"
      });
      setCurrentMonth(date);
    }
  }, [value]);

  // Convert 12-hour to 24-hour format
  const convertTo24Hour = (hour12: number, period: "AM" | "PM"): number => {
    if (period === "AM") {
      return hour12 === 12 ? 0 : hour12;
    } else {
      return hour12 === 12 ? 12 : hour12 + 12;
    }
  };

  const handleQuickPreset = (days: number) => {
    const presetDate = addDays(startOfToday(), days);
    let presetTime: { hour: number; minute: number; period: "AM" | "PM" };
    
    if (days === 0) {
      const hours24 = now.getHours();
      const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
      presetTime = {
        hour: hours12,
        minute: Math.ceil((now.getMinutes() + 1) / 15) * 15,
        period: hours24 >= 12 ? "PM" : "AM"
      };
    } else {
      presetTime = { hour: 9, minute: 0, period: "AM" };
    }
    
    setSelectedDate(presetDate);
    setSelectedTime(presetTime);
    setCurrentMonth(presetDate);

    // Auto-apply immediately
    const hours24 = convertTo24Hour(presetTime.hour, presetTime.period);
    const finalDate = setMinutes(
      setHours(presetDate, hours24),
      presetTime.minute
    );
    onChange(finalDate.toISOString());
    setIsOpen(false);
  };

  const handleDateSelect = (date: Date) => {
    if (isBefore(date, min)) return;
    
    setSelectedDate(date);
    setCurrentMonth(date);

    // If selecting today, ensure time is in future
    if (isSameDay(date, now)) {
      const currentHour24 = now.getHours();
      const currentMinute = now.getMinutes();
      const currentHour12 = currentHour24 === 0 ? 12 : currentHour24 > 12 ? currentHour24 - 12 : currentHour24;
      const currentPeriod = currentHour24 >= 12 ? "PM" : "AM";
      
      const selectedHour24 = convertTo24Hour(selectedTime.hour, selectedTime.period);
      
      if (selectedHour24 < currentHour24 || 
          (selectedHour24 === currentHour24 && selectedTime.minute <= currentMinute)) {
        setSelectedTime({
          hour: currentHour12,
          minute: Math.ceil((currentMinute + 1) / 15) * 15,
          period: currentPeriod,
        });
      }
    }

    // Auto-apply immediately on date select (only if date is not today or time is valid)
    const hours24 = convertTo24Hour(selectedTime.hour, selectedTime.period);
    const finalDate = setMinutes(
      setHours(date, hours24),
      selectedTime.minute
    );
    
    // Validate before applying
    if (isSameDay(date, now) && isBefore(finalDate, now)) {
      // Time is in past, don't apply - user needs to adjust time
      return;
    }
    
    onChange(finalDate.toISOString());
    // Don't close - allow time adjustment
  };

  const handleTimeChange = (type: "hour" | "minute", val: number) => {
    if (!selectedDate) return;
    
    if (type === "hour") {
      const newHour = Math.max(1, Math.min(12, val));
      setSelectedTime({ ...selectedTime, hour: newHour });
    } else {
      const newMinute = Math.max(0, Math.min(59, Math.floor(val / 15) * 15));
      setSelectedTime({ ...selectedTime, minute: newMinute });
    }

    // Auto-apply immediately when time changes
    const hours24 = convertTo24Hour(
      type === "hour" ? Math.max(1, Math.min(12, val)) : selectedTime.hour,
      selectedTime.period
    );
    const minutes = type === "minute" ? Math.floor(val / 15) * 15 : selectedTime.minute;
    const finalDate = setMinutes(setHours(selectedDate, hours24), minutes);
    
    // Validate before applying
    if (isSameDay(selectedDate, now) && isBefore(finalDate, now)) {
      return;
    }
    
    onChange(finalDate.toISOString());
  };

  const handlePeriodChange = (period: "AM" | "PM") => {
    if (!selectedDate) return;
    
    setSelectedTime({ ...selectedTime, period });
    
    // Auto-apply immediately when period changes
    const hours24 = convertTo24Hour(selectedTime.hour, period);
    const finalDate = setMinutes(setHours(selectedDate, hours24), selectedTime.minute);
    
    // Validate before applying
    if (isSameDay(selectedDate, now) && isBefore(finalDate, now)) {
      return;
    }
    
    onChange(finalDate.toISOString());
  };

  const handleClear = () => {
    setSelectedDate(null);
    const hours24 = now.getHours();
    const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
    setSelectedTime({ 
      hour: hours12, 
      minute: Math.ceil(now.getMinutes() / 15) * 15,
      period: hours24 >= 12 ? "PM" : "AM"
    });
    onChange(null);
    setIsOpen(false);
  };

  // Calendar utilities
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => 
      direction === "prev" ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  const isDateDisabled = (date: Date) => isBefore(date, min);
  const isDateSelected = (date: Date) => 
    selectedDate && isSameDay(date, selectedDate);
  const isDateToday = (date: Date) => isSameDay(date, now);

  const displayValue = value
    ? format(new Date(value), "dd MMM yyyy, hh:mm a")
    : placeholder;

  const formatTime = (hour: number, minute: number, period: "AM" | "PM") => {
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;
  };

  return (
    <div className={cn("relative", disabled && "opacity-50 pointer-events-none")}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}

      {/* Trigger Button - Simple and Clear */}
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full h-14 justify-between text-left font-normal border-2",
          !value && "text-gray-500",
          "focus:border-[#273492] focus:ring-2 focus:ring-[#273492]/20"
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Calendar className="h-5 w-5 text-gray-400 flex-shrink-0" />
          <span className="truncate text-base">{displayValue}</span>
        </div>
        {value ? (
          <X
            className="h-4 w-4 text-gray-400 hover:text-gray-600 flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
          />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
        )}
      </Button>

      {/* Dropdown Picker - Rendered via Portal to bypass stacking contexts */}
      {mounted && isOpen && dropdownPosition && createPortal(
        <>
          {/* Backdrop to close on outside click */}
          <div 
            className="fixed inset-0 z-[99998] bg-black/20 backdrop-blur-sm" 
            onClick={() => setIsOpen(false)}
            style={{ zIndex: 99998 }}
          />
          
          <Card
            ref={dropdownRef}
            className="fixed z-[99999] w-[400px] max-w-[calc(100vw-2rem)] p-5 shadow-2xl border-2 border-gray-200 bg-white rounded-xl"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              maxHeight: 'calc(100vh - 2rem)',
              overflowY: 'auto',
              zIndex: 99999
            }}
            onClick={(e) => e.stopPropagation()}
          >
          <div className="space-y-5">
            {/* Quick Presets - Big Buttons */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Quick Select</p>
              <div className="grid grid-cols-4 gap-2">
                {QUICK_PRESETS.map((preset) => {
                  const presetDate = addDays(startOfToday(), preset.days);
                  const isSelected = selectedDate && isSameDay(selectedDate, presetDate);
                  
                  return (
                    <Button
                      key={preset.days}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleQuickPreset(preset.days)}
                      className={cn(
                        "h-10 text-xs font-medium",
                        isSelected && "bg-[#273492] hover:bg-[#1f2a7a] text-white"
                      )}
                    >
                      {preset.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Calendar - Simple Grid */}
            <div>
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateMonth("prev")}
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                >
                  ←
                </Button>
                <h3 className="text-base font-bold text-gray-900">
                  {format(currentMonth, "MMMM yyyy")}
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateMonth("next")}
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                >
                  →
                </Button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Day headers */}
                {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                  <div
                    key={i}
                    className="text-center text-xs font-semibold text-gray-500 py-2"
                  >
                    {day}
                  </div>
                ))}

                {/* Empty cells */}
                {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-10" />
                ))}

                {/* Days */}
                {daysInMonth.map((day) => {
                  const disabled = isDateDisabled(day);
                  const selected = isDateSelected(day);
                  const today = isDateToday(day);

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => handleDateSelect(day)}
                      disabled={disabled}
                      className={cn(
                        "h-10 rounded-lg text-sm font-medium transition-all",
                        disabled && "text-gray-300 cursor-not-allowed",
                        selected && "bg-[#273492] text-white font-bold",
                        !selected && today && "bg-blue-50 text-[#273492] font-bold ring-2 ring-[#273492]/30",
                        !selected && !disabled && !today && "text-gray-700 hover:bg-gray-100",
                      )}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Selection - Simple Inputs */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-semibold text-gray-700">Time</span>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Hour */}
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Hour (1-12)</label>
                  <Input
                    type="number"
                    min="1"
                    max="12"
                    value={selectedTime.hour}
                    onChange={(e) => handleTimeChange("hour", parseInt(e.target.value) || 1)}
                    className="h-12 text-center text-lg font-bold border-2"
                  />
                </div>
                
                <span className="text-2xl font-bold text-gray-400 pt-6">:</span>
                
                {/* Minute */}
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Minute (0-59)</label>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    step="15"
                    value={selectedTime.minute}
                    onChange={(e) => handleTimeChange("minute", parseInt(e.target.value) || 0)}
                    className="h-12 text-center text-lg font-bold border-2"
                  />
                </div>
                
                {/* AM/PM Selector */}
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Period</label>
                  <div className="flex gap-2 h-12">
                    <Button
                      type="button"
                      variant={selectedTime.period === "AM" ? "default" : "outline"}
                      onClick={() => handlePeriodChange("AM")}
                      className={cn(
                        "flex-1 h-12 text-base font-bold",
                        selectedTime.period === "AM" && "bg-[#273492] hover:bg-[#1f2a7a] text-white"
                      )}
                    >
                      AM
                    </Button>
                    <Button
                      type="button"
                      variant={selectedTime.period === "PM" ? "default" : "outline"}
                      onClick={() => handlePeriodChange("PM")}
                      className={cn(
                        "flex-1 h-12 text-base font-bold",
                        selectedTime.period === "PM" && "bg-[#273492] hover:bg-[#1f2a7a] text-white"
                      )}
                    >
                      PM
                    </Button>
                  </div>
                </div>
              </div>

              {/* Time Preview */}
              {selectedDate && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-gray-600 mb-1">Selected:</p>
                  <p className="text-base font-bold text-gray-900">
                    {format(selectedDate, "dd MMM yyyy")} at {formatTime(selectedTime.hour, selectedTime.minute, selectedTime.period)}
                  </p>
                </div>
              )}
            </div>

            {/* Close Button */}
            <Button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full h-11 bg-[#273492] hover:bg-[#1f2a7a] text-white"
            >
              Done
            </Button>
          </div>
        </Card>
        </>,
        document.body
      )}
    </div>
  );
}

