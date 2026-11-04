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
  const radius = 0.78;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

function getMinutePositions(minute: number): { x: number; y: number } {
  const angle = (minute * 6 - 90) * (Math.PI / 180);
  const radius = 0.92;
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
    // Reset to original value
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

  // For display value in input
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

  // Content for both modal and bottom sheet (no duplicate heading inside)
  const content = (
    <div className="space-y-3">
      {/* Time Input Section */}
      <div className="flex items-center justify-center gap-2">
        <div className="relative">
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
              "w-14 h-11 text-center text-lg font-mono rounded-lg border bg-white transition-colors",
              mode === "hour"
                ? "border-[var(--brand)] bg-[var(--brand-soft)]"
                : "border-[var(--border-subtle)] hover:border-[var(--brand-muted)]",
            )}
            aria-label={labels.hour}
          />
        </div>
        <span className="text-lg font-mono text-[var(--ink)]">:</span>
        <div className="relative">
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
              "w-14 h-11 text-center text-lg font-mono rounded-lg border bg-white transition-colors",
              mode === "minute"
                ? "border-[var(--brand)] bg-[var(--brand-soft)]"
                : "border-[var(--border-subtle)] hover:border-[var(--brand-muted)]",
            )}
            aria-label={labels.minute}
          />
        </div>
        <div className="flex gap-1" role="group" aria-label="AM/PM">
          <button
            type="button"
            onClick={() => handleAmpmChange("AM")}
            disabled={disabled}
            className={cn(
              "flex-1 h-11 rounded-lg text-sm font-medium transition-all duration-150 border",
              tempAmpm === "AM"
                ? "bg-[var(--brand)] text-white border-transparent shadow-sm"
                : "bg-white text-[var(--ink)] border-[var(--border-subtle)] hover:bg-[var(--surface)] hover:border-[var(--brand-muted)]",
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
              "flex-1 h-11 rounded-lg text-sm font-medium transition-all duration-150 border",
              tempAmpm === "PM"
                ? "bg-[var(--brand)] text-white border-transparent shadow-sm"
                : "bg-white text-[var(--ink)] border-[var(--border-subtle)] hover:bg-[var(--surface)] hover:border-[var(--brand-muted)]",
            )}
            aria-pressed={tempAmpm === "PM"}
          >
            {labels.pm}
          </button>
        </div>
      </div>

      {/* Clock Dial */}
      <div className="relative" style={{ width: "280px", height: "280px", margin: "0 auto" }}>
        <svg
          viewBox="-120 -120 240 240"
          className="w-full h-full"
          role="img"
          aria-label="Analog clock for time selection"
        >
          {/* Clock face */}
          <circle cx="0" cy="0" r="110" fill="none" stroke="var(--border-subtle)" strokeWidth="2" />

          {/* Center pivot */}
          <circle cx="0" cy="0" r="6" fill="var(--ink)" />

          {/* Hour/Minute marks and numbers */}
          {mode === "hour" ? (
            <>
              {/* Hour marks */}
              {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => {
                const pos = getHourPositions(h);
                const isSelected = tempHour === h;
                return (
                  <g key={h}>
                    {/* Tick mark */}
                    <line
                      x1={pos.x * 92}
                      y1={pos.y * 92}
                      x2={pos.x * 105}
                      y2={pos.y * 105}
                      stroke={isSelected ? "var(--brand)" : "var(--ink-muted)"}
                      strokeWidth={isSelected ? 3 : 2}
                    />
                    {/* Number with circular highlight when selected */}
                    <g>
                      {isSelected && (
                        <circle
                          cx={pos.x * 78}
                          cy={pos.y * 78}
                          r={20}
                          fill="var(--brand)"
                          opacity={0.15}
                        />
                      )}
                      <text
                        x={pos.x * 78}
                        y={pos.y * 78 + 6}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="16"
                        fontWeight={isSelected ? "bold" : "normal"}
                        fill={isSelected ? "var(--brand)" : "var(--ink)"}
                        className="select-none"
                      >
                        {h.toString().padStart(2, "0")}
                      </text>
                    </g>
                  </g>
                );
              })}
              {/* Hour hand */}
              {tempHour !== null && (
                <>
                  <line
                    x1={0}
                    y1={0}
                    x2={getHourPositions(tempHour).x * 55}
                    y2={getHourPositions(tempHour).y * 55}
                    stroke="var(--brand)"
                    strokeWidth={5}
                    strokeLinecap="round"
                  />
                  {/* Hand tail */}
                  <line
                    x1={0}
                    y1={0}
                    x2={getHourPositions(tempHour).x * -15}
                    y2={getHourPositions(tempHour).y * -15}
                    stroke="var(--brand)"
                    strokeWidth={5}
                    strokeLinecap="round"
                    opacity={0.4}
                  />
                </>
              )}
            </>
          ) : (
            <>
              {/* Minute marks (all 60, 5-min intervals highlighted) */}
              {Array.from({ length: 60 }, (_, i) => i).map((m) => {
                const pos = getMinutePositions(m);
                const isFiveMin = m % 5 === 0;
                const isSelected = tempMinute === m;
                return (
                  <g key={m}>
                    <line
                      x1={pos.x * (isFiveMin ? 90 : 100)}
                      y1={pos.y * (isFiveMin ? 90 : 100)}
                      x2={pos.x * 108}
                      y2={pos.y * 108}
                      stroke={isSelected ? "var(--brand)" : isFiveMin ? "var(--ink-muted)" : "var(--border-subtle)"}
                      strokeWidth={isSelected ? 2.5 : isFiveMin ? 1.5 : 0.8}
                    />
                    {isFiveMin && (
                      <g>
                        {isSelected && (
                          <circle
                            cx={pos.x * 78}
                            cy={pos.y * 78}
                            r={18}
                            fill="var(--brand)"
                            opacity={0.15}
                          />
                        )}
                        <text
                          x={pos.x * 78}
                          y={pos.y * 78 + 5}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="11"
                          fontWeight={isSelected ? "bold" : "normal"}
                          fill={isSelected ? "var(--brand)" : "var(--ink-muted)"}
                          className="select-none"
                        >
                          {m.toString().padStart(2, "0")}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
              {/* Minute hand */}
              {tempMinute !== null && (
                <>
                  <line
                    x1={0}
                    y1={0}
                    x2={getMinutePositions(tempMinute).x * 80}
                    y2={getMinutePositions(tempMinute).y * 80}
                    stroke="var(--brand)"
                    strokeWidth={3}
                    strokeLinecap="round"
                  />
                  {/* Hand tail */}
                  <line
                    x1={0}
                    y1={0}
                    x2={getMinutePositions(tempMinute).x * -20}
                    y2={getMinutePositions(tempMinute).y * -20}
                    stroke="var(--brand)"
                    strokeWidth={3}
                    strokeLinecap="round"
                    opacity={0.3}
                  />
                </>
              )}
            </>
          )}

          {/* Clickable areas - invisible circles over numbers */}
          {mode === "hour" ? (
            Array.from({ length: 12 }, (_, i) => i + 1).map((h) => {
              const pos = getHourPositions(h);
              return (
                <circle
                  key={h}
                  cx={pos.x * 78}
                  cy={pos.y * 78}
                  r={24}
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
                  cx={pos.x * 78}
                  cy={pos.y * 78}
                  r={20}
                  fill="transparent"
                  onClick={() => !disabled && selectMinute(m)}
                  style={{ cursor: disabled ? "not-allowed" : "pointer" }}
                />
              );
            })
          )}
        </svg>

        {/* Mode toggle buttons */}
        <div className="absolute bottom-[-36px] left-1/2 -translate-x-1/2 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("hour")}
            disabled={disabled}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150",
              mode === "hour"
                ? "bg-[var(--brand)] text-white shadow-sm"
                : "bg-white text-[var(--ink)] border-[var(--border-subtle)] hover:bg-[var(--surface)] hover:border-[var(--brand-muted)]",
            )}
          >
            {labels.hour}
          </button>
          <button
            type="button"
            onClick={() => setMode("minute")}
            disabled={disabled}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150",
              mode === "minute"
                ? "bg-[var(--brand)] text-white shadow-sm"
                : "bg-white text-[var(--ink)] border-[var(--border-subtle)] hover:bg-[var(--surface)] hover:border-[var(--brand-muted)]",
            )}
          >
            {labels.minute}
          </button>
        </div>
      </div>

      {/* Actions - Cancel and Save Time */}
      <div className="flex justify-end gap-2 pt-2">
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
          <div className="relative z-10 w-full max-w-sm rounded-xl bg-[var(--surface-card)] shadow-xl p-5 animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <h3 id="time-picker-title" className="font-semibold text-[var(--ink)]">
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