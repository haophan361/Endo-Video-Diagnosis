import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { AnalysisResult } from "@/components/ResultsTable";

interface AppContextType {
  analysisType: "gastroscopy" | "colonoscopy";
  selectedFile: File | null;
  results: AnalysisResult[];
  isLoading: boolean;
  error: string | null;
  videoTimestamp: number | undefined;
  currentVideoTime: number;

  abortController: AbortController | null;
  isStreaming: boolean;

  setAnalysisType: (type: "gastroscopy" | "colonoscopy") => void;
  setSelectedFile: (file: File | null) => void;
  setResults: (
    results: AnalysisResult[] | ((prev: AnalysisResult[]) => AnalysisResult[])
  ) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setVideoTimestamp: (timestamp: number | undefined) => void;
  setCurrentVideoTime: (time: number) => void;
  setAbortController: (controller: AbortController | null) => void;
  setIsStreaming: (streaming: boolean) => void;

  terminateStream: () => void;
  resetState: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [analysisType, setAnalysisType] = useState<
    "gastroscopy" | "colonoscopy"
  >("gastroscopy");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoTimestamp, setVideoTimestamp] = useState<number | undefined>(
    undefined
  );
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const fileCache = useRef<Map<string, File>>(new Map());

  useEffect(() => {
    const savedState = localStorage.getItem("analysisAppState");
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        setAnalysisType(state.analysisType || "gastroscopy");
        setResults(state.results || []);
        setVideoTimestamp(state.videoTimestamp);
        setCurrentVideoTime(state.currentVideoTime || 0);

        if (state.selectedFileName) {
          const cachedFile = fileCache.current.get(state.selectedFileName);
          if (cachedFile) {
            setSelectedFile(cachedFile);
          }
        }
      } catch (e) {
        console.error("Failed to restore state from localStorage:", e);
      }
    }
  }, []);

  useEffect(() => {
    const stateToSave = {
      analysisType,
      results,
      videoTimestamp,
      currentVideoTime,
      selectedFileName: selectedFile?.name,
    };
    localStorage.setItem("analysisAppState", JSON.stringify(stateToSave));

    if (selectedFile) {
      fileCache.current.set(selectedFile.name, selectedFile);
    }
  }, [analysisType, results, videoTimestamp, currentVideoTime, selectedFile]);

  const terminateStream = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsStreaming(false);
      setIsLoading(false);
    }
  }, [abortController]);

  const resetState = useCallback(() => {
    terminateStream();

    setSelectedFile(null);
    setResults([]);
    setError(null);
    setVideoTimestamp(undefined);
    setCurrentVideoTime(0);
    setIsLoading(false);

    localStorage.removeItem("analysisAppState");
    fileCache.current.clear();
  }, [terminateStream]);

  const value: AppContextType = {
    analysisType,
    selectedFile,
    results,
    isLoading,
    error,
    videoTimestamp,
    currentVideoTime,
    abortController,
    isStreaming,

    setAnalysisType,
    setSelectedFile,
    setResults,
    setIsLoading,
    setError,
    setVideoTimestamp,
    setCurrentVideoTime,
    setAbortController,
    setIsStreaming,

    terminateStream,
    resetState,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within AppProvider");
  }
  return context;
};
