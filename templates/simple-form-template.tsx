/**
 * Portable SimpleForm Component
 *
 * Works with the validation-registry-template.ts getFormFields() output.
 * Drop into any Next.js + React project.
 *
 * Usage:
 *   import { SimpleForm } from "@/components/forms/simple-form";
 *   import { getFormFields } from "@/lib/validation-registry";
 *
 *   const fields = getFormFields("user");
 *
 *   // Uncontrolled (for server actions via FormData):
 *   <SimpleForm fields={fields} values={} uncontrolled />
 *
 *   // Controlled (for client-side state):
 *   const [values, setValues] = useState({});
 *   <SimpleForm fields={fields} values={values} onChange={setValues} />
 */

"use client";

import { useMemo } from "react";
import { cn } from "@/lib/cn"; // or use your own className utility

export interface FormFieldMeta {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  dependsOn?: string;
  disabledWhen?: { field: string; value: string }[];
  defaultValue?: FormValue;
  helpText?: string;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  inputMode?: string;
  format?: "money" | "date";
  synthetic?: boolean;
  /** Live keystroke filter: "letters" or "digits" */
  filter?: InputFilter;
  /** A static prefix rendered inside the input (e.g. "+91 " for a mobile number). */
  prefix?: string;
}

export type InputFilter = "letters" | "digits";

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

export type FieldType =
  | "text" | "email" | "password" | "tel" | "number"
  | "date" | "select" | "textarea" | "checkbox" | "hidden" | "url";

export type FormValue = string | number | boolean | undefined | null;

interface GenericInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  type?: string;
  className?: string;
}

function GenericInput({ className, type = "text", ...props }: GenericInputProps) {
  return (
    <input
      type={type}
      {...props}
      className={cn(
        "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-400",
        "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100",
        "disabled:bg-gray-50 disabled:cursor-not-allowed h-11",
        className,
      )}
    />
  );
}

interface PrefixInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  type?: string;
  className?: string;
  prefix?: string;
}

function PrefixInput({ type = "text", prefix, className, ...props }: PrefixInputProps) {
  if (!prefix) return <GenericInput type={type} className={className} {...props} />;
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 select-none pointer-events-none">
        {prefix}
      </span>
      <GenericInput type={type} className={cn("pl-12", className)} {...props} />
    </div>
  );
}

function GenericTextarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-400",
        "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100",
        "disabled:bg-gray-50 disabled:cursor-not-allowed",
        className,
      )}
    />
  );
}

