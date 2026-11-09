"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, User, Plus, Trash2 } from "lucide-react";
import { Button, Card, CardBody, CardHeader, CardTitle, Field } from "@/components/ui";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/cn";
import type { FormFieldMeta, FormValue, InputFilter } from "@/lib/validation-registry";

/**
 * Strips characters the field does not accept, so the browser never lets an
 * invalid character into the form in the first place.
 */
export function filterInputValue(value: string, filter?: InputFilter): string {
  if (!filter) return value;
  if (filter === "digits") return value.replace(/[^\d]/g, "");
  // "letters" — keep letters, marks (accents), spaces and name punctuation
  return value.replace(/[^\p{L}\p{M}\s.\-'']/gu, "");
}

interface MemberOption { id: string; memberNo: string; fullName: string; phone: string | null; }
interface CategoryOption { id: string; name: string; code: string; restrictedPurpose: boolean; }
interface PeriodOption {
  id: string; memberId: string; planId: string; categoryId: string; categoryName: string;
  periodStart: string; periodEnd: string; dueDate: string;
  expectedPaise: number; allocatedPaise: number; outstandingPaise: number;
}

type Allocation = { key: string; duesPeriodId: string; categoryId: string; amount: string };

// ============================================
// REUSABLE COMPONENTS
// ============================================

