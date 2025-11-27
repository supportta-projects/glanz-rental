"use client";

import { useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { format, startOfToday, endOfToday, subDays, startOfWeek, endOfWeek } from "date-fns";
import { cn } from "@/lib/utils/cn";

export type DateRangeOption = "today" | "yesterday" | "last7days" | "custom";

export interface DateRange {
  start: Date;
  end: Date;
  option: DateRangeOption;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

const presets = [
  { label: "Today", value: "today" as DateRangeOption },
  { label: "Yesterday", value: "yesterday" as DateRangeOption },
  { label: "Last 7 Days", value: "last7days" as DateRangeOption },
  { label: "Custom", value: "custom" as DateRangeOption },
];

export function DateRangePicker({
  value,
  onChange,
  className,
}: DateRangePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [customStart, setCustomStart] = useState(
    value.option === "custom" ? format(value.start, "yyyy-MM-dd") : ""
  );
  const [customEnd, setCustomEnd] = useState(
    value.option === "custom" ? format(value.end, "yyyy-MM-dd") : ""
  );

  const handlePreset = (option: DateRangeOption) => {
    let start: Date;
    let end: Date = startOfToday();

    switch (option) {
      case "today":
        start = startOfToday();
        end = endOfToday();
        break;
      case "yesterday":
        start = subDays(startOfToday(), 1);
        end = subDays(startOfToday(), 1);
        break;
      case "last7days":
        start = subDays(startOfToday(), 6);
        end = startOfToday();
        break;
      case "custom":
        setShowPicker(true);
        return;
      default:
        start = startOfToday();
        end = startOfToday();
    }

    onChange({ start, end, option });
    setShowPicker(false);
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      onChange({
        start: new Date(customStart),
        end: new Date(customEnd),
        option: "custom",
      });
      setShowPicker(false);
    }
  };

  const getDisplayText = () => {
    if (value.option === "custom") {
      return `${format(value.start, "dd MMM")} - ${format(value.end, "dd MMM yyyy")}`;
    }
    const preset = presets.find((p) => p.value === value.option);
    return preset?.label || "Select Date Range";
  };

  return (
    <div className={cn("relative", className)}>
      <Button
        variant="outline"
        onClick={() => setShowPicker(!showPicker)}
        className="h-12 w-full md:w-auto md:min-w-[200px] justify-between"
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span className="text-sm font-medium">{getDisplayText()}</span>
        </div>
        <ChevronDown className="h-4 w-4" />
      </Button>

      {showPicker && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPicker(false)}
          />
          <Card className="absolute top-full left-0 mt-2 z-50 w-full md:w-80 p-4 shadow-lg">
            <div className="space-y-3">
              {/* Presets */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase">
                  Quick Select
                </div>
                {presets.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handlePreset(preset.value)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                      value.option === preset.value
                        ? "bg-sky-50 text-sky-600 font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Range */}
              {value.option === "custom" && (
                <div className="space-y-3 pt-3 border-t">
                  <div className="text-xs font-semibold text-gray-500 uppercase">
                    Custom Range
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        min={customStart}
                        className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                      />
                    </div>
                    <Button
                      onClick={handleCustomApply}
                      className="w-full h-10 bg-sky-500 hover:bg-sky-600"
                      disabled={!customStart || !customEnd}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

