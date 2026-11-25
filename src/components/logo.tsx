import { cn } from "@/lib/cn";

/** A restrained mosque-arch mark used in the header and receipt. */
export function Logo({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const dims = { sm: 28, md: 36, lg: 56 }[size];
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-xl bg-[var(--brand)] text-[var(--gold-soft)] shadow-sm",
        className,
      )}
      style={{ width: dims, height: dims }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 32 32" width={dims * 0.62} height={dims * 0.62} fill="none">
        <path
          d="M16 4c-4.2 0-7.6 3.2-7.6 7.2 0 2 .9 3.8 2.3 5.1V26h10.6V16.3c1.4-1.3 2.3-3.1 2.3-5.1C23.6 7.2 20.2 4 16 4Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M16 8.2v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M12.4 26v-4.6a3.6 3.6 0 0 1 7.2 0V26" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="16" cy="12.6" r="0.9" fill="currentColor" />
      </svg>
    </span>
  );
}
