import React, { useState, useCallback } from 'react';
import { TrendingUp, BarChart3, Upload, Download, Loader2, Maximize2, Minimize2, ChevronDown, ChevronUp } from 'lucide-react';
import { BetaData, GroupedBetaData, SectorData, ViewMode } from './types/beta';
import { 
  parseBetaCSV, 
  aggregateSPWeightedData, 
  createSectorBreakdownData,
  createSPWeightedSectorBreakdownData,
  aggregateWeeklyAverages 
} from './utils/dataProcessor';
import { exportToCSV, generateExportFilename } from './utils/csvExporter';
import { fetchSPPriceForDates, combineAndNormalizeBetaPrice } from './services/yahooFinance';
import { LineChart } from './components/LineChart';
import { GroupSelector } from './components/GroupSelector';
import { StatisticsPanel } from './components/StatisticsPanel';
import { ViewModeSelector } from './components/ViewModeSelector';
import { DateRange } from './components/DataUploader';

function App() {
  const [rawData, setRawData] = useState<BetaData[]>([]);
  const [spGroupedData, setSpGroupedData] = useState<GroupedBetaData[]>([]);
  const [sectorBreakdownData, setSectorBreakdownData] = useState<SectorData>({});
  const [spWeightedSectorBreakdownData, setSpWeightedSectorBreakdownData] = useState<SectorData>({});
  const [filteredData, setFilteredData] = useState<GroupedBetaData[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set(['Value', 'Growth']));
  const [viewMode, setViewMode] = useState<ViewMode>({ type: 'total_sp' });
  const [dateRange, setDateRange] = useState<DateRange>({ type: 'all' });
  const [isLoadingSPData, setIsLoadingSPData] = useState(false);
  const [showSPData, setShowSPData] = useState(false);
  const [combinedData, setCombinedData] = useState<any[]>([]);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [spDataLoaded, setSpDataLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isUploadSectionCollapsed, setIsUploadSectionCollapsed] = useState(false);

  const handleLoadSPData = useCallback(async () => {
    if (filteredData.length === 0) {
      alert('Please load beta data first');
      return;
    }
    
    setIsLoadingSPData(true);
    setShowSPData(false); // Reset display state while loading
    setCombinedData([]); // Clear previous data
    
    try {
      const dates = filteredData.map(d => d.date);
      const priceMap = await fetchSPPriceForDates(dates);
      
      if (priceMap.size > 0) {
        // Combine and normalize the data
        const { combinedData: combined, scaleFactor: scale } = 
          combineAndNormalizeBetaPrice(filteredData, priceMap);
        
        setCombinedData(combined);
        setScaleFactor(scale);
        setSpDataLoaded(true);
        setShowSPData(true); // Auto-check the display checkbox
        
        console.log(`Successfully loaded S&P data for ${combined.length} data points`);
      } else {
        console.warn('No S&P price data was retrieved');
        setSpDataLoaded(false);
      }
      
    } catch (error) {
      console.error('Error loading S&P data:', error);
      setSpDataLoaded(false);
    } finally {
      setIsLoadingSPData(false);
    }
  }, [filteredData]);

  const handleDataLoad = useCallback((csvText: string) => {
    try {
      const rawData = parseBetaCSV(csvText);
      
      // Create S&P weighted data
      const spData = aggregateSPWeightedData(rawData);
      const weeklySpData = aggregateWeeklyAverages(spData);
      
      // Create sector breakdown data
      const sectorData = createSectorBreakdownData(rawData);
      
      // Create S&P weighted sector breakdown data
      const spWeightedSectorData = createSPWeightedSectorBreakdownData(rawData);
      
      // Apply weekly averaging to each sector
      const weeklySectorData: SectorData = {};
      Object.keys(sectorData).forEach(sector => {
        weeklySectorData[sector] = aggregateWeeklyAverages(sectorData[sector]);
      });
      
      // Apply weekly averaging to S&P weighted sector data
      const weeklySpWeightedSectorData: SectorData = {};
      Object.keys(spWeightedSectorData).forEach(sector => {
        weeklySpWeightedSectorData[sector] = aggregateWeeklyAverages(spWeightedSectorData[sector]);
      });
      
      setRawData(rawData);
      setSpGroupedData(weeklySpData);
      setSectorBreakdownData(weeklySectorData);
      setSpWeightedSectorBreakdownData(weeklySpWeightedSectorData);
      setFilteredData(weeklySpData);
      
      // Reset view mode to total S&P when new data is loaded
      setViewMode({ type: 'total_sp' });
      
      // Collapse the upload section after successful data load
      setIsUploadSectionCollapsed(true);
    } catch (error) {
      console.error('Error processing data:', error);
      alert('Error processing CSV data. Please check the file format.');
    }
  }, []);

  const getCurrentData = useCallback((): GroupedBetaData[] => {
    if (viewMode.type === 'total_sp') {
      return spGroupedData;
    } else if (viewMode.type === 'sector_breakdown' && viewMode.selectedSector) {
      const dataSource = viewMode.isSPWeighted ? spWeightedSectorBreakdownData : sectorBreakdownData;
      return dataSource[viewMode.selectedSector] || [];
    }
    return [];
  }, [viewMode, spGroupedData, sectorBreakdownData, spWeightedSectorBreakdownData]);

  const getCurrentRawData = useCallback(() => {
    console.log('getCurrentRawData - viewMode:', viewMode);
    console.log('getCurrentRawData - rawData length:', rawData.length);
    
    if (viewMode.type === 'total_sp') {
      console.log('getCurrentRawData - returning total rawData:', rawData.length);
      return rawData;
    } else if (viewMode.type === 'sector_breakdown' && viewMode.selectedSector) {
      const filtered = rawData.filter(row => row.sector === viewMode.selectedSector);
      console.log('getCurrentRawData - filtered for sector', viewMode.selectedSector, ':', filtered.length);
      console.log('getCurrentRawData - available sectors:', [...new Set(rawData.map(r => r.sector))]);
      return filtered;
    }
    return [];
  }, [viewMode, rawData]);

  const handleViewModeChange = useCallback((newViewMode: ViewMode) => {
    setViewMode(newViewMode);
    
    // Update filtered data based on new view mode
    const currentData = newViewMode.type === 'total_sp' 
      ? spGroupedData 
      : (newViewMode.selectedSector ? 
          (newViewMode.isSPWeighted ? spWeightedSectorBreakdownData : sectorBreakdownData)[newViewMode.selectedSector] || [] 
          : []);
    
    // Apply current date range filter to new data
    if (dateRange.type === 'all') {
      setFilteredData(currentData);
    } else {
      // Reapply date filtering
      const now = new Date();
      let startDate: Date;
      let endDate = now;
      
      switch (dateRange.type) {
        case '6months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
          break;
        case 'year':
          startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          break;
        case '2years':
          startDate = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
          break;
        case '3years':
          startDate = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate());
          break;
        case 'custom':
          if (dateRange.startDate) startDate = new Date(dateRange.startDate);
          if (dateRange.endDate) endDate = new Date(dateRange.endDate);
          break;
        default:
          startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      }
      
      const filtered = currentData.filter(d => {
        const dataDate = new Date(d.date);
        return dataDate >= startDate && dataDate <= endDate;
      });
      
      setFilteredData(filtered);
    }
  }, [spGroupedData, sectorBreakdownData, dateRange, spWeightedSectorBreakdownData]);
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const csvText = e.target?.result as string;
        handleDataLoad(csvText);
      };
      reader.readAsText(file);
    }
  }, [handleDataLoad]);
  
  const handleDateRangeChange = useCallback((range: DateRange) => {
    setDateRange(range);
    
    const currentData = getCurrentData();
    if (currentData.length === 0) return;
    
    // Calculate date range based on type
    const now = new Date();
    let startDate: Date;
    let endDate = now;
    
    switch (range.type) {
      case 'all':
        // Show all data - no filtering
        setFilteredData(currentData);
        return;
      case '6months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      case '2years':
        startDate = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
        break;
      case '3years':
        startDate = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate());
        break;
      case 'custom':
        if (range.startDate) startDate = new Date(range.startDate);
        if (range.endDate) endDate = new Date(range.endDate);
        break;
      default:
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    }
    
    // Filter data based on date range
    const filtered = currentData.filter(d => {
      const dataDate = new Date(d.date);
      return dataDate >= startDate && dataDate <= endDate;
    });
    
    setFilteredData(filtered);
  }, [getCurrentData]);
  
  const handleToggleGroup = useCallback((groupName: string) => {
    setSelectedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  }, []);
  
  const handleExportCSV = useCallback(() => {
    if (filteredData.length === 0) {
      alert('No data to export');
      return;
    }
    
    if (selectedGroups.size === 0) {
      alert('Please select at least one group to export');
      return;
    }
    
    try {
      const filename = generateExportFilename(selectedGroups, dateRange, viewMode);
      exportToCSV(filteredData, selectedGroups, filename);
    } catch (error) {
      console.error('Export error:', error);
      alert('Error exporting data. Please try again.');
    }
  }, [filteredData, selectedGroups, dateRange]);
  
  const availableSectors = Object.keys(sectorBreakdownData);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Data Upload */}
        <div className="bg-white rounded-lg shadow-lg p-6" style={{ borderColor: '#2A6A9E', borderWidth: '1px' }}>
          {/* Clickable Header */}
          <div 
            className="flex items-center justify-between cursor-pointer mb-4"
            onClick={() => setIsUploadSectionCollapsed(!isUploadSectionCollapsed)}
          >
            <h3 className="text-lg font-semibold" style={{ color: '#2A6A9E' }}>Load Data</h3>
            {isUploadSectionCollapsed ? (
              <ChevronDown className="w-5 h-5" style={{ color: '#2A6A9E' }} />
            ) : (
              <ChevronUp className="w-5 h-5" style={{ color: '#2A6A9E' }} />
            )}
          </div>
          
          {/* Collapsible Content */}
          <div className={`overflow-hidden transition-all duration-300 ${
            isUploadSectionCollapsed ? 'max-h-0' : 'max-h-screen'
          }`}>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#2A6A9E' }}>
                Upload CSV File (Date, Sector, Sector_Weight, 1-88 Beta Values)
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
                    <Download className="w-8 h-8 mb-4" style={{ color: '#2A6A9E' }} />
                    <p className="mb-2 text-sm" style={{ color: '#2A6A9E' }}>
                      <span className="font-semibold">Click to import</span> your CSV file
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
        </div>
        
        {rawData.length > 0 && (
          <div className="space-y-6 mt-8">
            {/* View Mode and S&P Controls */}
            <div className="flex gap-6 items-stretch w-full">
              {/* View Mode Selector */}
              <div className="flex-shrink-0">
                <ViewModeSelector
                  viewMode={viewMode}
                  availableSectors={availableSectors}
                  onViewModeChange={handleViewModeChange}
                />
              </div>
              
              {/* S&P Data Controls */}
              {rawData.length > 0 && (
                <div className="flex-shrink-0">
                  <div className="bg-white rounded-lg shadow-lg p-4 w-64" style={{ borderColor: '#2A6A9E', borderWidth: '1px' }}>
                    <h3 className="text-lg font-semibold mb-4" style={{ color: '#2A6A9E' }}>S&P 500 Data</h3>
                    
                    <div className="space-y-3">
                      <button
                        onClick={handleLoadSPData}
                        disabled={isLoadingSPData || filteredData.length === 0}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ 
                          backgroundColor: isLoadingSPData || filteredData.length === 0 ? '#f1f5f9' : '#2A6A9E',
                          color: isLoadingSPData || filteredData.length === 0 ? '#94a3b8' : 'white'
                        }}
                        onMouseEnter={(e) => {
                          if (!isLoadingSPData && filteredData.length > 0) {
                            e.currentTarget.style.backgroundColor = '#1e40af';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isLoadingSPData && filteredData.length > 0) {
                            e.currentTarget.style.backgroundColor = '#2A6A9E';
                          }
                        }}
                      >
                        {isLoadingSPData ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <TrendingUp className="w-4 h-4" />
                        )}
                        <span>
                          {isLoadingSPData 
                            ? 'Loading...' 
                            : spDataLoaded 
                              ? 'Reload S&P Data' 
                              : 'Load S&P Data'
                          }
                        </span>
                      </button>
                      
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showSPData}
                          onChange={(e) => setShowSPData(e.target.checked)}
                         disabled={!spDataLoaded}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                          showSPData && spDataLoaded
                            ? 'border-transparent bg-blue-600' 
                            : ''
                        }`} style={{ 
                          backgroundColor: showSPData && spDataLoaded ? '#2A6A9E' : 'transparent',
                          borderColor: showSPData && spDataLoaded ? 'transparent' : '#2A6A9E',
                          opacity: spDataLoaded ? 1 : 0.5
                        }}>
                          {showSPData && spDataLoaded && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <span className="ml-2 text-sm font-medium" style={{ 
                          color: spDataLoaded ? '#2A6A9E' : '#94a3b8',
                          cursor: spDataLoaded ? 'pointer' : 'not-allowed'
                        }}>
                          Display on Chart
                        </span>
                      </label>
                    </div>
                    
                    <div className="mt-4 p-2 rounded text-xs" style={{ backgroundColor: '#f8fafc', color: '#64748b' }}>
                      S&P 500 closing prices
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-6 items-stretch w-full">
              {/* Factor Groups - Left Side */}
              <div className="flex-shrink-0">
                <div className="space-y-6 h-full flex flex-col">
                  <GroupSelector
                    selectedGroups={selectedGroups}
                    onToggleGroup={handleToggleGroup}
                  />
                  
                  {/* Date Range Filter - Compact Version */}
                  <div className="bg-white rounded-lg shadow-lg p-4 w-64 flex-1 flex flex-col" style={{ borderColor: '#2A6A9E', borderWidth: '1px' }}>
                    <h3 className="text-lg font-semibold mb-4" style={{ color: '#2A6A9E' }}>Date Range</h3>
                    
                    {/* Quick Range Buttons - Stacked Layout */}
                    <div className="grid grid-cols-2 gap-2 mb-4 flex-1">
                      {[
                        { type: 'all' as const, label: 'All' },
                        { type: '6months' as const, label: '6M' },
                        { type: 'year' as const, label: '1Y' },
                        { type: '2years' as const, label: '2Y' },
                        { type: '3years' as const, label: '3Y' },
                        { type: 'custom' as const, label: 'Custom' }
                      ].map(({ type, label }) => (
                        <button
                          key={type}
                          onClick={() => handleDateRangeChange({ type })}
                          className={`px-2 py-1.5 text-sm rounded-lg transition-colors font-medium border ${
                            dateRange.type === type 
                              ? 'bg-blue-600 text-white border-blue-600' 
                              : 'hover:bg-blue-600 hover:text-white'
                          }`}
                          style={dateRange.type === type ? {} : { 
                            backgroundColor: '#f8fafc',
                            borderColor: '#2A6A9E',
                            color: '#2A6A9E'
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* Custom Date Range Inputs - Compact */}
                    {dateRange.type === 'custom' && (
                      <div className="space-y-3 mt-auto">
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: '#2A6A9E' }}>
                            Start Date
                          </label>
                          <input
                            type="date"
                            className="w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors"
                            style={{ 
                              borderColor: '#2A6A9E',
                              focusRingColor: '#2A6A9E'
                            }}
                            onChange={(e) => handleDateRangeChange({ 
                              type: 'custom', 
                              startDate: e.target.value,
                              endDate: dateRange.endDate 
                            })}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: '#2A6A9E' }}>
                            End Date
                          </label>
                          <input
                            type="date"
                            className="w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors"
                            style={{ 
                              borderColor: '#2A6A9E',
                              focusRingColor: '#2A6A9E'
                            }}
                            onChange={(e) => handleDateRangeChange({ 
                              type: 'custom', 
                              startDate: dateRange.startDate,
                              endDate: e.target.value 
                            })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Chart - Right Side */}
              <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-gray-50 p-4 flex flex-col' : 'flex-1 min-w-0 w-full'}`}>
                <div className={`bg-white rounded-lg shadow-lg p-3 sm:p-4 md:p-6 ${isFullscreen ? 'flex-1 flex flex-col min-h-0' : 'h-full'}`} style={{ borderColor: '#2A6A9E', borderWidth: '1px' }}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <h2 className="text-xl font-semibold" style={{ color: '#2A6A9E' }}>
                      {viewMode.type === 'total_sp' 
                        ? 'S&P 500 Beta Values Over Time (Weekly Averages)' 
                        : `${viewMode.selectedSector || 'Sector'} Beta Values Over Time (Weekly Averages)`
                      }
                    </h2>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                      <div className="text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-full whitespace-nowrap" style={{ color: '#2A6A9E', backgroundColor: '#f8fafc' }}>
                        {selectedGroups.size} group{selectedGroups.size !== 1 ? 's' : ''} selected
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                        <button
                          onClick={handleExportCSV}
                          disabled={filteredData.length === 0 || selectedGroups.size === 0}
                          className="flex items-center justify-center sm:justify-start space-x-2 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                          style={{ 
                            backgroundColor: filteredData.length === 0 || selectedGroups.size === 0 ? '#f1f5f9' : '#2A6A9E',
                            color: filteredData.length === 0 || selectedGroups.size === 0 ? '#94a3b8' : 'white'
                          }}
                          onMouseEnter={(e) => {
                            if (filteredData.length > 0 && selectedGroups.size > 0) {
                              e.currentTarget.style.backgroundColor = '#1e40af';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (filteredData.length > 0 && selectedGroups.size > 0) {
                              e.currentTarget.style.backgroundColor = '#2A6A9E';
                            }
                          }}
                        >
                          <Upload className="w-3 sm:w-4 h-3 sm:h-4" />
                          <span className="hidden sm:inline">Export CSV</span>
                          <span className="sm:hidden">Export</span>
                        </button>
                        <button
                          onClick={() => setIsFullscreen(!isFullscreen)}
                          className="flex items-center justify-center sm:justify-start space-x-2 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors w-full sm:w-auto"
                          style={{ 
                            backgroundColor: '#f1f5f9',
                            color: '#2A6A9E'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        >
                          {isFullscreen ? <Minimize2 className="w-3 sm:w-4 h-3 sm:h-4" /> : <Maximize2 className="w-3 sm:w-4 h-3 sm:h-4" />}
                          <span className="hidden sm:inline">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
                          <span className="sm:hidden">{isFullscreen ? 'Exit' : 'Full'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {selectedGroups.size > 0 ? (
                    <div className={`w-full ${isFullscreen ? 'flex-1 min-h-0' : ''}`} style={{ height: isFullscreen ? 'auto' : 'clamp(400px, 63vh, 600px)' }}>
                      <LineChart
                        data={filteredData}
                        selectedGroups={selectedGroups}
                        width={0}
                        height={0}
                        showSPData={showSPData}
                        spPriceData={combinedData.map(d => ({ date: d.date, spPriceZScore: d.spPriceZScore, spPrice: d.spPrice }))}
                        scaleFactor={scaleFactor}
                        isFullscreen={isFullscreen}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64 sm:h-80 md:h-96" style={{ color: '#64748b' }}>
                      <div className="text-center">
                        <BarChart3 className="w-8 sm:w-10 md:w-12 h-8 sm:h-10 md:h-12 mx-auto mb-4" style={{ color: '#94a3b8' }} />
                        <p className="text-sm sm:text-base">Select at least one group to view the chart</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Statistics at bottom */}
            <div className="w-full">
              <StatisticsPanel
                data={filteredData}
                selectedGroups={selectedGroups}
                rawData={getCurrentRawData()}
                dateRange={dateRange}
              />
            </div>
          </div>
        )}
        
        {rawData.length === 0 && (
          <div className="text-center py-12">
            <TrendingUp className="w-16 h-16 mx-auto mb-4" style={{ color: '#2A6A9E' }} />
            <h2 className="text-2xl font-semibold mb-2" style={{ color: '#2A6A9E' }}>
              S&P 500 Sector Beta Analysis
            </h2>
            <p className="max-w-md mx-auto" style={{ color: '#64748b' }}>
              Upload your CSV file with sector data to start exploring weighted S&P 500 and sector-specific factor beta values
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;