import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, X, Eye, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from './button';
import { Progress } from './progress';
import { Card } from './card';
import { PDFPreview } from './pdf-preview';
import { uploadToBlob, validateFile, formatFileSize, BlobUploadError, type UploadProgress, type UploadResult } from '@/lib/blob-upload';
import { useToast } from '@/hooks/use-toast';

interface FileUploadProps {
  onUploadComplete: (result: UploadResult) => void;
  onUploadStart?: () => void;
  onUploadError?: (error: string) => void;
  accept?: string;
  maxSize?: number;
  className?: string;
}

export function FileUpload({
  onUploadComplete,
  onUploadStart,
  onUploadError,
  accept = '.pdf,.doc,.docx',
  maxSize = 3 * 1024 * 1024, // 3MB
  className = ''
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    // Validate file
    const validation = validateFile(selectedFile);
    if (!validation.valid) {
      toast({
        title: 'Invalid File',
        description: validation.error,
        variant: 'destructive',
      });
      onUploadError?.(validation.error || 'Invalid file');
      return;
    }

    setFile(selectedFile);
    setUploading(true);
    setProgress(null);
    onUploadStart?.();

    try {
      const result = await uploadToBlob(selectedFile, (progressData) => {
        setProgress(progressData);
      });

      setUploadResult(result);
      onUploadComplete(result);
      
      toast({
        title: 'Upload Successful',
        description: `${selectedFile.name} has been uploaded successfully.`,
      });

    } catch (error) {
      console.error('Upload error:', error);
      
      const errorMessage = error instanceof BlobUploadError 
        ? error.message 
        : 'Upload failed. Please try again.';
      
      toast({
        title: 'Upload Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      
      onUploadError?.(errorMessage);
      setFile(null);
    } finally {
      setUploading(false);
      setProgress(null);
    }
  }, [onUploadComplete, onUploadStart, onUploadError, toast]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  }, [handleFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const removeFile = useCallback(() => {
    setFile(null);
    setUploadResult(null);
    setProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const canPreview = uploadResult && file?.type === 'application/pdf';

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="sr-only"
      />

      {!file && !uploadResult && (
        <Card
          className={`p-8 border-2 border-dashed cursor-pointer transition-colors ${
            dragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50 hover:bg-muted/50'
          }`}
          onClick={openFileDialog}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="text-center">
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-foreground font-medium mb-2">
              Click to upload or drag and drop
            </p>
            <p className="text-sm text-muted-foreground mb-2">
              PDF or DOC files (max {formatFileSize(maxSize)})
            </p>
            <p className="text-xs text-muted-foreground">
              Supported formats: PDF, DOC, DOCX
            </p>
          </div>
        </Card>
      )}

      {(file || uploadResult) && (
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {uploading ? (
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                </div>
              ) : uploadResult ? (
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {file?.name}
                </p>
                <div className="flex items-center gap-1">
                  {canPreview && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPreview(true)}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                    className="h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mb-2">
                {file ? formatFileSize(file.size) : ''}
                {uploadResult && ' • Uploaded successfully'}
              </p>

              {uploading && progress && (
                <div className="space-y-1">
                  <Progress value={progress.percentage} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Uploading... {progress.percentage}%
                  </p>
                </div>
              )}

              {uploadResult && (
                <div className="flex items-center gap-2 text-xs text-green-600">
                  <CheckCircle2 className="w-3 h-3" />
                  Upload complete
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {showPreview && canPreview && uploadResult && file && (
        <PDFPreview
          url={uploadResult.url}
          filename={file.name}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}