"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import { Search, Filter, Download, Calendar, Database, Users, Clock, Eye, ChevronDown, ChevronUp } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Select,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Badge,
  Button,
  Input,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatPaise } from "@/lib/money";
import { COLLECTION_FREQUENCY } from "@/lib/constants";

type CollectionDefinition = {
  id: string;
  name: string;
  description?: string | null;
  frequency: string | null;
  amountType: string | null;
  defaultAmountPaise: number | null;
  donorEligibility: string | null;
  memberAssignment: string | null;
  dueGeneration: string | null;
  settlementPolicy: string | null;
  baseCategory?: { name: string; code: string } | null;
  subcategory?: { name: string; code: string } | null;
};

interface DueStatusOverviewClientProps {
  labels: Record<string, string>;
  masjidId: string;
  collectionDefinitions: CollectionDefinition[];
  availableYears: number[];
}

interface PeriodSummary {
  periodKey: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  frequency: string;
  collectionEventId: string | null;
  collectionEventName: string | null;
  eventDate: string | null;
  generatedMemberCount: number;
  totalExpectedAmountPaise: number;
  totalPaidAmountPaise: number;
  totalOutstandingPaise: number;
}

interface PeriodMemberDetail {
  memberId: string;
  memberName: string;
  memberNo: string;
  memberStatus: string;
  periodId: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  expectedAmountPaise: number;
  paidAmountPaise: number;
  outstandingAmountPaise: number;
  status: "PAID" | "PENDING" | "PARTIAL";
  periodLabel: string;
}

