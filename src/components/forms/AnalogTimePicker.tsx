"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { X, Check, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui";
import { BottomSheet } from "@/components/ui";

interface TimePickerLabels {
  selectTime: string;
  hour: string;
  minute: string;
  am: string;
  pm: string;
  done: string;
  cancel: string;
  saveTime: string;
}

interface AnalogTimePickerProps {
  value: string; // HH:mm 24-hour format
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
  format?: "12h" | "24h";
  error?: string;
  labels: TimePickerLabels;
}

function parseTime24(time24: string): { hour: number; minute: number } | null {
  if (!time24) return null;
  const parts = time24.split(":");
  if (parts.length !== 2) return null;
  const hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10);
  if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function formatTime24(hour: number, minute: number): string {
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

function hour24To12(hour24: number): { hour12: number; ampm: "AM" | "PM" } {
  if (hour24 === 0) return { hour12: 12, ampm: "AM" };
  if (hour24 === 12) return { hour12: 12, ampm: "PM" };
  if (hour24 > 12) return { hour12: hour24 - 12, ampm: "PM" };
  return { hour12: hour24, ampm: "AM" };
}

function hour12To24(hour12: number, ampm: "AM" | "PM"): number {
  if (hour12 === 12) return ampm === "AM" ? 0 : 12;
  return ampm === "PM" ? hour12 + 12 : hour12;
}

function getHourPositions(hour: number): { x: number; y: number } {
  const angle = ((hour % 12) * 30 - 90) * (Math.PI / 180);
  const radius = 0.75;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

function getMinutePositions(minute: number): { x: number; y: number } {
  const angle = (minute * 6 - 90) * (Math.PI / 180);
  const radius = 0.88;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

export function AnalogTimePicker({
  value,
  onChange,
  label,
  disabled = false,
  format = "12h",
  error,
  labels,
}: AnalogTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"hour" | "minute">("hour");
  const [tempHour, setTempHour] = useState<number | null>(null);
  const [tempMinute, setTempMinute] = useState<number | null>(null);
  const [tempAmpm, setTempAmpm] = useState<"AM" | "PM">("AM");
  const [isMobile, setIsMobile] = useState(false);

  // Initialize from value prop
  useEffect(() => {
    const parsed = parseTime24(value);
    if (parsed) {
      const { hour12, ampm } = hour24To12(parsed.hour);
      setTempHour(hour12);
      setTempMinute(parsed.minute);
      setTempAmpm(ampm);
    } else {
      setTempHour(null);
      setTempMinute(null);
      setTempAmpm("AM");
    }
    setMode("hour");
  }, [value]);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleConfirm = useCallback(() => {
    if (tempHour === null || tempMinute === null) return;
    const hour24 = hour12To24(tempHour, tempAmpm);
    const time24 = formatTime24(hour24, tempMinute);
    onChange(time24);
    setIsOpen(false);
  }, [tempHour, tempMinute, tempAmpm, onChange]);

  const handleCancel = useCallback(() => {
    const parsed = parseTime24(value);
    if (parsed) {
      const { hour12, ampm } = hour24To12(parsed.hour);
      setTempHour(hour12);
      setTempMinute(parsed.minute);
      setTempAmpm(ampm);
    }
    setMode("hour");
    setIsOpen(false);
  }, [value]);

  const selectHour = useCallback((hour: number) => {
    setTempHour(hour);
    setMode("minute");
  }, []);

  const selectMinute = useCallback((minute: number) => {
    setTempMinute(minute);
  }, []);

  const handleHourInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    if (val) {
      const hour = parseInt(val, 10);
      if (hour >= 1 && hour <= 12) setTempHour(hour);
    } else {
      setTempHour(null);
    }
  }, []);

  const handleMinuteInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    if (val) {
      const minute = parseInt(val, 10);
      if (minute >= 0 && minute <= 59) setTempMinute(minute);
    } else {
      setTempMinute(null);
    }
  }, []);

  const handleAmpmChange = useCallback((ampm: "AM" | "PM") => {
    setTempAmpm(ampm);
  }, []);

  const displayValue = useMemo(() => {
    if (!value) return "";
    const parsed = parseTime24(value);
    if (!parsed) return "";
    if (format === "24h") {
      return formatTime24(parsed.hour, parsed.minute);
    }
    const { hour12, ampm } = hour24To12(parsed.hour);
    return `${hour12.toString().padStart(2, "0")}:${parsed.minute.toString().padStart(2, "0")} ${ampm}`;
  }, [value, format]);

  // Clean, well-spaced UI without overlaps
  const content = (
    <div className="flex flex-col gap-4 w-full max-w-[320px] mx-auto py-2">
      {/* 1. Time Input Section & AM/PM Selector in clean horizontal bar */}
      <div className="flex items-center justify-center gap-2 bg-[var(--surface)] p-2 rounded-xl border border-[var(--border-subtle)]">
        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          placeholder="HH"
          value={tempHour?.toString().padStart(2, "0") || ""}
          onChange={handleHourInputChange}
          onClick={() => setMode("hour")}
          disabled={disabled}
          className={cn(
            "w-12 h-10 text-center text-base font-mono font-bold rounded-lg border bg-white transition-all shadow-sm",
            mode === "hour"
              ? "border-[var(--brand)] ring-2 ring-[var(--brand-soft)] text-[var(--brand)]"
              : "border-[var(--border-subtle)] text-[var(--ink)]",
          )}
          aria-label={labels.hour}
        />
        <span className="text-lg font-bold text-[var(--ink)]">:</span>
        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          placeholder="MM"
          value={tempMinute?.toString().padStart(2, "0") || ""}
          onChange={handleMinuteInputChange}
          onClick={() => setMode("minute")}
          disabled={disabled}
          className={cn(
            "w-12 h-10 text-center text-base font-mono font-bold rounded-lg border bg-white transition-all shadow-sm",
            mode === "minute"
              ? "border-[var(--brand)] ring-2 ring-[var(--brand-soft)] text-[var(--brand)]"
              : "border-[var(--border-subtle)] text-[var(--ink)]",
          )}
          aria-label={labels.minute}
        />
        <div className="flex bg-white rounded-lg border-2 border-[var(--border-subtle)] p-0.5 ml-2 shadow-sm" role="group" aria-label="AM/PM">
          <button
            type="button"
            onClick={() => handleAmpmChange("AM")}
            disabled={disabled}
            className={cn(
              "px-4 h-10 rounded-md text-base font-bold transition-all",
              tempAmpm === "AM"
                ? "bg-[var(--brand)] text-white shadow-lg"
                : "bg-white text-black border-2 border-[var(--brand)] hover:bg-[var(--brand-soft)] hover:shadow",
            )}
            aria-pressed={tempAmpm === "AM"}
          >
            {labels.am}
          </button>
          <button
            type="button"
            onClick={() => handleAmpmChange("PM")}
            disabled={disabled}
            className={cn(
              "px-4 h-10 rounded-md text-base font-bold transition-all",
              tempAmpm === "PM"
                ? "bg-[var(--brand)] text-white shadow-lg"
                : "bg-white text-black border-2 border-[var(--brand)] hover:bg-[var(--brand-soft)] hover:shadow",
            )}
            aria-pressed={tempAmpm === "PM"}
          >
            {labels.pm}
          </button>
        </div>
      </div>

      {/* 2. Mode Selector Tabs (Hour / Minute) */}
      <div className="flex justify-center gap-2">
        <button
          type="button"
          onClick={() => setMode("hour")}
          disabled={disabled}
          className={cn(
            "px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all",
            mode === "hour"
              ? "bg-[var(--brand)] text-white shadow"
              : "bg-[var(--surface)] text-[var(--ink-muted)] hover:bg-[var(--border-subtle)]",
          )}
        >
          {labels.hour}
        </button>
        <button
          type="button"
          onClick={() => setMode("minute")}
          disabled={disabled}
          className={cn(
            "px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all",
            mode === "minute"
              ? "bg-[var(--brand)] text-white shadow"
              : "bg-[var(--surface)] text-[var(--ink-muted)] hover:bg-[var(--border-subtle)]",
          )}
        >
          {labels.minute}
        </button>
      </div>

      {/* 3. Clock Dial */}
      <div className="relative flex items-center justify-center" style={{ width: "260px", height: "260px", margin: "0 auto" }}>
        <svg
          viewBox="-120 -120 240 240"
          className="w-full h-full drop-shadow-sm"
          role="img"
          aria-label="Analog clock for time selection"
        >
          {/* Clock face background */}
          <circle cx="0" cy="0" r="112" fill="var(--surface)" stroke="var(--border-subtle)" strokeWidth="2" />
          <circle cx="0" cy="0" r="106" fill="white" />

          {/* Center pivot */}
          <circle cx="0" cy="0" r="5" fill="var(--brand)" />

          {/* Hour/Minute marks and numbers */}
          {mode === "hour" ? (
            <>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => {
                const pos = getHourPositions(h);
                const isSelected = tempHour === h;
                return (
                  <g key={h} className="cursor-pointer" onClick={() => !disabled && selectHour(h)}>
                    {isSelected && (
                      <circle
                        cx={pos.x * 82}
                        cy={pos.y * 82}
                        r={18}
                        fill="var(--brand)"
                      />
                    )}
                    <text
                      x={pos.x * 82}
                      y={pos.y * 82 + 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="15"
                      fontWeight={isSelected ? "bold" : "600"}
                      fill={isSelected ? "white" : "var(--ink)"}
                      className="select-none"
                    >
                      {h}
                    </text>
                  </g>
                );
              })}
              {/* Hour hand */}
              {tempHour !== null && (
                <line
                  x1={0}
                  y1={0}
                  x2={getHourPositions(tempHour).x * 60}
                  y2={getHourPositions(tempHour).y * 60}
                  stroke="var(--brand)"
                  strokeWidth={4}
                  strokeLinecap="round"
                />
              )}
            </>
          ) : (
            <>
              {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => {
                const pos = getMinutePositions(m);
                const isSelected = tempMinute === m;
                return (
                  <g key={m} className="cursor-pointer" onClick={() => !disabled && selectMinute(m)}>
                    {isSelected && (
                      <circle
                        cx={pos.x * 86}
                        cy={pos.y * 86}
                        r={16}
                        fill="var(--brand)"
                      />
                    )}
                    <text
                      x={pos.x * 86}
                      y={pos.y * 86 + 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="13"
                      fontWeight={isSelected ? "bold" : "500"}
                      fill={isSelected ? "white" : "var(--ink-muted)"}
                      className="select-none"
                    >
                      {m.toString().padStart(2, "0")}
                    </text>
                  </g>
                );
              })}
              {/* Minute hand */}
              {tempMinute !== null && (
                <line
                  x1={0}
                  y1={0}
                  x2={getMinutePositions(tempMinute).x * 75}
                  y2={getMinutePositions(tempMinute).y * 75}
                  stroke="var(--brand)"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
              )}
            </>
          )}

          {/* Larger invisible touch targets for clock numbers */}
          {mode === "hour" ? (
            Array.from({ length: 12 }, (_, i) => i + 1).map((h) => {
              const pos = getHourPositions(h);
              return (
                <circle
                  key={h}
                  cx={pos.x * 82}
                  cy={pos.y * 82}
                  r={22}
                  fill="transparent"
                  onClick={() => !disabled && selectHour(h)}
                  style={{ cursor: disabled ? "not-allowed" : "pointer" }}
                />
              );
            })
          ) : (
            Array.from({ length: 60 }, (_, i) => i).map((m) => {
              const pos = getMinutePositions(m);
              return (
                <circle
                  key={m}
                  cx={pos.x * 86}
                  cy={pos.y * 86}
                  r={14}
                  fill="transparent"
                  onClick={() => !disabled && selectMinute(m)}
                  style={{ cursor: disabled ? "not-allowed" : "pointer" }}
                />
              );
            })
          )}
        </svg>
      </div>

      {/* 4. Actions Footer - Distinct [Cancel] [Save Time] Buttons */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
        <Button type="button" variant="ghost" size="sm" onClick={handleCancel} disabled={disabled}>
          {labels.cancel}
        </Button>
        <Button type="button" size="sm" onClick={handleConfirm} disabled={disabled || tempHour === null || tempMinute === null}>
          {labels.saveTime}
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div className="relative">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className={cn("w-full justify-start gap-2", error && "border-[var(--danger)]")}
            onClick={() => !disabled && setIsOpen(true)}
            disabled={disabled}
            aria-haspopup="dialog"
            aria-label={label || labels.selectTime}
          >
            <Clock className="h-4 w-4" />
            <span className="flex-1 text-left">{displayValue || labels.selectTime}</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
          {error && <p className="mt-1 text-[11px] text-[var(--danger)]" role="alert">{error}</p>}
        </div>
        <BottomSheet
          open={isOpen}
          onClose={handleCancel}
          title={label || labels.selectTime}
          className="max-h-[90vh]"
        >
          {content}
        </BottomSheet>
      </>
    );
  }

  // Desktop: Modal
  return (
    <>
      <div className="relative">
        <Button
          type="button"
          variant="secondary"
          size="sm"
            className={cn("w-full justify-start gap-2", error && "border-[var(--danger)]")}
          onClick={() => !disabled && setIsOpen(true)}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-label={label || labels.selectTime}
        >
          <Clock className="h-4 w-4" />
          <span className="flex-1 text-left">{displayValue || labels.selectTime}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
        {error && <p className="mt-1 text-[11px] text-[var(--danger)]" role="alert">{error}</p>}
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="time-picker-title"
        >
          <div
            className="absolute inset-0 bg-black/50 transition-opacity"
            onClick={handleCancel}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-[var(--surface-card)] shadow-2xl border border-[var(--border-subtle)] p-5 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] mb-3">
              <h3 id="time-picker-title" className="font-bold text-base text-[var(--ink)]">
                {label || labels.selectTime}
              </h3>
              <button
                type="button"
                onClick={handleCancel}
                className="p-1 rounded-lg text-[var(--ink-muted)] hover:bg-[var(--surface)]"
                aria-label={labels.cancel}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {content}
          </div>
        </div>
      )}
    </>
  );
}