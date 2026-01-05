import { useState, useMemo } from 'react';
import { FileText, Download, Calendar, Clock, FileSpreadsheet } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { UploadModal } from '../components/modules/UploadModal';
import { usePortfolioStore } from '../stores/portfolioStore';

export function Reports() {
  const currentSnapshot = usePortfolioStore((state) => state.currentSnapshot);
  const snapshots = usePortfolioStore((state) => state.snapshots);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Get list of uploaded snapshots as available reports
  const availableReports = useMemo(() => {
    return snapshots.map((snapshot) => ({
      id: snapshot.id,
      name: `${snapshot.marketType} Portfolio - ${snapshot.quarterLabel}`,
      type: 'Portfolio Snapshot',
      date: snapshot.date,
      holdingsCount: snapshot.holdings?.length ?? 0,
      marketType: snapshot.marketType,
    }));
  }, [snapshots]);

  // Show empty state if no data
  if (!currentSnapshot) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <EmptyState
          title="No Reports Available"
          description="Upload your portfolio Excel file to generate reports and export data."
          onUploadClick={() => setIsUploadModalOpen(true)}
        />
        <UploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 mt-1">
            Generate and download portfolio reports
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Generate New Report
        </button>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button className="p-4 bg-white rounded-lg border border-gray-200 hover:border-terebinth-accent hover:shadow-md transition-all text-left">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-terebinth-light rounded-lg">
              <FileText className="w-5 h-5 text-terebinth-primary" />
            </div>
            <span className="font-medium text-gray-900">IC Presentation</span>
          </div>
          <p className="text-sm text-gray-500">
            Generate Investment Committee presentation with latest data
          </p>
        </button>

        <button className="p-4 bg-white rounded-lg border border-gray-200 hover:border-terebinth-accent hover:shadow-md transition-all text-left">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Download className="w-5 h-5 text-green-600" />
            </div>
            <span className="font-medium text-gray-900">Data Export</span>
          </div>
          <p className="text-sm text-gray-500">
            Export full holdings and allocations to Excel
          </p>
        </button>

        <button className="p-4 bg-white rounded-lg border border-gray-200 hover:border-terebinth-accent hover:shadow-md transition-all text-left">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <span className="font-medium text-gray-900">Custom Report</span>
          </div>
          <p className="text-sm text-gray-500">
            Build a custom report with selected metrics
          </p>
        </button>
      </div>

      {/* Uploaded Snapshots */}
      <Card title="Uploaded Portfolio Snapshots" subtitle={`${availableReports.length} snapshot${availableReports.length !== 1 ? 's' : ''} available`}>
        {availableReports.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {availableReports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <FileSpreadsheet className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{report.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <span>{report.type}</span>
                      <span>&bull;</span>
                      <span>{report.date}</span>
                      <span>&bull;</span>
                      <span>{report.holdingsCount} holdings</span>
                    </div>
                  </div>
                </div>
                <button className="btn-secondary flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-gray-400">
            <p className="text-sm">No snapshots uploaded yet</p>
          </div>
        )}
      </Card>

      {/* Scheduled reports - Future feature */}
      <Card title="Scheduled Reports" subtitle="Coming soon">
        <div className="h-[150px] flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-lg">
          <Clock className="w-10 h-10 mb-3 text-gray-300" />
          <p className="text-sm text-gray-500">Automated report scheduling</p>
          <p className="text-xs text-gray-400 mt-1">
            Set up recurring reports to be generated automatically
          </p>
        </div>
      </Card>
    </div>
  );
}