export function MemberSearch({
  members, value, onChange, label, placeholder, disabled,
}: {
  members: MemberOption[];
  value: string;
  onChange: (memberId: string) => void;
  label: string;
  placeholder: string;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredMembers = members.filter((m) =>
    m.fullName.toLowerCase().includes(search.toLowerCase()) ||
    m.memberNo.toLowerCase().includes(search.toLowerCase()) ||
    (m.phone?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  const selectedMember = members.find((m) => m.id === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (inputRef.current && !inputRef.current.contains(event.target as Node) &&
          dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (member: MemberOption) => {
    onChange(member.id);
    setSearch(""); setShowDropdown(false);
    inputRef.current?.blur();
  };

  const displayValue = selectedMember
    ? `${selectedMember.memberNo} · ${selectedMember.fullName}${selectedMember.phone ? ` · ${selectedMember.phone}` : ""}`
    : "";

  return (
    <Field label={label} htmlFor="member-search">
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ink-muted)]" aria-hidden="true" />
          <input
            ref={inputRef} id="member-search" type="text"
            value={displayValue || search}
            onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); if (!e.target.value) onChange(""); }}
            onFocus={() => setShowDropdown(true)}
            placeholder={placeholder}
            disabled={disabled || !!value}
            className={cn(
              "w-full rounded-lg border border-[var(--border-subtle)] bg-white pl-10 pr-10 py-2.5 text-base text-[var(--ink)] placeholder:text-[#9aa69f] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)] disabled:bg-[var(--surface)] disabled:cursor-not-allowed h-11",
            )}
            autoComplete="off"
          />
          {value && (
            <button type="button" onClick={() => { onChange(""); setSearch(""); setShowDropdown(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] hover:text-[var(--danger)]" aria-label="Clear">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {showDropdown && (!value || search) && (
          <div className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-[var(--border-subtle)] bg-white shadow-lg">
            {filteredMembers.length === 0 ? (
              <div className="px-3 py-2 text-sm text-[var(--ink-muted)]">No matching members</div>
            ) : (
              filteredMembers.map((m) => (
                <button key={m.id} type="button" onClick={() => handleSelect(m)}
                  className={cn("w-full px-3 py-2 text-start text-sm hover:bg-[var(--brand-soft)]",
                    value === m.id ? "bg-[var(--brand-soft)] text-[var(--brand-deep)]" : "text-[var(--ink)]")}>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-[var(--ink-muted)]" />
                    <div>
                      <p className="font-medium">{m.fullName}</p>
                      <p className="text-[11px] text-[var(--ink-muted)]">{m.memberNo}{m.phone ? ` · ${m.phone}` : ""}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </Field>
  );
}

function GenericSelect({ options, ...props }: { options: { value: string; label: string }[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className="w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2.5 text-base text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)] h-11">
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function GenericInput({ type = "text", className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { type?: string }) {
  return <input type={type} {...props} className={cn("w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2.5 text-base text-[var(--ink)] placeholder:text-[#9aa69f] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)] h-11", className)} />;
}

function PrefixInput({ type = "text", prefix, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { type?: string; prefix?: string }) {
  if (!prefix) return <GenericInput type={type} className={className} {...props} />;
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] select-none pointer-events-none">{prefix}</span>
      <GenericInput
        type={type}
        className={cn("pl-[calc(3rem+var(--spacing,1.5rem))]", className)}
        {...props}
      />
    </div>
  );
}

function GenericTextarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn("w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2.5 text-base text-[var(--ink)] placeholder:text-[#9aa69f] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)]", className)} />;
}

function GenericCheckbox({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="checkbox" {...props} className={cn("h-4 w-4 rounded border-[var(--border-subtle)] text-[var(--brand)] focus:ring-[var(--brand-soft)]", className)} />;
}

/**
 * Filters keystrokes against a field's character filter.
 *
 * Controlled mode: the value is filtered before it reaches the state handler.
 * Uncontrolled mode: the DOM value is rewritten in place, since React does
 * not own it.
 */
function filterHandler(filter: InputFilter | undefined, onValue: (value: string) => void) {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const filtered = filterInputValue(el.value, filter);
    if (filtered !== el.value) {
      el.value = filtered;
      // Keep the caret at the end so typing continues naturally.
      const pos = filtered.length;
      el.setSelectionRange?.(pos, pos);
    }
    onValue(el.value);
  };
}

// ============================================
// AUTO-FORM RENDERER
// ============================================

interface AutoFormProps {
  fields: FormFieldMeta[];
  values: Record<string, FormValue>;
  onChange: (name: string, value: FormValue) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled?: boolean;
  allocations?: Allocation[];
  categories?: CategoryOption[];
  members?: MemberOption[];
  periods?: PeriodOption[];
  updateAllocation?: (key: string, patch: Partial<Allocation>) => void;
  removeAllocation?: (key: string) => void;
  addAllocationFor?: (period: PeriodOption) => void;
  addBlankAllocation?: () => void;
  labels?: Record<string, string>;
  /** Per-field error messages from server action */
  errors?: Record<string, string>;
}

export function AutoForm({
  fields, values, onChange, onSubmit, disabled,
  allocations, categories, members, periods,
  updateAllocation, removeAllocation, addAllocationFor, addBlankAllocation,
  labels = {},
  errors = {},
}: AutoFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {fields.map((field) => {
        const isDisabled = disabled || field.disabled || field.disabledWhen?.some(d => values[d.field] === d.value);
        const rawValue = values[field.name] ?? field.defaultValue ?? "";
        const value = String(rawValue);
        const error = errors?.[field.name];

        // Special handling for known complex fields
        if (field.name === "memberId" && members) {
          return (
            <MemberSearch
              key={field.name}
              members={members}
              value={value}
              onChange={(id) => onChange(field.name, id)}
              label={field.label}
              placeholder={field.placeholder || labels.searchMember || "Search member..."}
              disabled={isDisabled}
            />
          );
        }

        if (field.name === "walkInName") {
          return (
            <Field key={field.name} label={field.label} htmlFor={field.name} error={error}>
              <GenericInput
                id={field.name} name={field.name} type="text"
                value={value}
                onChange={(e) => onChange(field.name, e.target.value)}
                placeholder={field.placeholder || labels.anonymousDonor}
                disabled={isDisabled || !!values.memberId}
              />
            </Field>
          );
        }

        if (field.name === "allocations" && allocations && categories) {
          return (
            <Card key={field.name}>
              <CardHeader>
                <CardTitle>{labels?.purpose || "Purpose"}</CardTitle>
                <button type="button" onClick={addBlankAllocation} className="flex items-center gap-1 text-[11px] font-medium text-[var(--brand)] hover:underline">
                  <Plus className="h-3.5 w-3.5" /> {labels?.addAllocation || "Add allocation"}
                </button>
              </CardHeader>
              <CardBody className="space-y-3">
                {members && periods && values.memberId && (
                  <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] p-3">
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--ink-muted)]">{labels?.allocateToPeriod || "Allocate to period"}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {periods.filter(p => p.memberId === values.memberId && p.outstandingPaise > 0).slice(0, 12).map((p) => (
                        <button key={p.id} type="button" onClick={() => addAllocationFor!(p)}
                          className="rounded-md border border-[var(--border-subtle)] bg-white px-2 py-1 text-[11px] hover:border-[var(--brand)] hover:bg-[var(--brand-soft)]">
                          <span className="num">{formatDate(p.periodStart)}</span>
                          <span className="ms-1 text-[var(--ink-muted)]">· {formatPaise(p.outstandingPaise)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {allocations.length === 0 ? (
                  <p className="text-xs text-[var(--ink-muted)]">{labels?.chooseCategory || "Choose category"}</p>
                ) : (
                  <div className="space-y-2">
                    {allocations.map((a) => (
                      <div key={a.key} className="flex flex-wrap items-end gap-2 rounded-lg border border-[var(--border-subtle)] p-2">
                        <div className="min-w-40 flex-1">
                          <label className="mb-1 block text-[10px] uppercase tracking-wide text-[var(--ink-muted)]">{labels?.category || "Category"}</label>
                          <GenericSelect
                            value={a.categoryId}
                            onChange={(e) => updateAllocation!(a.key, { categoryId: e.target.value })}
                            options={categories.map(c => ({ value: c.id, label: `${c.name}${c.restrictedPurpose ? " *" : ""}` }))}
                          />
                        </div>
                        <div className="w-32">
                          <label className="mb-1 block text-[10px] uppercase tracking-wide text-[var(--ink-muted)]">{labels?.amount || "Amount"}</label>
                          <GenericInput
                            type="text" inputMode="decimal" className="num"
                            value={a.amount}
                            onChange={(e) => updateAllocation!(a.key, { amount: e.target.value })}
                            placeholder="0.00"
                          />
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeAllocation!(a.key)} aria-label={labels?.cancel || "Cancel"}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          );
        }

        if (field.type === "select" && field.options) {
          return (
            <Field key={field.name} label={field.label} htmlFor={field.name} error={error}>
              <GenericSelect
                id={field.name} name={field.name}
                value={value}
                onChange={(e) => onChange(field.name, e.target.value)}
                disabled={isDisabled}
                required={field.required}
                options={field.options}
              />
            </Field>
          );
        }

        if (field.type === "checkbox") {
          const isChecked = typeof value === "boolean" ? value : value === "true";
          return (
            <Field key={field.name} label={field.label} htmlFor={field.name} error={error}>
              <GenericCheckbox
                id={field.name} name={field.name}
                checked={isChecked}
                onChange={(e) => onChange(field.name, e.target.checked)}
                disabled={isDisabled}
              />
            </Field>
          );
        }

        if (field.type === "textarea") {
          return (
            <Field key={field.name} label={field.label} htmlFor={field.name} hint={field.helpText}>
              <GenericTextarea
                id={field.name} name={field.name}
                value={value}
                onChange={(e) => onChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                disabled={isDisabled}
                maxLength={field.maxLength}
                rows={3}
              />
            </Field>
          );
        }

        if (field.type === "date") {
          return (
            <Field key={field.name} label={field.label} htmlFor={field.name} error={error}>
              <GenericInput
                id={field.name} name={field.name} type="date"
                value={value}
                onChange={(e) => onChange(field.name, e.target.value)}
                disabled={isDisabled}
                required={field.required}
              />
            </Field>
          );
        }

        if (field.type === "number") {
          return (
            <Field key={field.name} label={field.label} htmlFor={field.name} error={error}>
              <GenericInput
                id={field.name} name={field.name} type="number" className="num"
                value={value}
                onChange={(e) => onChange(field.name, e.target.value)}
                disabled={isDisabled}
                required={field.required}
                min={field.min}
                max={field.max}
              />
            </Field>
          );
        }

        if (field.type === "password") {
          return (
            <Field key={field.name} label={field.label} htmlFor={field.name} error={error}>
              <GenericInput
                id={field.name} name={field.name} type="password" autoComplete="new-password"
                value={value}
                onChange={(e) => onChange(field.name, e.target.value)}
                disabled={isDisabled}
                required={field.required}
                minLength={field.min}
                maxLength={field.max}
              />
            </Field>
          );
        }

        if (field.type === "tel") {
          return (
            <Field key={field.name} label={field.label} htmlFor={field.name} hint={field.helpText}>
              <PrefixInput
                id={field.name} name={field.name} type="tel" inputMode="numeric"
                prefix={field.prefix}
                value={value}
                onChange={filterHandler(field.filter, (v) => onChange(field.name, v))}
                placeholder={field.placeholder}
                disabled={isDisabled}
                required={field.required}
                maxLength={field.maxLength}
                pattern={field.pattern}
                title={field.helpText}
              />
            </Field>
          );
        }

        // Default: text input
        return (
          <Field key={field.name} label={field.label} htmlFor={field.name} hint={field.helpText}>
            <GenericInput
              id={field.name} name={field.name} type="text"
              value={value}
              onChange={filterHandler(field.filter, (v) => onChange(field.name, v))}
              placeholder={field.placeholder}
              disabled={isDisabled}
              required={field.required}
              maxLength={field.maxLength}
              pattern={field.pattern}
              title={field.helpText}
            />
          </Field>
        );
      })}
    </form>
  );
}

// ============================================
// SIMPLE FORM FOR BASIC ENTITIES
// ============================================

interface SimpleFormProps {
  fields: FormFieldMeta[];
  values?: Record<string, FormValue>;
  onChange?: (name: string, value: FormValue) => void;
  disabled?: boolean;
  className?: string;
  /** When true, renders just the fields without a wrapping <form>. */
  fieldsOnly?: boolean;
  /** When true, renders uncontrolled inputs (for use with server actions via FormData). */
  uncontrolled?: boolean;
  /** Callback for fields that need to run after value changes (e.g., dependent fields). */
  onFieldChange?: (name: string, value: FormValue) => void;
  /** Per-field error messages from server action (e.g., { phone: "User Already Exist" }) */
  errors?: Record<string, string>;
}

export function SimpleForm({
  fields,
  values = {},
  onChange,
  disabled,
  className,
  fieldsOnly = false,
  uncontrolled = false,
  onFieldChange,
  errors = {},
}: SimpleFormProps) {
  const renderFields = () => (
    <>
      {fields.map((field) => {
        const isDisabled = disabled || field.disabled || field.disabledWhen?.some(d => values[d.field] === d.value);
        const rawValue = values[field.name] ?? field.defaultValue ?? "";
        const value = String(rawValue);
        const error = errors[field.name];

        if (field.type === "select" && field.options) {
          return (
            <Field key={field.name} label={field.label} htmlFor={field.name} error={error}>
              <GenericSelect
                id={field.name} name={field.name}
                {...(uncontrolled ? { defaultValue: value } : { value, onChange: (e) => { onChange?.(field.name, e.target.value); onFieldChange?.(field.name, e.target.value); } })}
                disabled={isDisabled}
                required={field.required}
                options={field.options}
              />
            </Field>
          );
        }

        if (field.type === "checkbox") {
          const isChecked = typeof value === "boolean" ? value : value === "true";
          return (
            <Field key={field.name} label={field.label} htmlFor={field.name} error={error}>
              <GenericCheckbox
                id={field.name} name={field.name}
                {...(uncontrolled ? { defaultChecked: isChecked } : { checked: isChecked, onChange: (e) => { onChange?.(field.name, e.target.checked); onFieldChange?.(field.name, e.target.checked); } })}
                disabled={isDisabled}
              />
            </Field>
          );
        }

        if (field.type === "textarea") {
          return (
            <Field key={field.name} label={field.label} htmlFor={field.name} hint={field.helpText}>
              <GenericTextarea
                id={field.name} name={field.name}
                {...(uncontrolled ? { defaultValue: value } : { value, onChange: (e) => { onChange?.(field.name, e.target.value); onFieldChange?.(field.name, e.target.value); } })}
                placeholder={field.placeholder}
                disabled={isDisabled}
                maxLength={field.maxLength}
                rows={3}
              />
            </Field>
          );
        }

        if (field.type === "date") {
          return (
            <Field key={field.name} label={field.label} htmlFor={field.name} hint={field.helpText} error={error}>
              <GenericInput
                id={field.name} name={field.name} type="date"
                {...(uncontrolled ? { defaultValue: value } : { value, onChange: (e) => { onChange?.(field.name, e.target.value); onFieldChange?.(field.name, e.target.value); } })}
                disabled={isDisabled}
                required={field.required}
              />
            </Field>
          );
        }

        if (field.type === "number") {
          return (
            <Field key={field.name} label={field.label} htmlFor={field.name} error={error}>
              <GenericInput
                id={field.name} name={field.name} type="number" className="num"
                {...(uncontrolled ? { defaultValue: value } : { value, onChange: (e) => { onChange?.(field.name, e.target.value); onFieldChange?.(field.name, e.target.value); } })}
                disabled={isDisabled}
                required={field.required}
                min={field.min}
                max={field.max}
              />
            </Field>
          );
        }

        if (field.type === "password") {
          return (
            <Field key={field.name} label={field.label} htmlFor={field.name} error={error}>
              <GenericInput
                id={field.name} name={field.name} type="password" autoComplete="new-password"
                {...(uncontrolled ? { defaultValue: value } : { value, onChange: (e) => { onChange?.(field.name, e.target.value); onFieldChange?.(field.name, e.target.value); } })}
                disabled={isDisabled}
                required={field.required}
                minLength={field.min}
                maxLength={field.max}
              />
            </Field>
          );
        }

        if (field.type === "decimal") {
          return (
            <Field key={field.name} label={field.label} htmlFor={field.name} error={error}>
              <GenericInput
                id={field.name} name={field.name} type="number" inputMode="decimal" step="0.01" min="0" className="num"
                {...(uncontrolled ? { defaultValue: value } : { value, onChange: (e) => { onChange?.(field.name, e.target.value); onFieldChange?.(field.name, e.target.value); } })}
                disabled={isDisabled}
                required={field.required}
              />
            </Field>
          );
        }

        if (field.type === "tel") {
          return (
            <Field key={field.name} label={field.label} htmlFor={field.name} hint={field.helpText}>
              <PrefixInput
                id={field.name} name={field.name} type="tel" inputMode="numeric"
                prefix={field.prefix}
                {...(uncontrolled ? { defaultValue: value } : { value, onChange: filterHandler(field.filter, (v) => {
                  if (uncontrolled) return;
                  onChange?.(field.name, v);
                  onFieldChange?.(field.name, v);
                }) })}
                disabled={isDisabled}
                required={field.required}
                maxLength={field.maxLength}
                pattern={field.pattern}
                title={field.helpText}
              />
            </Field>
          );
        }

        if (field.type === "email") {
          return (
            <Field key={field.name} label={field.label} htmlFor={field.name} error={error}>
              <GenericInput
                id={field.name} name={field.name} type="email" autoComplete="off"
                {...(uncontrolled ? { defaultValue: value } : { value, onChange: (e) => { onChange?.(field.name, e.target.value); onFieldChange?.(field.name, e.target.value); } })}
                disabled={isDisabled}
                required={field.required}
                maxLength={field.maxLength}
              />
            </Field>
          );
        }

        if (field.type === "hidden") {
          return (
            <input
              key={field.name}
              type="hidden"
              name={field.name}
              defaultValue={value}
              disabled={isDisabled}
            />
          );
        }

        if (field.synthetic) {
          return null;
        }

        return (
          <Field key={field.name} label={field.label} htmlFor={field.name} hint={field.helpText}>
            <GenericInput
              id={field.name} name={field.name} type="text"
              {...(uncontrolled ? { defaultValue: value } : { value, onChange: filterHandler(field.filter, (v) => {
                if (uncontrolled) return;
                onChange?.(field.name, v);
                onFieldChange?.(field.name, v);
              }) })}
              placeholder={field.placeholder}
              disabled={isDisabled}
              required={field.required}
              maxLength={field.maxLength}
              pattern={field.pattern}
              title={field.helpText}
            />
          </Field>
        );
      })}
    </>
  );

  if (fieldsOnly) {
    return <>{renderFields()}</>;
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); onChange?.("submit", true); }} className={cn("space-y-4", className)}>
      {renderFields()}
    </form>
  );
}