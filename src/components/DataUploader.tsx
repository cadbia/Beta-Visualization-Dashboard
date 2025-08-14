import React, { useCallback } from 'react';
import { Upload, Calendar } from 'lucide-react';

interface DataUploaderProps {
  onDataLoad: (csvText: string) => void;
  onDateRangeChange: (range: DateRange) => void;
  hasData: boolean;
  currentDateRange: DateRange;
}

export interface DateRange {
  type: 'all' | 'month' | '6months' | 'year' | '2years' | '3years' | 'custom';
  startDate?: string;
  endDate?: string;
}

export function DataUploader({ onDataLoad, onDateRangeChange, hasData, currentDateRange }: DataUploaderProps) {
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const csvText = e.target?.result as string;
        onDataLoad(csvText);
      };
      reader.readAsText(file);
    }
  }, [onDataLoad]);
  
  const handleDateRangeClick = useCallback((type: DateRange['type']) => {
    onDateRangeChange({ type });
  }, [onDateRangeChange]);

  const handleCustomDateChange = useCallback((field: 'startDate' | 'endDate', value: string) => {
    // This would need to be managed by parent component state
    // For now, just trigger the callback
    onDateRangeChange({ 
      type: 'custom', 
      [field]: value 
    });
  }, [onDateRangeChange]);
  
  return (
    <div className="space-y-6">
      {/* Data Upload Section */}
      <div className="bg-white rounded-lg shadow-lg p-6" style={{ borderColor: '#2A6A9E', borderWidth: '1px' }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: '#2A6A9E' }}>Load Data</h3>
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#2A6A9E' }}>
            Upload CSV File
          </label>
          <div className="flex items-center justify-center w-full">
            <label 
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors"
              style={{ 
                borderColor: '#2A6A9E', 
                backgroundColor: '#f8fafc' 
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-4" style={{ color: '#2A6A9E' }} />
                <p className="mb-2 text-sm" style={{ color: '#2A6A9E' }}>
                  <span className="font-semibold">Click to upload</span> your CSV file
                </p>
                <p className="text-xs" style={{ color: '#64748b' }}>CSV files only</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".csv"
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Date Range Filter Section */}
      {hasData && (
        <div className="bg-white rounded-lg shadow-lg p-6" style={{ borderColor: '#2A6A9E', borderWidth: '1px' }}>
          <div className="flex items-center mb-4">
            <Calendar className="w-5 h-5 mr-2" style={{ color: '#2A6A9E' }} />
            <h3 className="text-lg font-semibold" style={{ color: '#2A6A9E' }}>Date Range</h3>
          </div>
          
          {/* Quick Range Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
            {[
              { type: 'all' as const, label: 'All' },
              { type: '6months' as const, label: '6 Months' },
              { type: 'year' as const, label: '1 Year' },
              { type: '2years' as const, label: '2 Years' },
              { type: '3years' as const, label: '3 Years' },
              { type: 'custom' as const, label: 'Custom' }
            ].map(({ type, label }) => (
              <button
                key={type}
                onClick={() => handleDateRangeClick(type)}
                className={`px-3 py-2 text-sm rounded-lg transition-colors font-medium border ${
                  currentDateRange.type === type 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'hover:bg-blue-600 hover:text-white'
                }`}
                style={currentDateRange.type === type ? {} : { 
                  backgroundColor: '#f8fafc',
                  borderColor: '#2A6A9E',
                  color: '#2A6A9E'
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Custom Date Range Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#2A6A9E' }}>
                Start Date
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors"
                style={{ 
                  borderColor: '#2A6A9E',
                  focusRingColor: '#2A6A9E'
                }}
                onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#2A6A9E' }}>
                End Date
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors"
                style={{ 
                  borderColor: '#2A6A9E',
                  focusRingColor: '#2A6A9E'
                }}
                onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}