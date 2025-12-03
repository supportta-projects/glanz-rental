"use client";

import { PremiumDateTimePicker } from "./premium-datetime-picker";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { isBefore, addDays } from "date-fns";

interface OrderDateTimeSectionProps {
  startDate: string | null;
  endDate: string | null;
  onStartDateChange: (value: string | null) => void;
  onEndDateChange: (value: string | null) => void;
  minStartDate?: string;
}

/**
 * Order Date/Time Section - Easy to Use
 * Uses unified date/time picker for better UX
 */
export function OrderDateTimeSection({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  minStartDate,
}: OrderDateTimeSectionProps) {
  const { showToast } = useToast();
  const now = new Date();
  const minDate = minStartDate ? new Date(minStartDate) : now;

  const handleStartDateChange = (value: string | null) => {
    if (!value) {
      onStartDateChange(null);
      return;
    }

    const newDate = new Date(value);
    if (isBefore(newDate, now)) {
      showToast("Cannot select past date/time", "error");
      return;
    }

    onStartDateChange(value);

    // Auto-set end date to +1 day if not set
    if (!endDate) {
      const endDateTime = addDays(newDate, 1);
      endDateTime.setHours(newDate.getHours());
      endDateTime.setMinutes(newDate.getMinutes());
      onEndDateChange(endDateTime.toISOString());
    }
  };

  const handleEndDateChange = (value: string | null) => {
    if (!value) {
      onEndDateChange(null);
      return;
    }

    const newDate = new Date(value);
    const startDateTime = startDate ? new Date(startDate) : now;

    if (isBefore(newDate, startDateTime) || newDate.getTime() === startDateTime.getTime()) {
      showToast("End date/time must be after start date/time", "error");
      return;
    }

    onEndDateChange(value);
  };

  return (
    <div className="space-y-5">
      {/* Start Date & Time */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">
          Rental Start Date & Time <span className="text-[#e7342f]">*</span>
        </Label>
        <PremiumDateTimePicker
          value={startDate}
          onChange={handleStartDateChange}
          min={minDate}
          placeholder="Select start date and time"
        />
      </div>

      {/* End Date & Time */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">
          Rental End Date & Time <span className="text-[#e7342f]">*</span>
        </Label>
        <PremiumDateTimePicker
          value={endDate}
          onChange={handleEndDateChange}
          min={startDate ? new Date(startDate) : minDate}
          placeholder="Select end date and time"
          disabled={!startDate}
        />
        {!startDate && (
          <p className="text-xs text-gray-500">Please select start date first</p>
        )}
      </div>
    </div>
  );
}
