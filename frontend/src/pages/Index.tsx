import { useMemo, useRef } from "react";
import { toast } from "sonner";
import Sidebar from "@/components/Sidebar";
import UploadArea from "@/components/UploadArea";
import ResultsTable, { AnalysisResult } from "@/components/ResultsTable";
import VideoPlayer from "@/components/VideoPlayer";
import { AlertCircle, Square, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/contexts/AppContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
let resultIdCounter = 0;

interface ErrorData {
  error: string;
  type: string;
}

interface StreamData {
  error?: string;
  type?: string;
  status?: string;
}

const isErrorData = (data: unknown): data is ErrorData => {
  return (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as ErrorData).error === "string"
  );
};

const processStreamData = (
  data: unknown,
  results: AnalysisResult[],
  onError?: (error: string) => void
): AnalysisResult[] => {
  if (isErrorData(data)) {
    const errorMsg = `Backend Error: ${data.error}`;
    onError?.(errorMsg);
    console.error(errorMsg);
    return results;
  }

  const streamData = data as StreamData;

  if (streamData.status === "done") {
    return results;
  }

  if (!Array.isArray(data) || data.length !== 2) {
    return results;
  }

  const posData = data[0] as {
    class: string;
    confidence: number;
    start_time: string;
    end_time: string;
  };
  const findingsData = data[1] as Array<{ class: string; confidence: number }>;

  let max_confidence = -1;
  let best_finding = "";
  for (const finding of findingsData) {
    if (finding.confidence > max_confidence) {
      max_confidence = finding.confidence;
      best_finding = finding.class;
    }
  }
  const newResult: AnalysisResult = {
    id: resultIdCounter++,
    position: posData.class,
    pos_confidence: posData.confidence * 100,
    start_time: posData.start_time,
    end_time: posData.end_time,
    finding: best_finding,
    finding_confidence: max_confidence * 100,
  };
  return [...results, newResult];
};

