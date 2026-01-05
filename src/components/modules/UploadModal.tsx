import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { processExcelFile } from '../../services/excelProcessor';
import type { MarketType } from '../../types/portfolio';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const { upload, setUploadState, addSnapshot, setCurrentSnapshot } = usePortfolioStore();
  const [selectedMarket, setSelectedMarket] = useState<MarketType>('EM');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    holdingsCount?: number;
    quarterLabel?: string;
  } | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
      setUploadResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel.sheet.binary.macroEnabled.12': ['.xlsb'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadState({ isUploading: true, progress: 0, error: null });
    setUploadResult(null);

    try {
      // Process Excel file client-side
      const snapshot = await processExcelFile(
        selectedFile,
        selectedMarket,
        (progress) => {
          setUploadState({ progress });
        }
      );

      // Update store with the new snapshot
      setUploadState({
        isUploading: false,
        progress: 100,
        lastUploadDate: new Date().toISOString(),
      });

      setUploadResult({
        success: true,
        holdingsCount: snapshot.holdings.length,
        quarterLabel: snapshot.quarterLabel,
      });

      // Add snapshot to store (persisted to localStorage)
      addSnapshot(snapshot);
      setCurrentSnapshot(snapshot);

      // Close modal after success
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process file';
      setUploadState({
        isUploading: false,
        error: errorMessage,
      });
      setUploadResult({ success: false });
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setUploadState({ progress: 0, error: null });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-terebinth-dark">
            Upload Portfolio Data
          </h2>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Market type selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Market Type
            </label>
            <div className="flex gap-2">
              {(['DM', 'EM'] as MarketType[]).map((market) => (
                <button
                  key={market}
                  onClick={() => setSelectedMarket(market)}
                  disabled={upload.isUploading}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                    selectedMarket === market
                      ? 'bg-terebinth-primary text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {market === 'DM' ? 'Developed Markets' : 'Emerging Markets'}
                </button>
              ))}
            </div>
          </div>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`dropzone ${isDragActive ? 'active' : ''} ${
              selectedFile ? 'border-green-400 bg-green-50' : ''
            } ${upload.isUploading ? 'pointer-events-none opacity-50' : ''}`}
          >
            <input {...getInputProps()} disabled={upload.isUploading} />
            {selectedFile ? (
              <div className="flex flex-col items-center gap-2">
                <FileSpreadsheet className="w-12 h-12 text-green-500" />
                <p className="text-sm font-medium text-gray-700">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
                {!upload.isUploading && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setUploadResult(null);
                    }}
                    className="text-sm text-red-500 hover:text-red-600"
                  >
                    Remove file
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-12 h-12 text-gray-400" />
                <p className="text-sm text-gray-600">
                  {isDragActive
                    ? 'Drop the file here...'
                    : 'Drag and drop your Excel file here, or click to browse'}
                </p>
                <p className="text-xs text-gray-400">
                  Supports .xlsb, .xlsx, .xls files (max 50MB)
                </p>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {upload.isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {upload.progress < 100 ? 'Uploading...' : 'Processing...'}
                </span>
                <span className="text-terebinth-primary font-medium">
                  {upload.progress}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-terebinth-primary transition-all duration-300"
                  style={{ width: `${upload.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Success message */}
          {uploadResult?.success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Upload successful!</span>
              </div>
              <div className="mt-2 text-sm text-green-600">
                <p>Processed {uploadResult.holdingsCount} holdings for {uploadResult.quarterLabel}</p>
              </div>
            </div>
          )}

          {/* Error message */}
          {upload.error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Upload failed</span>
              </div>
              <p className="mt-1 text-sm text-red-600">{upload.error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="btn-ghost"
            disabled={upload.isUploading}
          >
            {uploadResult?.success ? 'Close' : 'Cancel'}
          </button>
          {!uploadResult?.success && (
            <button
              onClick={handleUpload}
              disabled={!selectedFile || upload.isUploading}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {upload.isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
              {upload.isUploading ? 'Processing...' : 'Upload & Process'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
