import { Upload, FileSpreadsheet } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  onUploadClick?: () => void;
}

export function EmptyState({
  title = 'No Portfolio Data',
  description = 'Upload an Excel file to view your portfolio dashboard',
  onUploadClick,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-20 h-20 rounded-full bg-terebinth-light flex items-center justify-center mb-6">
        <FileSpreadsheet className="w-10 h-10 text-terebinth-primary" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-500 text-center max-w-md mb-6">{description}</p>
      {onUploadClick && (
        <button
          onClick={onUploadClick}
          className="btn-primary flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Upload Portfolio Data
        </button>
      )}
    </div>
  );
}
