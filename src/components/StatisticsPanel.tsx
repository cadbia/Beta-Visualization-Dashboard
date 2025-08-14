import React from 'react';
import { GroupedBetaData, BETA_GROUPS } from '../types/beta';
import { DateRange } from './DataUploader';

interface StatisticsPanelProps {
  data: GroupedBetaData[];
  selectedGroups: Set<string>;
  rawData: any[]; // We'll need access to raw beta values
  dateRange: DateRange;
}

function getBetaCategory(betaIndex: number): { group: string; color: string } {
  for (const group of BETA_GROUPS) {
    if (group.indices.includes(betaIndex + 1)) { // +1 because indices are 1-based
      return { group: group.name, color: group.color };
    }
  }
  return { group: 'Unknown', color: '#64748b' };
}

function calculateBetaPercentageChanges(rawData: any[], dateRange: DateRange): Array<{
  betaIndex: number;
  percentageChange: number;
  category: string;
  color: string;
  currentValue: number;
  previousValue: number;
  currentDate: string;
  previousDate: string;
}> {
  if (rawData.length < 2) return [];

  // Sort data by date to get the most recent entries
  const sortedData = rawData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Determine the reference date based on date range type
  let referenceDate: Date;
  if (dateRange.type === 'custom' && dateRange.endDate) {
    referenceDate = new Date(dateRange.endDate);
  } else {
    // For non-custom ranges, use the most recent date in the data
    referenceDate = new Date(sortedData[sortedData.length - 1].date);
  }
  
  // Get the last 4 weeks of data from the reference date
  const fourWeeksAgo = new Date(referenceDate);
  fourWeeksAgo.setDate(referenceDate.getDate() - 28);
  
  // Filter data to last 4 weeks from reference date
  const recentData = sortedData.filter(row => {
    const rowDate = new Date(row.date);
    return rowDate >= fourWeeksAgo && rowDate <= referenceDate;
  });

  if (recentData.length < 2) return [];

  // Get the most recent and oldest data points in the 4-week window
  const oldestData = recentData[0];
  const newestData = recentData[recentData.length - 1];

  const changes: Array<{
    betaIndex: number;
    percentageChange: number;
    category: string;
    color: string;
    currentValue: number;
    previousValue: number;
    currentDate: string;
    previousDate: string;
  }> = [];

  // Calculate percentage change for each of the 88 betas
  for (let i = 0; i < 88; i++) {
    const oldValue = oldestData.values[i] || 0;
    const newValue = newestData.values[i] || 0;
    
    if (oldValue !== 0) {
      const percentageChange = ((newValue - oldValue) / Math.abs(oldValue)) * 100;
      const category = getBetaCategory(i);
      
      changes.push({
        betaIndex: i + 1, // 1-based indexing for display
        percentageChange: Math.abs(percentageChange), // Use absolute value for ranking
        category: category.group,
        color: category.color,
        currentValue: newValue,
        previousValue: oldValue,
        currentDate: newestData.date,
        previousDate: oldestData.date
      });
    }
  }

  // Sort by absolute percentage change (descending) and take top 10
  return changes
    .sort((a, b) => b.percentageChange - a.percentageChange)
    .slice(0, 10);
}

export function StatisticsPanel({ data, selectedGroups, rawData, dateRange }: StatisticsPanelProps) {
  // Debug logging
  console.log('StatisticsPanel - rawData length:', rawData?.length);
  console.log('StatisticsPanel - rawData sample:', rawData?.[0]);
  
  if (!rawData || rawData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6" style={{ borderColor: '#2A6A9E', borderWidth: '1px' }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: '#2A6A9E' }}>Top 10 Beta Changes (Last 4 Weeks)</h3>
        <p style={{ color: '#64748b' }}>No data available</p>
      </div>
    );
  }

  const topChanges = calculateBetaPercentageChanges(rawData, dateRange);
  console.log('StatisticsPanel - topChanges:', topChanges);

  if (topChanges.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6" style={{ borderColor: '#2A6A9E', borderWidth: '1px' }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: '#2A6A9E' }}>Top 10 Beta Changes (Last 4 Weeks)</h3>
        <p style={{ color: '#64748b' }}>Insufficient data to calculate changes (need at least 4 weeks of data)</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6" style={{ borderColor: '#2A6A9E', borderWidth: '1px' }}>
      <h3 className="text-lg font-semibold mb-6 text-center" style={{ color: '#2A6A9E' }}>
        Top 10 Individual Beta Changes (Last 4 Weeks)
      </h3>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b" style={{ borderColor: '#e2e8f0' }}>
              <th className="text-left py-2 px-3 text-sm font-semibold" style={{ color: '#2A6A9E' }}>Rank</th>
              <th className="text-left py-2 px-3 text-sm font-semibold" style={{ color: '#2A6A9E' }}>Beta #</th>
              <th className="text-left py-2 px-3 text-sm font-semibold" style={{ color: '#2A6A9E' }}>Category</th>
              <th className="text-right py-2 px-3 text-sm font-semibold" style={{ color: '#2A6A9E' }}>Change %</th>
              <th className="text-right py-2 px-3 text-sm font-semibold" style={{ color: '#2A6A9E' }}>
                Current Value ({topChanges[0]?.currentDate})
              </th>
              <th className="text-right py-2 px-3 text-sm font-semibold" style={{ color: '#2A6A9E' }}>
                Previous Value ({topChanges[0]?.previousDate})
              </th>
            </tr>
          </thead>
          <tbody>
            {topChanges.map((change, index) => {
              const actualPercentageChange = ((change.currentValue - change.previousValue) / Math.abs(change.previousValue)) * 100;
              const isPositive = actualPercentageChange > 0;
              
              return (
                <tr key={change.betaIndex} className="border-b" style={{ borderColor: '#f1f5f9' }}>
                  <td className="py-3 px-3">
                    <span className="text-sm font-medium" style={{ color: '#2A6A9E' }}>
                      #{index + 1}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-sm font-mono font-medium" style={{ color: '#2A6A9E' }}>
                      {change.betaIndex}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: change.color }}
                      />
                      <span className="text-sm" style={{ color: '#64748b' }}>
                        {change.category}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span 
                      className={`text-sm font-mono font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {isPositive ? '+' : ''}{actualPercentageChange.toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="text-sm font-mono" style={{ color: '#64748b' }}>
                      {change.currentValue.toFixed(4)}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="text-sm font-mono" style={{ color: '#64748b' }}>
                      {change.previousValue.toFixed(4)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 p-3 rounded text-xs" style={{ backgroundColor: '#f8fafc', color: '#64748b' }}>
        <p className="mb-1">
          <strong>Note:</strong> Changes calculated from the oldest to newest data point within the last 4 weeks of the {dateRange.type === 'custom' ? 'selected end date' : 'current date range'}.
        </p>
      </div>
    </div>
  );
}