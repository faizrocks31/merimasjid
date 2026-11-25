"use client";

import type { ReactNode } from "react";
import { useState, useMemo, useContext, createContext } from "react";
import { cn } from "@/lib/cn";

// ============================================
// TABS
// ============================================

interface TabsProps {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
}

export function Tabs({ defaultValue, value, onValueChange, children, className }: TabsProps) {
  const [activeValue, setActiveValue] = useState(value ?? defaultValue);

  const contextValue = useMemo(
    () => ({
      value: activeValue,
      onValueChange: (v: string) => {
        setActiveValue(v);
        onValueChange?.(v);
      },
    }),
    [activeValue, onValueChange]
  );

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={cn(className)}>{children}</div>
    </TabsContext.Provider>
  );
}

const TabsContext = createContext<{
  value: string;
  onValueChange: (value: string) => void;
} | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) throw new Error("Tabs components must be used within Tabs");
  return context;
}

interface TabsListProps {
  children: ReactNode;
  className?: string;
}

export function TabsList({ children, className }: TabsListProps) {
  return <div className={cn("flex items-center gap-1", className)}>{children}</div>;
}

interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  title?: string;
}

export function TabsTrigger({ value, children, className, disabled, title }: TabsTriggerProps) {
  const { value: activeValue, onValueChange } = useTabsContext();
  const isActive = activeValue === value;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onValueChange(value)}
      title={title}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)] disabled:opacity-50 disabled:cursor-not-allowed",
        isActive
          ? "bg-[var(--brand-soft)] text-[var(--brand-deep)]"
          : "text-[var(--ink-muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]",
        className,
      )}
    >
      {children}
    </button>
  );
}

interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  const { value: activeValue } = useTabsContext();
  if (activeValue !== value) return null;
  return <div className={cn("animate-fade-in", className)}>{children}</div>;
}

export { type TabsProps, type TabsListProps, type TabsTriggerProps, type TabsContentProps };