function GenericSelect({ options, className, ...props }: { options: { value: string; label: string }[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900",
        "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100",
        "disabled:bg-gray-50 disabled:cursor-not-allowed h-11",
        className,
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function GenericCheckbox({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      {...props}
      className={cn("h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-200", className)}
    />
  );
}

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

function Field({ label, htmlFor, hint, error, children, className }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="text-xs text-gray-500">{hint}</p> : null}
      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
    </div>
  );
}

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
  const handleChange = useMemo(
    () =>
      uncontrolled
        ? undefined
        : (name: string, value: FormValue) => {
            onChange?.(name, value);
            onFieldChange?.(name, value);
          },
    [onChange, onFieldChange, uncontrolled],
  );

  const renderFields = () => (
    <>
      {fields.map((field) => {
        if (field.synthetic) return null;

        const isDisabled = disabled || field.disabledWhen?.some((d) => values[d.field] === d.value);
        const rawValue = values[field.name] ?? field.defaultValue ?? "";
        const value = String(rawValue);
        const isChecked = typeof rawValue === "boolean" ? rawValue : rawValue === "true";
        const error = errors[field.name];

        // Select
        if (field.type === "select" && field.options) {
          return (
            <Field key={field.name} label={field.label} htmlFor={field.name} error={error}>
              <GenericSelect
                id={field.name}
                name={field.name}
                value={uncontrolled ? undefined : value}
                defaultValue={uncontrolled ? value : undefined}
                onChange={handleChange ? (e) => handleChange(field.name, e.target.value) : undefined}
                disabled={isDisabled}
                required={field.required}
                options={field.options}
              />
            </Field>
          );
        }

        // Checkbox
        if (field.type === "checkbox") {
          return (
            <Field key={field.name} label={field.label} htmlFor={field.name} error={error}>
              <GenericCheckbox
                id={field.name}
                name={field.name}
                checked={uncontrolled ? undefined : isChecked}
                defaultChecked={uncontrolled ? isChecked : undefined}
                onChange={handleChange ? (e) => handleChange(field.name, e.target.checked) : undefined}
                disabled={isDisabled}
              />
            </Field>
          );
        }

        // Textarea
        if (field.type === "textarea") {
          return (
            <Field key={field.name} label={field.label} htmlFor={field.name} hint={field.helpText}>
              <GenericTextarea
                id={field.name}
                name={field.name}
                value={uncontrolled ? undefined : value}
                defaultValue={uncontrolled ? value : undefined}
                onChange={handleChange ? (e) => handleChange(field.name, e.target.value) : undefined}
                placeholder={field.placeholder}
                disabled={isDisabled}
                maxLength={field.maxLength}
                rows={3}
              />
            </Field>
          );
        }

        // Date
        if (field.type === "date") {
          return (
            <Field key={field.name} label={field.label} htmlFor={field.name} error={error}>
              <GenericInput
                id={field.name}
                name={field.name}
                type="date"
                value={uncontrolled ? undefined : value}
                defaultValue={uncontrolled ? value : undefined}
                onChange={handleChange ? (e) => handleChange(field.name, e.target.value) : undefined}
                disabled={isDisabled}
                required={field.required}
              />
            </Field>
          );
        }

        // Number (including money)
        if (field.type === "number" || field.format === "money") {
          const isMoney = field.format === "money";
          return (
            <Field key={field.name} label={field.label} htmlFor={field.name} error={error}>
              <GenericInput
                id={field.name}
                name={field.name}
                type="number"
                inputMode={isMoney ? "decimal" : undefined}
                step={isMoney ? "0.01" : "1"}
                min={isMoney ? "0" : field.min}
                max={field.max}
                className={cn("num", isMoney && "text-right")}
                value={uncontrolled ? undefined : value}
                defaultValue={uncontrolled ? value : undefined}
                onChange={handleChange ? (e) => handleChange(field.name, e.target.value) : undefined}
                disabled={isDisabled}
                required={field.required}
                placeholder={field.placeholder}
              />
            </Field>
          );
        }

        // Password
        if (field.type === "password") {
          return (
            <Field key={field.name} label={field.label} htmlFor={field.name} error={error}>
              <GenericInput
                id={field.name}
                name={field.name}
                type="password"
                autoComplete="new-password"
                value={uncontrolled ? undefined : value}
                defaultValue={uncontrolled ? value : undefined}
                onChange={handleChange ? (e) => handleChange(field.name, e.target.value) : undefined}
                disabled={isDisabled}
                required={field.required}
                minLength={field.min}
                maxLength={field.max}
                placeholder={field.placeholder}
              />
            </Field>
          );
        }

        // Email
        if (field.type === "email") {
          return (
            <Field key={field.name} label={field.label} htmlFor={field.name} error={error}>
              <GenericInput
                id={field.name}
                name={field.name}
                type="email"
                autoComplete="off"
                value={uncontrolled ? undefined : value}
                defaultValue={uncontrolled ? value : undefined}
                onChange={handleChange ? (e) => handleChange(field.name, e.target.value) : undefined}
                disabled={isDisabled}
                required={field.required}
                maxLength={field.maxLength}
                placeholder={field.placeholder}
              />
            </Field>
          );
        }

        // Tel
        if (field.type === "tel") {
          return (
            <Field key={field.name} label={field.label} htmlFor={field.name} hint={field.helpText}>
              <PrefixInput
                id={field.name}
                name={field.name}
                type="tel"
                inputMode="numeric"
                prefix={field.prefix}
                value={uncontrolled ? undefined : value}
                defaultValue={uncontrolled ? value : undefined}
                onChange={filterHandler(field.filter, (v) => {
                  if (uncontrolled) return;
                  handleChange?.(field.name, v);
                })}
                disabled={isDisabled}
                required={field.required}
                maxLength={field.maxLength}
                pattern={field.pattern}
                title={field.helpText}
                placeholder={field.placeholder}
              />
            </Field>
          );
        }

        // URL
        if (field.type === "url") {
          return (
            <Field key={field.name} label={field.label} htmlFor={field.name} error={error}>
              <GenericInput
                id={field.name}
                name={field.name}
                type="url"
                value={uncontrolled ? undefined : value}
                defaultValue={uncontrolled ? value : undefined}
                onChange={handleChange ? (e) => handleChange(field.name, e.target.value) : undefined}
                disabled={isDisabled}
                required={field.required}
                maxLength={field.maxLength}
                placeholder={field.placeholder}
              />
            </Field>
          );
        }

        // Hidden
        if (field.type === "hidden") {
          return (
            <input
              key={field.name}
              type="hidden"
              name={field.name}
              value={value}
              disabled={isDisabled}
            />
          );
        }

        // Default: text input
        return (
          <Field key={field.name} label={field.label} htmlFor={field.name} hint={field.helpText}>
            <GenericInput
              id={field.name}
              name={field.name}
              type="text"
              value={uncontrolled ? undefined : value}
              defaultValue={uncontrolled ? value : undefined}
              onChange={filterHandler(field.filter, (v) => {
                if (uncontrolled) return;
                handleChange?.(field.name, v);
              })}
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