export function DueStatusOverviewClient({
  labels,
  masjidId,
  collectionDefinitions,
  availableYears,
}: DueStatusOverviewClientProps) {
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedFrequency, setSelectedFrequency] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [memberStatusFilter, setMemberStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [periods, setPeriods] = useState<PeriodSummary[]>([]);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string | null>(null);
  const [periodMembers, setPeriodMembers] = useState<PeriodMemberDetail[]>([]);
  const [showPeriodDetail, setShowPeriodDetail] = useState(false);
  const [, startTransition] = useTransition();

  const selectedCollection = collectionDefinitions.find((c) => c.id === selectedCollectionId);

  const frequencyLabels: Record<string, string> = {
    WEEKLY: labels.weekly ?? "Weekly",
    MONTHLY: labels.monthly ?? "Monthly",
    QUARTERLY: labels.quarterly ?? "Quarterly",
    SEMI_ANNUAL: labels.semiAnnual ?? "Semi-Annual",
    ANNUAL: labels.annual ?? "Annual",
    EVENT_BASED: labels.eventBased ?? "Event-Based",
    ONE_TIME: labels.oneTime ?? "One-Time",
  };

  const amountTypeLabels: Record<string, string> = {
    FIXED: labels.fixedAmount ?? "Fixed Amount",
    VARIABLE: labels.variableAmount ?? "Variable Amount",
  };

  const donorEligibilityLabels: Record<string, string> = {
    MEMBERS_ONLY: labels.membersOnly ?? "Members Only",
    WALKIN_ONLY: labels.walkinOnly ?? "Walk-in Only",
    BOTH: labels.both ?? "Both Members & Walk-ins",
  };

  const memberAssignmentLabels: Record<string, string> = {
    ALL_ELIGIBLE: labels.allEligible ?? "All Eligible Members",
    SELECTED: labels.selectedMembers ?? "Selected Members",
  };

  const dueGenerationLabels: Record<string, string> = {
    ADMIN: labels.adminGenerated ?? "Admin Generated",
    AUTOMATIC: labels.automaticGenerated ?? "Automatic",
  };

  const settlementPolicyLabels: Record<string, string> = {
    OLDEST_FIRST: labels.oldestFirst ?? "Oldest First (FIFO)",
    ANY_PENDING_PERIOD: labels.anyPendingPeriod ?? "Any Pending Period",
  };

  const fetchPeriods = async () => {
    if (!selectedCollectionId || !selectedYear) return;

    startTransition(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/collections/due-status/periods?collectionId=${selectedCollectionId}&year=${selectedYear}` +
          (selectedFrequency ? `&frequency=${selectedFrequency}` : "") +
          (searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : "") +
          (memberStatusFilter ? `&memberStatus=${memberStatusFilter}` : "")
        );
        if (response.ok) {
          const data = await response.json();
          setPeriods(data.periods || []);
        }
      } catch (err) {
        console.error("Failed to fetch period summaries:", err);
      } finally {
        setIsLoading(false);
      }
    });
  };

  // Fetch periods when filters change
  const fetchPeriodsKey = `${selectedCollectionId}-${selectedYear}-${selectedFrequency}-${searchTerm}-${memberStatusFilter}`;
  const [lastFetchPeriodsKey, setLastFetchPeriodsKey] = useState("");

  useEffect(() => {
    if (fetchPeriodsKey !== lastFetchPeriodsKey && selectedCollectionId && selectedYear) {
      setLastFetchPeriodsKey(fetchPeriodsKey);
      fetchPeriods();
    }
  }, [fetchPeriodsKey, lastFetchPeriodsKey, selectedCollectionId, selectedYear, selectedFrequency, searchTerm, memberStatusFilter]);

  // Fetch period members when a period is selected
  const fetchPeriodMembers = async (periodKey: string) => {
    if (!selectedCollectionId || !selectedYear) return;

    setSelectedPeriodKey(periodKey);
    startTransition(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/collections/due-status/periods/${periodKey}/members?collectionId=${selectedCollectionId}&year=${selectedYear}`
        );
        if (response.ok) {
          const data = await response.json();
          setPeriodMembers(data.members || []);
          setShowPeriodDetail(true);
        }
      } catch (err) {
        console.error("Failed to fetch period members:", err);
      } finally {
        setIsLoading(false);
      }
    });
  };

  const closePeriodDetail = () => {
    setShowPeriodDetail(false);
    setSelectedPeriodKey(null);
    setPeriodMembers([]);
  };

  const handlePeriodClick = (periodKey: string) => {
    fetchPeriodMembers(periodKey);
  };

  const getFrequencyLabel = (frequency: string) => {
    const freqMap: Record<string, string> = {
      WEEKLY: labels.weekly ?? "Weekly",
      MONTHLY: labels.monthly ?? "Monthly",
      QUARTERLY: labels.quarterly ?? "Quarterly",
      SEMI_ANNUAL: labels.semiAnnual ?? "Semi-Annual",
      ANNUAL: labels.annual ?? "Annual",
      EVENT_BASED: labels.eventBased ?? "Event-Based",
      ONE_TIME: labels.oneTime ?? "One-Time",
    };
    return freqMap[frequency] || frequency;
  };

  const getFrequencyBadge = (frequency: string) => {
    const freqMap: Record<string, { label: string; className: string }> = {
      WEEKLY: { label: labels.weekly ?? "Weekly", className: "bg-purple-100 text-purple-800" },
      MONTHLY: { label: labels.monthly ?? "Monthly", className: "bg-blue-100 text-blue-800" },
      QUARTERLY: { label: labels.quarterly ?? "Quarterly", className: "bg-indigo-100 text-indigo-800" },
      SEMI_ANNUAL: { label: labels.semiAnnual ?? "Semi-Annual", className: "bg-pink-100 text-pink-800" },
      ANNUAL: { label: labels.annual ?? "Annual", className: "bg-red-100 text-red-800" },
      EVENT_BASED: { label: labels.eventBased ?? "Event-Based", className: "bg-orange-100 text-orange-800" },
      ONE_TIME: { label: labels.oneTime ?? "One-Time", className: "bg-teal-100 text-teal-800" },
    };
    const s = freqMap[frequency] || { label: frequency, className: "bg-gray-100 text-gray-600" };
    return <Badge className={cn("text-xs", s.className)}>{s.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      PAID: { label: labels.paid, className: "bg-green-100 text-green-800" },
      PENDING: { label: labels.pending, className: "bg-yellow-100 text-yellow-800" },
      PARTIAL: { label: labels.partial, className: "bg-blue-100 text-blue-800" },
      NOT_GENERATED: { label: labels.notGenerated, className: "bg-gray-100 text-gray-600" },
    };
    const s = statusMap[status] || { label: status, className: "bg-gray-100 text-gray-600" };
    return <Badge className={cn("text-xs", s.className)}>{s.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <Card className="rounded-[var(--radius-card)] border-[var(--border-tile)] bg-[var(--surface-card)]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-[var(--brand-primary)]" />
            {labels.dueStatusOverview}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="flex flex-wrap gap-4">
            {/* Collection Definition Select */}
            <div className="flex-1 min-w-[250px]">
              <label className="block text-sm font-medium text-[var(--ink-primary)] mb-1">
                {labels.selectCollection}
              </label>
              <Select value={selectedCollectionId} onValueChange={setSelectedCollectionId} placeholder={labels.selectCollection}>
                <Select.Trigger className="w-full" placeholder={labels.selectCollection} />
                <Select.Content>
                  {collectionDefinitions.map((c) => (
                    <Select.Item key={c.id} value={c.id}>
                      {c.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>

            {/* Year Select */}
            <div className="min-w-[150px]">
              <label className="block text-sm font-medium text-[var(--ink-primary)] mb-1">
                {labels.selectYear}
              </label>
              <Select value={selectedYear} onValueChange={setSelectedYear} placeholder={labels.selectYear}>
                <Select.Trigger className="w-full" placeholder={labels.selectYear} />
                <Select.Content>
                  {availableYears.map((y) => (
                    <Select.Item key={y.toString()} value={y.toString()}>
                      {y}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>

            {/* Frequency Select */}
            <div className="min-w-[180px]">
              <label className="block text-sm font-medium text-[var(--ink-primary)] mb-1">
                {labels.selectFrequency}
              </label>
              <Select value={selectedFrequency} onValueChange={setSelectedFrequency} placeholder={labels.selectFrequency}>
                <Select.Trigger className="w-full" placeholder={labels.selectFrequency} />
                <Select.Content>
                  <Select.Item value="">{labels.allStatus}</Select.Item>
                  {[
                    COLLECTION_FREQUENCY.WEEKLY,
                    COLLECTION_FREQUENCY.MONTHLY,
                    COLLECTION_FREQUENCY.QUARTERLY,
                    COLLECTION_FREQUENCY.SEMI_ANNUAL,
                    COLLECTION_FREQUENCY.ANNUAL,
                    COLLECTION_FREQUENCY.EVENT_BASED,
                    COLLECTION_FREQUENCY.ONE_TIME,
                  ].map((f) => (
                    <Select.Item key={f} value={f}>
                      {frequencyLabels[f] || f}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>

            {/* Member Search */}
            <div className="flex-1 min-w-[200px] max-w-[300px]">
              <label className="block text-sm font-medium text-[var(--ink-primary)] mb-1">
                {labels.memberSearch}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ink-muted-new)]" />
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={labels.memberSearch}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Member Status Filter */}
            <div className="min-w-[180px]">
              <label className="block text-sm font-medium text-[var(--ink-primary)] mb-1">
                {labels.memberStatus}
              </label>
              <Select value={memberStatusFilter} onValueChange={setMemberStatusFilter} placeholder={labels.allStatus}>
                <Select.Trigger className="w-full" placeholder={labels.allStatus} />
                <Select.Content>
                  <Select.Item value="">{labels.allStatus}</Select.Item>
                  <Select.Item value="PAID">{labels.paid}</Select.Item>
                  <Select.Item value="PENDING">{labels.pending}</Select.Item>
                  <Select.Item value="PARTIAL">{labels.partial}</Select.Item>
                </Select.Content>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Collection Info Card */}
      {selectedCollection && (
        <Card className="rounded-[var(--radius-card)] border-[var(--border-tile)] bg-[var(--surface-card)]">
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 text-sm">
              <div>
                <p className="text-[var(--ink-muted-new)]">{labels.name}</p>
                <p className="font-medium text-[var(--ink-primary)]">{selectedCollection.name}</p>
              </div>
              <div>
                <p className="text-[var(--ink-muted-new)]">{labels.baseCategory}</p>
                <p className="font-medium text-[var(--ink-primary)]">
                  {selectedCollection.baseCategory?.name || "-"}
                </p>
              </div>
              <div>
                <p className="text-[var(--ink-muted-new)]">{labels.subcategory}</p>
                <p className="font-medium text-[var(--ink-primary)]">
                  {selectedCollection.subcategory?.name || "-"}
                </p>
              </div>
              <div>
                <p className="text-[var(--ink-muted-new)]">{labels.frequency}</p>
                <p className="font-medium text-[var(--ink-primary)]">
                  <Badge className="text-xs">{selectedCollection.frequency || "-"}</Badge>
                </p>
              </div>
              <div>
                <p className="text-[var(--ink-muted-new)]">{labels.defaultAmount}</p>
                <p className="font-medium text-[var(--ink-primary)]">
                  {selectedCollection.defaultAmountPaise
                    ? formatPaise(selectedCollection.defaultAmountPaise)
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-[var(--ink-muted-new)]">{labels.memberAssignment}</p>
                <p className="font-medium text-[var(--ink-primary)]">
                  {memberAssignmentLabels[selectedCollection.memberAssignment || ""] || selectedCollection.memberAssignment || "-"}
                </p>
              </div>
              <div>
                <p className="text-[var(--ink-muted-new)]">{labels.dueGeneration}</p>
                <p className="font-medium text-[var(--ink-primary)]">
                  {dueGenerationLabels[selectedCollection.dueGeneration || ""] || selectedCollection.dueGeneration || "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Period Summary Table */}
      {selectedCollection && periods.length > 0 && (
        <Card className="rounded-[var(--radius-card)] border-[var(--border-tile)] bg-[var(--surface-card)]">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle>
                {labels.dueStatus} - {selectedCollection.name} ({labels.year}: {selectedYear})
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={isLoading || periods.length === 0}>
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
                <Button variant="outline" size="sm" onClick={fetchPeriods} disabled={isLoading}>
                  <Database className="h-4 w-4 mr-1" />
                  {isLoading ? labels.loadingStatus : "Refresh"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {periods.length === 0 && !isLoading ? (
              <div className="py-12 text-center text-sm text-[var(--ink-muted-new)]">
                {labels.noDataAvailable}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[var(--surface-field)]">
                      <TableHead className="w-48">{labels.period}</TableHead>
                      <TableHead className="w-32 text-center">{labels.frequency}</TableHead>
                      <TableHead className="w-28 text-center">{labels.generatedMembers}</TableHead>
                      <TableHead className="w-36 text-right">{labels.totalExpected}</TableHead>
                      <TableHead className="w-36 text-right">{labels.totalPaid}</TableHead>
                      <TableHead className="w-36 text-right">{labels.totalOutstanding}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          {labels.loadingStatus}
                        </TableCell>
                      </TableRow>
                    ) : (
                      periods.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            {labels.noDataAvailable}
                          </TableCell>
                        </TableRow>
                      ) : (
                        periods.map((period) => (
                          <TableRow key={period.periodKey} className="hover:bg-[var(--surface-field)] cursor-pointer" onClick={() => handlePeriodClick(period.periodKey)}>
                            <TableCell className="font-medium">
                              <div>
                                <p className="text-sm text-[var(--ink-primary)]">{period.periodLabel}</p>
                                <p className="text-xs text-[var(--ink-muted-new)]">{period.frequency}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className="text-xs">{period.frequency}</Badge>
                            </TableCell>
                            <TableCell className="text-center font-bold text-lg text-[var(--brand-primary)] cursor-pointer hover:underline"
                              onClick={(e) => { e.stopPropagation(); handlePeriodClick(period.periodKey); }}>
                              {period.generatedMemberCount}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatPaise(period.totalExpectedAmountPaise)}
                            </TableCell>
                            <TableCell className="text-right text-green-600">
                              {formatPaise(period.totalPaidAmountPaise)}
                            </TableCell>
                            <TableCell className="text-right text-red-600 font-medium">
                              {formatPaise(period.totalOutstandingPaise)}
                            </TableCell>
                          </TableRow>
                        ))
                      )
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Member Detail Modal/Slide-over */}
      {showPeriodDetail && selectedPeriodKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-4xl max-h-[90vh] bg-[var(--surface-card)] rounded-[var(--radius-card)] shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-tile)]">
              <div>
                <p className="text-sm text-[var(--ink-muted-new)]">Period / Event</p>
                <p className="font-medium text-[var(--ink-primary)]">
                  {periods.find(p => p.periodKey === selectedPeriodKey)?.periodLabel || selectedPeriodKey}
                </p>
                <p className="text-xs text-[var(--ink-muted-new)]">
                  {periods.find(p => p.periodKey === selectedPeriodKey)?.frequency || ""}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={closePeriodDetail}>
                <ChevronDown className="h-5 w-5" />
              </Button>
            </div>
            <div className="overflow-auto flex-1 p-4">
              {isLoading ? (
                <div className="text-center py-8 text-[var(--ink-muted-new)]">
                  {labels.loadingStatus}
                </div>
              ) : periodMembers.length === 0 ? (
                <div className="py-12 text-center text-sm text-[var(--ink-muted-new)]">
                  {labels.noDataAvailable}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[var(--surface-field)]">
                        <TableHead className="w-40">{labels.memberName}</TableHead>
                        <TableHead className="w-24 text-center">{labels.memberNo}</TableHead>
                        <TableHead className="w-32">{labels.collectionDefinition}</TableHead>
                        <TableHead className="w-36">{labels.periodEvent}</TableHead>
                        <TableHead className="w-28 text-right">{labels.expectedAmount}</TableHead>
                        <TableHead className="w-28 text-right">{labels.paidAmount}</TableHead>
                        <TableHead className="w-28 text-right">{labels.outstandingAmount}</TableHead>
                        <TableHead className="w-24 text-center">{labels.status}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {periodMembers.map((member) => (
                        <TableRow key={`${member.memberId}-${member.periodId}`} className="hover:bg-[var(--surface-field)]">
                          <TableCell>
                            <div>
                              <p className="text-sm text-[var(--ink-primary)] font-medium">{member.memberName}</p>
                              <p className="text-xs text-[var(--ink-muted-new)]">{member.memberNo}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-sm text-[var(--ink-muted-new)]">
                            {member.memberNo}
                          </TableCell>
                          <TableCell className="text-sm text-[var(--ink-primary)]">
                            {member.periodLabel || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-[var(--ink-muted-new)]">
                            {member.periodLabel}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatPaise(member.expectedAmountPaise)}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            {formatPaise(member.paidAmountPaise)}
                          </TableCell>
                          <TableCell className="text-right text-red-600 font-medium">
                            {formatPaise(member.outstandingAmountPaise)}
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(member.status)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-[var(--border-tile)] flex justify-end">
              <Button variant="outline" onClick={closePeriodDetail}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}