import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, TrendingUp, PieChart, BarChart3, Activity } from 'lucide-react';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { processExcelFile } from '../../services/excelProcessor';
import { processReturnsRiskFile } from '../../services/returnsRiskProcessor';
import { processCompositionFile } from '../../services/compositionProcessor';
import { processFactorFile } from '../../services/factorProcessor';
import type { MarketType } from '../../types/portfolio';

// Define upload data types
type DataType = 'holdings' | 'performance' | 'composition' | 'factors';

interface DataTypeOption {
  id: DataType;
  label: string;
  description: string;
  icon: typeof TrendingUp;
  fileHint: string;
  acceptedFormats: string[];
}

const dataTypeOptions: DataTypeOption[] = [
  {
    id: 'holdings',
    label: 'TOP 50 Holdings',
    description: 'Portfolio positions with weights, sectors, and countries',
    icon: BarChart3,
    fileHint: 'GlobalEquity_TC_EF_*.xlsb',
    acceptedFormats: ['.xlsb', '.xlsx', '.xls'],
  },
  {
    id: 'performance',
    label: 'Performance & Risk',
    description: 'Historical returns, rolling alpha, volatility, tracking error',
    icon: TrendingUp,
    fileHint: 'IC_Backtest_Returns&Risk_*.xlsx',
    acceptedFormats: ['.xlsx', '.xls'],
  },
  {
    id: 'composition',
    label: 'Portfolio Composition',
    description: 'Historical sector, country, and region allocations over time',
    icon: PieChart,
    fileHint: 'IC_PortfolioComposition_*.xlsx',
    acceptedFormats: ['.xlsx', '.xls'],
  },
  {
    id: 'factors',
    label: 'Factor Analysis',
    description: 'Stock-level factor scores (value, growth, quality, momentum, etc.)',
    icon: Activity,
    fileHint: 'IC_PortfolioComposition_*.xlsx',
    acceptedFormats: ['.xlsx', '.xls'],
  },
];

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const {
    upload,
    setUploadState,
    addSnapshot,
    setCurrentSnapshot,
    setPerformanceData,
    setCompositionData,
    setFactorData,
    saveSnapshotToSupabase,
    savePerformanceToSupabase,
    saveCompositionToSupabase,
    saveFactorDataToSupabase,
  } = usePortfolioStore();

  const [selectedDataType, setSelectedDataType] = useState<DataType>('holdings');
  const [selectedMarket, setSelectedMarket] = useState<MarketType>('EM');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message?: string;
    details?: string;
  } | null>(null);

  const currentDataType = dataTypeOptions.find((d) => d.id === selectedDataType)!;

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
      const progressCallback = (progress: number) => {
        // Scale progress: 0-80% for processing, 80-100% for saving to database
        setUploadState({ progress: Math.round(progress * 0.8) });
      };

      let resultMessage = '';
      let resultDetails = '';

      switch (selectedDataType) {
        case 'holdings': {
          // Process TOP 50 Holdings file
          const snapshot = await processExcelFile(
            selectedFile,
            selectedMarket,
            progressCallback
          );

          // Update local store
          addSnapshot(snapshot);
          setCurrentSnapshot(snapshot);

          // Save to Supabase
          setUploadState({ progress: 85 });
          try {
            await saveSnapshotToSupabase(snapshot, selectedFile.name, selectedFile.size);
          } catch (dbError) {
            console.warn('Failed to save to database (data still available locally):', dbError);
          }

          resultMessage = 'Holdings data uploaded successfully!';
          resultDetails = `Processed ${snapshot.holdings.length} holdings for ${snapshot.quarterLabel}`;
          break;
        }

        case 'performance': {
          // Process Performance & Risk file
          const perfData = await processReturnsRiskFile(selectedFile, progressCallback);

          // Update local store
          setPerformanceData(perfData);

          // Save to Supabase
          setUploadState({ progress: 85 });
          try {
            await savePerformanceToSupabase(perfData, selectedFile.name, selectedFile.size);
          } catch (dbError) {
            console.warn('Failed to save to database (data still available locally):', dbError);
          }

          resultMessage = 'Performance data uploaded successfully!';
          resultDetails = `Loaded ${perfData.performance.length} data points from ${perfData.dateRange.start} to ${perfData.dateRange.end}`;
          break;
        }

        case 'composition': {
          // Process Portfolio Composition file
          const compData = await processCompositionFile(selectedFile, progressCallback);

          // Update local store
          setCompositionData(compData);

          // Save to Supabase
          setUploadState({ progress: 85 });
          try {
            await saveCompositionToSupabase(compData, selectedFile.name, selectedFile.size);
          } catch (dbError) {
            console.warn('Failed to save to database (data still available locally):', dbError);
          }

          const totalPoints =
            compData.region.length + compData.sector.length + compData.country.length;
          resultMessage = 'Composition data uploaded successfully!';
          resultDetails = `Loaded ${totalPoints} allocation data points (${compData.region.length} region, ${compData.sector.length} sector, ${compData.country.length} country)`;
          break;
        }

        case 'factors': {
          // Process Factor Analysis file
          const factorDataResult = await processFactorFile(selectedFile, progressCallback);

          // Update local store
          setFactorData(factorDataResult);

          // Save to Supabase
          setUploadState({ progress: 85 });
          try {
            await saveFactorDataToSupabase(factorDataResult, selectedFile.name, selectedFile.size);
          } catch (dbError) {
            console.warn('Failed to save to database (data still available locally):', dbError);
          }

          resultMessage = 'Factor data uploaded successfully!';
          resultDetails = `Loaded ${factorDataResult.holdings.length} holdings with factor scores across ${factorDataResult.sectorFactors.length} sectors`;
          break;
        }
      }

      setUploadState({
        isUploading: false,
        progress: 100,
        lastUploadDate: new Date().toISOString(),
      });

      setUploadResult({
        success: true,
        message: resultMessage,
        details: resultDetails,
      });

      // Close modal after success
      setTimeout(() => {
        handleClose();
      }, 2500);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process file';
      setUploadState({
        isUploading: false,
        error: errorMessage,
      });
      setUploadResult({ success: false, message: errorMessage });
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
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-terebinth-dark">Upload Data</h2>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Step 1: Data Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              1. Select Data Type
            </label>
            <div className="grid grid-cols-1 gap-3">
              {dataTypeOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedDataType === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => {
                      setSelectedDataType(option.id);
                      setSelectedFile(null);
                      setUploadResult(null);
                    }}
                    disabled={upload.isUploading}
                    className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all text-left disabled:opacity-50 ${
                      isSelected
                        ? 'border-terebinth-primary bg-terebinth-primary/5'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected ? 'bg-terebinth-primary text-white' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-medium ${
                            isSelected ? 'text-terebinth-primary' : 'text-gray-700'
                          }`}
                        >
                          {option.label}
                        </span>
                        {isSelected && (
                          <CheckCircle className="w-4 h-4 text-terebinth-primary" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{option.description}</p>
                      <p className="text-xs text-gray-400 mt-1 font-mono">{option.fileHint}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Market Type Selection (only for Holdings) */}
          {selectedDataType === 'holdings' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                2. Select Market Type
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
          )}

          {/* Step 3: File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {selectedDataType === 'holdings' ? '3.' : '2.'} Upload File
            </label>
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
                  <p className="text-sm font-medium text-gray-700">{selectedFile.name}</p>
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
                    Supports {currentDataType.acceptedFormats.join(', ')} files (max 150MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {upload.isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {upload.progress < 50
                    ? 'Reading file...'
                    : upload.progress < 90
                    ? 'Processing data...'
                    : 'Finalizing...'}
                </span>
                <span className="text-terebinth-primary font-medium">{upload.progress}%</span>
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
                <span className="font-medium">{uploadResult.message}</span>
              </div>
              {uploadResult.details && (
                <p className="mt-2 text-sm text-green-600">{uploadResult.details}</p>
              )}
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
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white">
          <button onClick={handleClose} className="btn-ghost" disabled={upload.isUploading}>
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
