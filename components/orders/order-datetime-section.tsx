"use client";

import { useState } from "react";
import { Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { DatePickerModal } from "@/components/ui/date-picker-modal";
import { TimePickerModal } from "@/components/ui/time-picker-modal";
import { format, setHours, setMinutes } from "date-fns";

interface OrderDateTimeSectionProps {
  startDate: string | null;
  endDate: string | null;
  onStartDateChange: (value: string | null) => void;
  onEndDateChange: (value: string | null) => void;
  minStartDate?: string;
}

/**
 * Reusable Order Date/Time Section Component
 * Uses simple modals for date and time selection (separate modals)
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
  
  // Start date/time modals
  const [startDateModalOpen, setStartDateModalOpen] = useState(false);
  const [startTimeModalOpen, setStartTimeModalOpen] = useState(false);
  
  // End date/time modals
  const [endDateModalOpen, setEndDateModalOpen] = useState(false);
  const [endTimeModalOpen, setEndTimeModalOpen] = useState(false);

  const minDate = minStartDate ? new Date(minStartDate) : new Date();
  const startDateObj = startDate ? new Date(startDate) : new Date();
  const endDateObj = endDate ? new Date(endDate) : null;

  const handleStartDateSelect = (date: Date | null) => {
    if (!date) return;
    
    const now = new Date();
    if (date < now) {
      showToast("Cannot select past date", "error");
      return;
    }

    // Preserve existing time or use current time
    const existingTime = startDate ? new Date(startDate) : new Date();
    const newDateTime = setHours(
      setMinutes(date, existingTime.getMinutes()),
      existingTime.getHours()
    );
    
    onStartDateChange(newDateTime.toISOString());
  };

  const handleStartTimeSelect = (time: { hour: number; minute: number }) => {
    const baseDate = startDate ? new Date(startDate) : new Date();
    const newDateTime = setHours(setMinutes(baseDate, time.minute), time.hour);
    
    const now = new Date();
    if (newDateTime < now) {
      showToast("Cannot select past time", "error");
      return;
    }

    onStartDateChange(newDateTime.toISOString());
  };

  const handleEndDateSelect = (date: Date | null) => {
    if (!date) return;
    
    const startDateTime = startDate ? new Date(startDate) : new Date();
    if (date <= startDateTime) {
      showToast("End date must be after start date", "error");
      return;
    }

    // Preserve existing time or use start time
    const existingTime = endDate ? new Date(endDate) : startDateTime;
    const newDateTime = setHours(
      setMinutes(date, existingTime.getMinutes()),
      existingTime.getHours()
    );
    
    onEndDateChange(newDateTime.toISOString());
  };

  const handleEndTimeSelect = (time: { hour: number; minute: number }) => {
    const baseDate = endDate ? new Date(endDate) : (startDate ? new Date(startDate) : new Date());
    const newDateTime = setHours(setMinutes(baseDate, time.minute), time.hour);
    
    const startDateTime = startDate ? new Date(startDate) : new Date();
    if (newDateTime <= startDateTime) {
      showToast("End time must be after start time", "error");
      return;
    }

    onEndDateChange(newDateTime.toISOString());
  };

  const formatDisplayDateTime = (dateString: string | null) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    return format(date, "dd MMM yyyy, hh:mm a");
  };

  return (
    <div className="space-y-4">
      {/* Start Date & Time */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">
          Rental Start Date & Time <span className="text-[#e7342f]">*</span>
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStartDateModalOpen(true)}
            className="h-14 justify-start text-left font-normal"
          >
            <Calendar className="h-5 w-5 mr-2 text-gray-400" />
            <span className={startDate ? "text-gray-900" : "text-gray-500"}>
              {startDate ? format(startDateObj, "dd MMM yyyy") : "Select Date"}
            </span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setStartTimeModalOpen(true)}
            className="h-14 justify-start text-left font-normal"
          >
            <Clock className="h-5 w-5 mr-2 text-gray-400" />
            <span className={startDate ? "text-gray-900" : "text-gray-500"}>
              {startDate ? format(startDateObj, "hh:mm a") : "Select Time"}
            </span>
          </Button>
        </div>
        {startDate && (
          <p className="text-xs text-gray-500">{formatDisplayDateTime(startDate)}</p>
        )}
      </div>

      {/* End Date & Time */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">
          Rental End Date & Time <span className="text-[#e7342f]">*</span>
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setEndDateModalOpen(true)}
            className="h-14 justify-start text-left font-normal"
            disabled={!startDate}
          >
            <Calendar className="h-5 w-5 mr-2 text-gray-400" />
            <span className={endDate ? "text-gray-900" : "text-gray-500"}>
              {endDate ? format(endDateObj!, "dd MMM yyyy") : "Select Date"}
            </span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setEndTimeModalOpen(true)}
            className="h-14 justify-start text-left font-normal"
            disabled={!startDate}
          >
            <Clock className="h-5 w-5 mr-2 text-gray-400" />
            <span className={endDate ? "text-gray-900" : "text-gray-500"}>
              {endDate ? format(endDateObj!, "hh:mm a") : "Select Time"}
            </span>
          </Button>
        </div>
        {endDate && (
          <p className="text-xs text-gray-500">{formatDisplayDateTime(endDate)}</p>
        )}
      </div>

      {/* Modals */}
      <DatePickerModal
        isOpen={startDateModalOpen}
        onClose={() => setStartDateModalOpen(false)}
        value={startDateObj}
        onChange={handleStartDateSelect}
        min={minDate}
        label="Select Start Date"
      />

      <TimePickerModal
        isOpen={startTimeModalOpen}
        onClose={() => setStartTimeModalOpen(false)}
        value={startDate ? { hour: startDateObj.getHours(), minute: startDateObj.getMinutes() } : null}
        onChange={handleStartTimeSelect}
        label="Select Start Time"
      />

      <DatePickerModal
        isOpen={endDateModalOpen}
        onClose={() => setEndDateModalOpen(false)}
        value={endDateObj}
        onChange={handleEndDateSelect}
        min={startDate ? startDateObj : minDate}
        label="Select End Date"
      />

      <TimePickerModal
        isOpen={endTimeModalOpen}
        onClose={() => setEndTimeModalOpen(false)}
        value={endDate ? { hour: endDateObj!.getHours(), minute: endDateObj!.getMinutes() } : null}
        onChange={handleEndTimeSelect}
        label="Select End Time"
      />
    </div>
  );
}

