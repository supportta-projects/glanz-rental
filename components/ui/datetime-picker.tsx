"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { format, setHours, setMinutes, startOfToday, isBefore, isAfter } from "date-fns";
import { cn } from "@/lib/utils/cn";

interface DateTimePickerProps {
  value: string; // ISO string
  onChange: (value: string) => void;
  min?: string; // ISO string for minimum date/time
  label?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}

export function DateTimePicker({
  value,
  onChange,
  min,
  label,
  className,
  required,
  disabled,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    value ? new Date(value) : null
  );
  const [selectedTime, setSelectedTime] = useState<{ hour: number; minute: number }>({
    hour: value ? new Date(value).getHours() : new Date().getHours(),
    minute: value ? new Date(value).getMinutes() : 0,
  });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const pickerRef = useRef<HTMLDivElement>(null);

  const minDate = min ? new Date(min) : startOfToday();
  const now = new Date();

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
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
      setSelectedTime({ hour: date.getHours(), minute: date.getMinutes() });
    }
  }, [value]);

  const handleDateSelect = (date: Date) => {
    // Check if date is in the past
    if (isBefore(date, minDate)) {
      return;
    }

    setSelectedDate(date);
    
    // If date is today, ensure time is not in the past
    if (format(date, "yyyy-MM-dd") === format(now, "yyyy-MM-dd")) {
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      if (selectedTime.hour < currentHour || 
          (selectedTime.hour === currentHour && selectedTime.minute < currentMinute)) {
        setSelectedTime({
          hour: currentHour,
          minute: currentMinute + 1,
        });
      }
    }
  };

  const handleTimeChange = (type: "hour" | "minute", value: number) => {
    if (type === "hour") {
      const newHour = Math.max(0, Math.min(23, value));
      setSelectedTime({ ...selectedTime, hour: newHour });
    } else {
      const newMinute = Math.max(0, Math.min(59, value));
      setSelectedTime({ ...selectedTime, minute: newMinute });
    }
  };

  const handleApply = () => {
    if (!selectedDate) return;

    // Validate: if date is today, time must be in future
    if (format(selectedDate, "yyyy-MM-dd") === format(now, "yyyy-MM-dd")) {
      const selectedDateTime = setMinutes(
        setHours(selectedDate, selectedTime.hour),
        selectedTime.minute
      );
      
      if (isBefore(selectedDateTime, now)) {
        return; // Don't apply if time is in past
      }
    }

    const finalDate = setMinutes(
      setHours(selectedDate, selectedTime.hour),
      selectedTime.minute
    );

    onChange(finalDate.toISOString());
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedDate(null);
    setSelectedTime({ hour: now.getHours(), minute: now.getMinutes() });
    onChange("");
    setIsOpen(false);
  };

  // Generate calendar days
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    
    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const days = getDaysInMonth(currentMonth);
  const monthYear = format(currentMonth, "MMMM yyyy");

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const isDateDisabled = (date: Date) => {
    return isBefore(date, minDate);
  };

  const isDateSelected = (date: Date) => {
    if (!selectedDate) return false;
    return format(date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
  };

  const isDateToday = (date: Date) => {
    return format(date, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");
  };

  const displayValue = value
    ? format(new Date(value), "dd MMM yyyy, hh:mm a")
    : "";

  return (
    <div className={cn("relative", className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Mobile: Native datetime-local input */}
      <div className="md:hidden">
        <Input
          type="datetime-local"
          value={value ? new Date(value).toISOString().slice(0, 16) : ""}
          onChange={(e) => {
            const datetime = e.target.value ? new Date(e.target.value).toISOString() : "";
            onChange(datetime);
          }}
          min={min ? new Date(min).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)}
          className="h-14 text-base rounded-xl"
          required={required}
          disabled={disabled}
        />
        {displayValue && (
          <p className="text-xs text-gray-500 mt-1">{displayValue}</p>
        )}
      </div>

      {/* Desktop: Custom picker */}
      <div className="hidden md:block">
        <Button
          type="button"
          variant="outline"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            "h-14 w-full justify-between text-left font-normal",
            !value && "text-gray-500"
          )}
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <span>{displayValue || "Select date and time"}</span>
          </div>
          {value && (
            <X
              className="h-4 w-4 text-gray-400 hover:text-gray-600"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
            />
          )}
        </Button>

        {isOpen && (
          <Card
            ref={pickerRef}
            className="absolute top-full left-0 mt-2 z-50 w-[380px] p-4 shadow-xl border border-gray-200"
          >
            <div className="space-y-4">
              {/* Calendar Header */}
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateMonth("prev")}
                  className="h-8 w-8 p-0"
                >
                  ←
                </Button>
                <h3 className="text-base font-semibold text-gray-900">{monthYear}</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateMonth("next")}
                  className="h-8 w-8 p-0"
                >
                  →
                </Button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Day headers */}
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div
                    key={day}
                    className="text-xs font-semibold text-gray-500 text-center py-2"
                  >
                    {day}
                  </div>
                ))}

                {/* Calendar days */}
                {days.map((date, index) => {
                  if (!date) {
                    return <div key={`empty-${index}`} className="h-10" />;
                  }

                  const disabled = isDateDisabled(date);
                  const selected = isDateSelected(date);
                  const today = isDateToday(date);

                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      onClick={() => !disabled && handleDateSelect(date)}
                      disabled={disabled}
                      className={cn(
                        "h-10 rounded-lg text-sm font-medium transition-colors",
                        disabled && "text-gray-300 cursor-not-allowed",
                        !disabled && "hover:bg-gray-100",
                        selected && "bg-sky-500 text-white hover:bg-sky-600",
                        !selected && today && "bg-sky-50 text-sky-600 font-semibold",
                        !selected && !today && !disabled && "text-gray-700"
                      )}
                    >
                      {format(date, "d")}
                    </button>
                  );
                })}
              </div>

              {/* Time Selection */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">Time</span>
                </div>
                <div className="flex items-center gap-4">
                  {/* Hour */}
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">Hour</label>
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      value={selectedTime.hour}
                      onChange={(e) => handleTimeChange("hour", parseInt(e.target.value) || 0)}
                      className="h-12 text-center text-lg font-semibold"
                    />
                  </div>
                  <span className="text-2xl font-bold text-gray-400 pt-6">:</span>
                  {/* Minute */}
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">Minute</label>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={selectedTime.minute}
                      onChange={(e) => handleTimeChange("minute", parseInt(e.target.value) || 0)}
                      className="h-12 text-center text-lg font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 h-12"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleApply}
                  disabled={!selectedDate}
                  className="flex-1 h-12 bg-sky-500 hover:bg-sky-600"
                >
                  Apply
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

