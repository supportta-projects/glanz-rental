"use client";

import { DateTimePicker } from "@/components/ui/datetime-picker";
import { useToast } from "@/components/ui/toast";

interface OrderDateTimeSectionProps {
  startDate: string | null;
  endDate: string | null;
  onStartDateChange: (value: string | null) => void;
  onEndDateChange: (value: string | null) => void;
  minStartDate?: string;
}

/**
 * Reusable Order Date/Time Section Component
 * Handles rental start and end date/time selection with validation
 * 
 * @component
 * @example
 * ```tsx
 * <OrderDateTimeSection
 *   startDate={startDate}
 *   endDate={endDate}
 *   onStartDateChange={setStartDate}
 *   onEndDateChange={setEndDate}
 * />
 * ```
 */
export function OrderDateTimeSection({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  minStartDate,
}: OrderDateTimeSectionProps) {
  const { showToast } = useToast();

  const handleStartDateChange = (value: string | null) => {
    if (!value) {
      onStartDateChange(null);
      return;
    }

    const selectedDateTime = new Date(value);
    const now = new Date();

    if (selectedDateTime < now) {
      showToast("Cannot select past date or time", "error");
      return;
    }

    onStartDateChange(value);
  };

  const handleEndDateChange = (value: string | null) => {
    if (!value) {
      onEndDateChange(null);
      return;
    }

    const selectedDateTime = new Date(value);
    const startDateTime = startDate ? new Date(startDate) : new Date();
    const now = new Date();

    if (selectedDateTime < now) {
      showToast("Cannot select past date or time", "error");
      return;
    }

    if (selectedDateTime <= startDateTime) {
      showToast("End date must be after start date", "error");
      return;
    }

    onEndDateChange(value);
  };

  return (
    <div className="space-y-4">
      <DateTimePicker
        label="Rental Start Date & Time"
        value={startDate || new Date().toISOString()}
        onChange={handleStartDateChange}
        min={minStartDate || new Date().toISOString()}
        required
        className="w-full"
      />
      <DateTimePicker
        label="Rental End Date & Time"
        value={endDate || (startDate ? new Date(new Date(startDate).getTime() + 24 * 60 * 60 * 1000).toISOString() : new Date().toISOString())}
        onChange={handleEndDateChange}
        min={startDate || minStartDate || new Date().toISOString()}
        required
        className="w-full"
      />
    </div>
  );
}

