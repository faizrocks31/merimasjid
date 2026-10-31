"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, Users, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button, Card, EmptyState, PageHeader, Field } from "@/components/ui";
import { MemberStatusBadge } from "@/components/status-badges";
import { formatDate } from "@/lib/dates";
import { formatPaise } from "@/lib/money";

export type MemberOption = {
  id: string;
  memberNo: string;
  fullName: string;
  phone: string | null;
  fatherName: string | null;
  status: string;
  joinDate: string;
  outstanding: number;
};

export interface MembersPageClientProps {
  labels: {
    members: string;
    newMember: string;
    searchMember: string;
    status: string;
    viewAll: string;
    noResults: string;
    searchMembers: string;
    memberNo: string;
    name: string;
    phone: string;
    date: string;
    dues: string;
    active: string;
    inactive: string;
    show: string;
    perPage: string;
    back: string;
  };
  initialMembers: MemberOption[];
  total: number;
  canWrite: boolean;
  initialSearchQuery?: string;
  initialStatusFilter?: string;
  initialPage?: number;
  initialPageSize?: number;
  totalPages?: number;
  isSearching?: boolean;
}

// Simple type-ahead search input (filters client-side on all members)
function MemberSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (query: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ink-muted)]" aria-hidden="true" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(
          "w-full rounded-lg border border-[var(--border-subtle)] bg-white pl-10 pr-10 py-2.5 text-base text-[var(--ink)] placeholder:text-[#9aa69f] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)] h-11",
        )}
        autoComplete="off"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] hover:text-[var(--danger)]"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function MembersPageClient({
  labels,
  initialMembers,
  total,
  canWrite,
  initialSearchQuery = "",
  initialStatusFilter = "",
  initialPage = 1,
  initialPageSize = 10,
  totalPages = 1,
  isSearching = false
}: MembersPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Status filter change - navigate with filter
  const handleStatusChange = useCallback((status: string) => {
    setStatusFilter(status);
    const params = new URLSearchParams(searchParams.toString());
    if (status) {
      params.set("status", status);
    } else {
      params.delete("status");
    }
    params.delete("page");
    router.push(`/members?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // Page size change - navigate with new size
  const handlePageSizeChange = useCallback((size: string) => {
    const newSize = Number(size);
    setPageSize(newSize);
    const params = new URLSearchParams(searchParams.toString());
    params.set("size", String(newSize));
    params.delete("page");
    router.push(`/members?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // Page change - navigate to page
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`/members?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // Client-side filtering: search by name, memberNo, phone + status filter
  const filteredMembers = useMemo(() => {
    return initialMembers.filter((m) => {
      const matchesSearch = m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.memberNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesStatus = !statusFilter || m.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [initialMembers, searchQuery, statusFilter]);

  // Client-side pagination
  const paginatedMembers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredMembers.slice(start, start + pageSize);
  }, [filteredMembers, page, pageSize]);

  const totalFilteredPages = Math.max(1, Math.ceil(filteredMembers.length / pageSize));

  return (
    <>
      <PageHeader
        title={labels.members}
        description={`${total} ${labels.members.toLowerCase()}`}
        actions={
          canWrite ? (
            <Link href="/members/new">
              <Button size="sm">
                <Plus className="h-4 w-4" /> {labels.newMember}
              </Button>
            </Link>
          ) : null
        }
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-2 p-3">
          <div className="relative min-w-56 flex-1 w-64">
            <MemberSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={labels.searchMember}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            aria-label={labels.status}
            className="h-10 rounded-lg border border-[var(--border-subtle)] bg-white px-3 text-sm"
          >
            <option value="">{labels.status}: {labels.viewAll}</option>
            <option value="ACTIVE">{labels.active}</option>
            <option value="INACTIVE">{labels.inactive}</option>
          </select>
        </div>
      </Card>

      <Card>
        {paginatedMembers.length === 0 ? (
          <EmptyState
            title={labels.noResults}
            description={searchQuery ? labels.searchMembers : labels.newMember}
            action={
              canWrite && !searchQuery ? (
                <Link href="/members/new" className="mt-2">
                  <Button size="sm" variant="secondary"><Users className="h-4 w-4" /> {labels.newMember}</Button>
                </Link>
              ) : null
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">
                  <th className="px-4 py-2 text-start font-medium">{labels.memberNo}</th>
                  <th className="px-3 py-2 text-start font-medium">{labels.name}</th>
                  <th className="px-3 py-2 text-start font-medium">{labels.phone}</th>
                  <th className="hidden px-3 py-2 text-start font-medium sm:table-cell">{labels.date}</th>
                  <th className="px-3 py-2 text-end font-medium">{labels.dues}</th>
                  <th className="px-4 py-2 text-end font-medium">{labels.status}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMembers.map((m) => (
                  <tr key={m.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface)]">
                    <td className="num px-4 py-2.5 text-[var(--ink-muted)]">{m.memberNo}</td>
                    <td className="px-3 py-2.5">
                      <Link href={`/members/${m.id}`} className="font-medium text-[var(--ink)] hover:text-[var(--brand)] hover:underline">
                        {m.fullName}
                      </Link>
                      {m.fatherName ? <p className="text-[11px] text-[var(--ink-muted)]">s/o {m.fatherName}</p> : null}
                    </td>
                    <td className="num px-3 py-2.5 text-[var(--ink-muted)]">{m.phone ?? "—"}</td>
                    <td className="num hidden px-3 py-2.5 text-[var(--ink-muted)] sm:table-cell">{formatDate(m.joinDate)}</td>
                    <td className="num px-3 py-2.5 text-end">
                      {m.outstanding > 0 ? (
                        <span className="font-medium text-[var(--warning)]">{formatPaise(m.outstanding)}</span>
                      ) : (
                        <span className="text-[var(--ink-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-end"><MemberStatusBadge status={m.status as "ACTIVE" | "INACTIVE" | "SUSPENDED"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {totalFilteredPages > 1 ? (
        <nav className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--ink-muted)]" aria-label="Pagination">
          <span>{page} / {totalFilteredPages}</span>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <label htmlFor="members-per-page" className="text-sm">{labels.show}:</label>
              <select
                id="members-per-page"
                value={String(pageSize)}
                onChange={(e) => handlePageSizeChange(e.target.value)}
                className="h-8 rounded-md border border-[var(--border-subtle)] bg-white px-2 text-sm text-[var(--ink)]"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="500">500</option>
              </select>
              <span>{labels.perPage}</span>
            </div>
            {page > 1 ? (
              <Button variant="secondary" size="sm" onClick={() => handlePageChange(page - 1)}>
                <Plus className="h-4 w-4 rotate-180" /> {labels.back}
              </Button>
            ) : null}
            {page < totalFilteredPages ? (
              <Button variant="secondary" size="sm" onClick={() => handlePageChange(page + 1)}>
                {labels.viewAll} <Plus className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </nav>
      ) : null}
    </>
  );
}