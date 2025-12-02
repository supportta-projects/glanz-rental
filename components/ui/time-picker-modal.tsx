"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";

interface TimePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: { hour: number; minute: number } | null;
  onChange: (time: { hour: number; minute: number }) => void;
  label?: string;
}

export function TimePickerModal({
  isOpen,
  onClose,
  value,
  onChange,
  label = "Select Time",
}: TimePickerModalProps) {
  const [selectedTime, setSelectedTime] = useState<{ hour: number; minute: number }>(
    value || { hour: new Date().getHours(), minute: 0 }
  );

  useEffect(() => {
    if (value) {
      setSelectedTime(value);
    }
  }, [value]);

  const handleConfirm = () => {
    onChange(selectedTime);
    onClose();
  };

  const handleCancel = () => {
    setSelectedTime(value || { hour: new Date().getHours(), minute: 0 });
    onClose();
  };

  const formatTime = (hour: number, minute: number) => {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${String(displayHour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" onClose={onClose}>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Time Display */}
          <div className="text-center py-4">
            <p className="text-4xl font-bold text-gray-900">
              {formatTime(selectedTime.hour, selectedTime.minute)}
            </p>
          </div>

          {/* Hour Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Hour</label>
            <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto">
              {Array.from({ length: 24 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedTime({ ...selectedTime, hour: i })}
                  className={cn(
                    "h-10 rounded-lg text-sm font-medium transition-colors",
                    selectedTime.hour === i
                      ? "bg-[#273492] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  {String(i).padStart(2, "0")}
                </button>
              ))}
            </div>
          </div>

          {/* Minute Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Minute</label>
            <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto">
              {[0, 15, 30, 45].map((minute) => (
                <button
                  key={minute}
                  type="button"
                  onClick={() => setSelectedTime({ ...selectedTime, minute })}
                  className={cn(
                    "h-10 rounded-lg text-sm font-medium transition-colors",
                    selectedTime.minute === minute
                      ? "bg-[#273492] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  {String(minute).padStart(2, "0")}
                </button>
              ))}
            </div>
          </div>

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

