import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  analysisType: "gastroscopy" | "colonoscopy";
  onAnalysisTypeChange: (type: "gastroscopy" | "colonoscopy") => void;
}

const Sidebar = ({ analysisType, onAnalysisTypeChange }: SidebarProps) => {
  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">EndoAI</h1>
        </div>
        <p className="text-sm text-muted-foreground">Video Analysis System</p>
      </div>
      
      <div className="p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Analysis Type</h2>
        <div className="space-y-2">
          <button
            onClick={() => onAnalysisTypeChange("gastroscopy")}
            className={cn(
              "w-full px-4 py-3 rounded-lg text-left transition-all duration-300",
              "border-2 font-medium text-sm",
              analysisType === "gastroscopy"
                ? "bg-primary text-primary-foreground border-primary shadow-md"
                : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-accent"
            )}
          >
            <div className="flex items-center justify-between">
              <span>Gastroscopy</span>
              {analysisType === "gastroscopy" && (
                <div className="w-2 h-2 rounded-full bg-primary-foreground" />
              )}
            </div>
            <p className="text-xs mt-1 opacity-80">Upper GI endoscopy</p>
          </button>
          
          <button
            onClick={() => onAnalysisTypeChange("colonoscopy")}
            className={cn(
              "w-full px-4 py-3 rounded-lg text-left transition-all duration-300",
              "border-2 font-medium text-sm",
              analysisType === "colonoscopy"
                ? "bg-primary text-primary-foreground border-primary shadow-md"
                : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-accent"
            )}
          >
            <div className="flex items-center justify-between">
              <span>Colonoscopy</span>
              {analysisType === "colonoscopy" && (
                <div className="w-2 h-2 rounded-full bg-primary-foreground" />
              )}
            </div>
            <p className="text-xs mt-1 opacity-80">Lower GI endoscopy</p>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
