import { useRef, useState } from "react";
import { Upload, File, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface UploadAreaProps {
  selectedFile: File | null;
  onFileSelect: (file: File) => void;
  onAnalyze: () => void;
  isLoading: boolean;
}

const UploadArea = ({ selectedFile, onFileSelect, onAnalyze, isLoading }: UploadAreaProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && isValidVideoFile(file)) {
      onFileSelect(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isValidVideoFile(file)) {
      onFileSelect(file);
    }
  };

  const isValidVideoFile = (file: File) => {
    const validTypes = ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-matroska'];
    return validTypes.includes(file.type) || /\.(mp4|avi|mov|mkv)$/i.test(file.name);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-12 transition-all duration-300",
          "flex flex-col items-center justify-center min-h-[320px]",
          isDragging 
            ? "border-primary bg-accent scale-[1.02]" 
            : "border-border bg-card hover:border-primary/50 hover:bg-accent/50"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/avi,video/quicktime,video/x-matroska,.mp4,.avi,.mov,.mkv"
          onChange={handleFileChange}
          className="hidden"
        />
        
        <div className="flex flex-col items-center gap-4">
          <div className={cn(
            "p-4 rounded-full transition-all duration-300",
            selectedFile 
              ? "bg-success/10" 
              : "bg-primary/10"
          )}>
            {selectedFile ? (
              <CheckCircle2 className="h-12 w-12 text-success" />
            ) : (
              <Upload className="h-12 w-12 text-primary" />
            )}
          </div>
          
          <div className="text-center">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {selectedFile ? "Video Ready" : "Upload Endoscopic Video"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {selectedFile 
                ? "Click Analyze to start processing" 
                : "Drag and drop an endoscopy video or click to upload"}
            </p>
            
            {selectedFile && (
              <div className="flex items-center gap-2 justify-center mb-4 px-4 py-2 bg-accent rounded-lg">
                <File className="h-4 w-4 text-foreground" />
                <span className="text-sm font-medium text-foreground truncate max-w-[300px]">
                  {selectedFile.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                </span>
              </div>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Choose Video
            </Button>
            
            {selectedFile && (
              <Button
                onClick={onAnalyze}
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? "Analyzing..." : "Analyze"}
              </Button>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground">
            Supports MP4, AVI, MOV, MKV
          </p>
        </div>
      </div>
    </div>
  );
};

export default UploadArea;