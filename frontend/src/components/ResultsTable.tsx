import { useMemo, useState, useEffect } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export interface AnalysisResult {
  id: number;
  start_time: string;
  end_time: string;
  position: string;
  pos_confidence: number;
  finding: string;
  finding_confidence: number;
}

interface ResultsTableProps {
  results: AnalysisResult[];
  onRowClick?: (result: AnalysisResult) => void;
  currentVideoTime?: number;
}

type SortConfig = {
  key: keyof AnalysisResult;
  direction: "ascending" | "descending";
} | null;

const ResultsTable = ({
  results,
  onRowClick,
  currentVideoTime = 0,
}: ResultsTableProps) => {
  const [filterText, setFilterText] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [activeResultId, setActiveResultId] = useState<number | null>(null);
  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  const timeToSeconds = (timeStr: string): number => {
    const parts = timeStr.split(":").map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  };

  useEffect(() => {
    const activeResult = results.find((result) => {
      const startTime = timeToSeconds(result.start_time);
      const endTime = timeToSeconds(result.end_time);
      return currentVideoTime >= startTime && currentVideoTime <= endTime;
    });
    setActiveResultId(activeResult?.id || null);
  }, [currentVideoTime, results]);

  const handleSort = (key: keyof AnalysisResult) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        if (current.direction === "ascending") {
          return { key, direction: "descending" };
        }
        return null;
      }
      return { key, direction: "ascending" };
    });
  };

  const filteredResults = useMemo(() => {
    if (!filterText) return results;

    const searchLower = filterText.toLowerCase();

    return results.filter(
      (result) =>
        result.position.toLowerCase().includes(searchLower) ||
        result.finding.toLowerCase().includes(searchLower)
    );
  }, [results, filterText]);

  const sortedResults = useMemo(() => {
    if (!sortConfig) return filteredResults;

    return [...filteredResults].sort((a, b) => {
      const aValue = a[sortConfig.key];

      const bValue = b[sortConfig.key];

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortConfig.direction === "ascending"
          ? aValue - bValue
          : bValue - aValue;
      }
      const aString = String(aValue);

      const bString = String(bValue);

      return sortConfig.direction === "ascending"
        ? aString.localeCompare(bString)
        : bString.localeCompare(aString);
    });
  }, [filteredResults, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedResults.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [filterText, sortConfig, results]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const displayedResults = sortedResults.slice(startIndex, endIndex);

  const getSortIcon = (key: keyof AnalysisResult) => {
    if (sortConfig?.key !== key) {
      return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    }
    return sortConfig.direction === "ascending" ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    );
  };

  if (results.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-foreground">
          Analysis Results
        </h2>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by position or finding..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {sortedResults.length}{" "}
          {sortedResults.length === 1 ? "result" : "results"}
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {[
                  { key: "id" as const, label: "ID" },
                  { key: "start_time" as const, label: "Start Time" },
                  { key: "end_time" as const, label: "End Time" },
                  { key: "position" as const, label: "Position" },
                  { key: "pos_confidence" as const, label: "Pos_Confidence" },
                  { key: "finding" as const, label: "Finding" },
                  {
                    key: "finding_confidence" as const,
                    label: "Finding_Confidence",
                  },
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className={cn(
                      "px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider",
                      "cursor-pointer select-none hover:bg-muted transition-colors"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {label}
                      {getSortIcon(key)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displayedResults.map((result, index) => (
                <tr
                  key={`${result.id}-${index}`}
                  onClick={() => onRowClick?.(result)}
                  className={cn(
                    "hover:bg-accent/50 transition-all cursor-pointer",
                    activeResultId === result.id &&
                      "bg-primary/10 border-l-4 border-primary"
                  )}
                >
                  <td className="px-6 py-4 text-sm font-medium text-foreground">
                    {result.id}
                  </td>

                  <td className="px-6 py-4 text-sm text-foreground font-mono">
                    {result.start_time}
                  </td>

                  <td className="px-6 py-4 text-sm text-foreground font-mono">
                    {result.end_time}
                  </td>

                  <td className="px-6 py-4 text-sm text-foreground">
                    <span className="px-2 py-1 bg-accent rounded-md">
                      {result.position}
                    </span>
                  </td>

                  <td
                    className={`px-6 py-4 text-sm font-mono
                        ${
                          result.pos_confidence < 50
                            ? "text-red-500"
                            : result.pos_confidence < 70
                            ? "text-yellow-500"
                            : "text-green-500"
                        }`}
                  >
                    {result.pos_confidence.toFixed(2)}
                  </td>

                  <td className="px-6 py-4 text-sm text-foreground">
                    <span className="px-2 py-1 bg-accent rounded-md">
                      {result.finding}
                    </span>
                  </td>

                  <td
                    className={`px-6 py-4 text-sm font-mono
                        ${
                          result.finding_confidence < 50
                            ? "text-red-500"
                            : result.finding_confidence < 70
                            ? "text-yellow-500"
                            : "text-green-500"
                        }`}
                  >
                    {result.finding_confidence.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border bg-muted/5 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {sortedResults.length === 0 ? 0 : startIndex + 1} -{" "}
            {Math.min(results.length, endIndex)} of {results.length}
          </div>

          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 rounded-md bg-card border border-border text-sm disabled:opacity-50"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Prev
            </button>

            <div className="text-sm">
              Page {currentPage} / {totalPages}
            </div>

            <button
              className="px-3 py-1 rounded-md bg-card border border-border text-sm disabled:opacity-50"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsTable;