const Index = () => {
  const {
    analysisType,
    setAnalysisType,
    selectedFile,
    setSelectedFile,
    results,
    setResults,
    isLoading,
    setIsLoading,
    error,
    setError,
    videoTimestamp,
    setVideoTimestamp,
    currentVideoTime,
    setCurrentVideoTime,
    abortController,
    setAbortController,
    isStreaming,
    setIsStreaming,
    terminateStream,
    resetState,
  } = useAppContext();

  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);

  const timeToSeconds = (timeStr: string): number => {
    const parts = timeStr.split(":").map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  };

  const handleRowClick = (result: AnalysisResult) => {
    const startTime = timeToSeconds(result.start_time);
    setVideoTimestamp(startTime);
    toast.info(`Jumping to ${result.position} - ${result.finding}`);
  };

  const chartData = useMemo(() => {
    const positionCounts: Record<string, Record<string, number>> = {};

    results.forEach((result) => {
      if (!positionCounts[result.position]) {
        positionCounts[result.position] = {};
      }
      if (!positionCounts[result.position][result.finding]) {
        positionCounts[result.position][result.finding] = 0;
      }
      positionCounts[result.position][result.finding]++;
    });

    return Object.entries(positionCounts).map(([position, findings]) => ({
      position,
      ...findings,
    }));
  }, [results]);

  const findingTypes = useMemo(() => {
    const types = new Set<string>();
    results.forEach((result) => types.add(result.finding));
    return Array.from(types);
  }, [results]);

  const findingColors = [
    "hsl(var(--primary))",
    "hsl(var(--destructive))",
    "hsl(48, 96%, 53%)",
    "hsl(142, 71%, 45%)",
    "hsl(190, 90%, 50%)",
    "hsl(217, 91%, 60%)",
    "hsl(270, 95%, 60%)",
    "hsl(330, 81%, 60%)",
  ];

  const handleAnalyze = async () => {
    if (!selectedFile) {
      toast.error("Please select a video file first");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults([]);
    resultIdCounter = 0;

    try {
      const controller = new AbortController();
      setAbortController(controller);
      setIsStreaming(true);

      const formData = new FormData();
      formData.append("file", selectedFile);

      const isGastroscopy = analysisType === "gastroscopy";
      const apiUrl = `http://localhost:8000/predict?is_gastroscopy=${isGastroscopy}`;

      const response = await fetch(apiUrl, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      await handleStreamResponse(response);
      setIsLoading(false);
      setIsStreaming(false);
      toast.success("Analysis completed successfully!");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Analysis terminated by user");
        toast.info("Analysis terminated");
      } else {
        console.error("Analysis error:", err);
        const errorMessage =
          err instanceof Error ? err.message : "An unknown error occurred";
        setError(errorMessage);
        toast.error(`Analysis failed: ${errorMessage}`);
      }
      setIsLoading(false);
      setIsStreaming(false);
    } finally {
      setAbortController(null);
    }
  };

  const handleStreamResponse = async (response: Response) => {
    if (!response.body) {
      throw new Error("No response body");
    }

    const reader = response.body
      .pipeThrough(new TextDecoderStream())
      .getReader();

    readerRef.current = reader;
    let buffer = "";
    let hasError = false;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim().startsWith("data: ")) {
            hasError = processDataLine(line) || hasError;
          }
        }
      }
    } finally {
      readerRef.current = null;
    }

    if (hasError) {
      throw new Error("Processing failed - check error details above");
    }
  };

  const processDataLine = (line: string): boolean => {
    try {
      const jsonStr = line.substring(6).trim();
      if (jsonStr && jsonStr !== "[DONE]") {
        const data = JSON.parse(jsonStr);
        let hasError = false;

        setResults((prev) => {
          const updated = processStreamData(
            data,
            prev,
            (errorMsg) => {
              setError(errorMsg);
              hasError = true;
            });
          return updated;
        });

        return hasError;
      }
    } catch (parseError) {
      console.error("Error parsing JSON:", parseError);
      setError(`JSON Parse Error: ${parseError}`);
      return true;
    }
    return false;
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar
        analysisType={analysisType}
        onAnalysisTypeChange={setAnalysisType}
      />

      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                AI-Powered Endoscopic Video Analysis
              </h1>
              <p className="text-muted-foreground">
                Upload your{" "}
                {analysisType === "gastroscopy" ? "gastroscopy" : "colonoscopy"}{" "}
                video for automated analysis
              </p>
            </div>

            {/* Control buttons */}
            <div className="flex gap-2">
              {isStreaming && (
                <Button
                  onClick={terminateStream}
                  variant="destructive"
                  className="gap-2"
                >
                  <Square className="h-4 w-4" />
                  Terminate
                </Button>
              )}

              {(selectedFile || results.length > 0) && !isStreaming && (
                <Button
                  onClick={resetState}
                  variant="outline"
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              )}
            </div>
          </div>

          {selectedFile && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-3">
                  Video Preview
                </h2>
                <VideoPlayer
                  videoFile={selectedFile}
                  currentTime={videoTimestamp}
                  onTimeUpdate={setCurrentVideoTime}
                />
              </div>
            </div>
          )}

          <UploadArea
            selectedFile={selectedFile}
            onFileSelect={setSelectedFile}
            onAnalyze={handleAnalyze}
            isLoading={isLoading}
          />

          {error && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <h3 className="font-semibold text-destructive mb-1">
                  Analysis Error
                </h3>
                <p className="text-sm text-destructive/90">{error}</p>
              </div>
            </div>
          )}

          <ResultsTable
            results={results}
            onRowClick={handleRowClick}
            currentVideoTime={currentVideoTime}
          />

          {!isLoading && results.length > 0 && chartData.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Finding Frequency by Position
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="position"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--foreground))" }}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--foreground))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Legend wrapperStyle={{ color: "hsl(var(--foreground))" }} />
                  {findingTypes.map((finding, index) => (
                    <Bar
                      key={finding}
                      dataKey={finding}
                      fill={findingColors[index % findingColors.length]}
                      name={finding}
                      stackId="a"
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
