"use client";

import { useState, useEffect } from "react";
import { Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, startOfToday, isBefore, isAfter, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from "date-fns";
import { cn } from "@/lib/utils/cn";

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: Date | null;
  onChange: (date: Date | null) => void;
  min?: Date;
  label?: string;
}

export function DatePickerModal({
  isOpen,
  onClose,
  value,
  onChange,
  min = startOfToday(),
  label = "Select Date",
}: DatePickerModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(value);
  const [currentMonth, setCurrentMonth] = useState(value || new Date());

  useEffect(() => {
    if (value) {
      setSelectedDate(value);
      setCurrentMonth(value);
    }
  }, [value]);

  const handleDateSelect = (date: Date) => {
    if (isBefore(date, min)) {
      return; // Don't allow selecting dates before min
    }
    setSelectedDate(date);
  };

  const handleConfirm = () => {
    onChange(selectedDate);
    onClose();
  };

  const handleCancel = () => {
    setSelectedDate(value);
    onClose();
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const previousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const today = new Date();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" onClose={onClose}>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={previousMonth}
              className="h-8 w-8 p-0"
            >
              <span className="sr-only">Previous month</span>
              ←
            </Button>
            <h3 className="text-lg font-semibold">
              {format(currentMonth, "MMMM yyyy")}
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={nextMonth}
              className="h-8 w-8 p-0"
            >
              <span className="sr-only">Next month</span>
              →
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-gray-500 py-2"
              >
                {day}
              </div>
            ))}

            {/* Empty cells for days before month start */}
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="h-10" />
            ))}

            {/* Days in month */}
            {daysInMonth.map((day) => {
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isToday = isSameDay(day, today);
              const isDisabled = isBefore(day, min);
              const isCurrentMonth = isSameMonth(day, currentMonth);

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => handleDateSelect(day)}
                  disabled={isDisabled}
                  className={cn(
                    "h-10 rounded-lg text-sm transition-colors",
                    isSelected
                      ? "bg-[#273492] text-white font-semibold"
                      : isToday
                      ? "bg-[#273492]/10 text-[#273492] font-medium"
                      : isDisabled
                      ? "text-gray-300 cursor-not-allowed"
                      : isCurrentMonth
                      ? "text-gray-900 hover:bg-gray-100"
                      : "text-gray-400",
                    !isDisabled && !isSelected && "hover:bg-gray-100"
                  )}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

          {/* Selected Date Display */}
          {selectedDate && (
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600 mb-1">Selected Date</p>
              <p className="text-base font-semibold text-gray-900">
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedDate}
              className="flex-1 bg-[#273492] hover:bg-[#1f2a7a]"
            >
              Confirm
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

