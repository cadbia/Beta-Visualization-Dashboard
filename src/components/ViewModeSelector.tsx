import React from 'react';
import { BarChart3, Building2 } from 'lucide-react';
import { ViewMode } from '../types/beta';

interface ViewModeSelectorProps {
  viewMode: ViewMode;
  availableSectors: string[];
  onViewModeChange: (viewMode: ViewMode) => void;
}

export function ViewModeSelector({ viewMode, availableSectors, onViewModeChange }: ViewModeSelectorProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-4 w-64" style={{ borderColor: '#2A6A9E', borderWidth: '1px' }}>
      <h3 className="text-lg font-semibold mb-4" style={{ color: '#2A6A9E' }}>View Mode</h3>
      
      {/* View Type Selection */}
      <div className="space-y-3 mb-4">
        <label className="flex items-center cursor-pointer">
          <input
            type="radio"
            name="viewType"
            checked={viewMode.type === 'total_sp'}
            onChange={() => onViewModeChange({ type: 'total_sp' })}
            className="sr-only"
          />
          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
            viewMode.type === 'total_sp' 
              ? 'border-transparent bg-blue-600' 
              : 'border-gray-400'
          }`}>
            {viewMode.type === 'total_sp' && (
              <div className="w-2 h-2 bg-white rounded-full" />
            )}
          </div>
          <div className="ml-3 flex items-center">
            <BarChart3 className="w-4 h-4 mr-2" style={{ color: '#2A6A9E' }} />
            <span className="text-sm font-medium" style={{ color: '#2A6A9E' }}>
              Total S&P (Weighted)
            </span>
          </div>
        </label>
        
        <label className="flex items-center cursor-pointer">
          <input
            type="radio"
            name="viewType"
            checked={viewMode.type === 'sector_breakdown'}
            onChange={() => onViewModeChange({ 
              type: 'sector_breakdown', 
              selectedSector: availableSectors[0] || '' 
            })}
            className="sr-only"
          />
          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
            viewMode.type === 'sector_breakdown' 
              ? 'border-transparent bg-blue-600' 
              : 'border-gray-400'
          }`}>
            {viewMode.type === 'sector_breakdown' && (
              <div className="w-2 h-2 bg-white rounded-full" />
            )}
          </div>
          <div className="ml-3 flex items-center">
            <Building2 className="w-4 h-4 mr-2" style={{ color: '#2A6A9E' }} />
            <span className="text-sm font-medium" style={{ color: '#2A6A9E' }}>
              Sector Breakdown
            </span>
          </div>
        </label>
      </div>
      
      {/* Sector Selection */}
      {viewMode.type === 'sector_breakdown' && availableSectors.length > 0 && (
        <div className="pt-3" style={{ borderTop: '1px solid #e2e8f0' }}>
          <label className="block text-sm font-medium mb-2" style={{ color: '#2A6A9E' }}>
            Select Sector
          </label>
          <select
            value={viewMode.selectedSector || ''}
            onChange={(e) => onViewModeChange({ 
              type: 'sector_breakdown', 
              selectedSector: e.target.value 
            })}
            className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors"
            style={{ 
              borderColor: '#2A6A9E',
              color: '#2A6A9E'
            }}
          >
            {availableSectors.map(sector => (
              <option key={sector} value={sector}>
                {sector}
              </option>
            ))}
          </select>
        </div>
      )}
      
      {/* S&P Weighting Toggle */}
      {viewMode.type === 'sector_breakdown' && (
        <div className="pt-3" style={{ borderTop: '1px solid #e2e8f0' }}>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={viewMode.isSPWeighted || false}
              onChange={(e) => onViewModeChange({ 
                type: 'sector_breakdown', 
                selectedSector: viewMode.selectedSector,
                isSPWeighted: e.target.checked
              })}
              className="sr-only"
            />
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
              viewMode.isSPWeighted 
                ? 'border-transparent bg-blue-600' 
                : ''
            }`}>
              {viewMode.isSPWeighted && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span className="ml-2 text-sm font-medium" style={{ color: '#2A6A9E' }}>
              Apply S&P Weighting
            </span>
          </label>
        </div>
      )}
      
      {/* Info Text */}
      <div className="mt-4 p-2 rounded text-xs" style={{ backgroundColor: '#f8fafc', color: '#64748b' }}>
        {viewMode.type === 'total_sp' 
          ? 'Showing sector-weighted averages for the total S&P 500'
          : `Showing ${viewMode.isSPWeighted ? 'S&P weighted ' : 'unweighted '}factor breakdown for ${viewMode.selectedSector || 'selected sector'}`
        }
      </div>
    </div>
  );
}