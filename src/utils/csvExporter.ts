import { GroupedBetaData, BETA_GROUPS } from '../types/beta';
import { ViewMode } from '../types/beta';
import { DateRange } from '../components/DataUploader';

export function exportToCSV(data: GroupedBetaData[], selectedGroups: Set<string>, filename: string = 'beta_data_export.csv') {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  // Get selected groups in order
  const selectedGroupsData = BETA_GROUPS.filter(group => selectedGroups.has(group.name));
  
  // Create header row
  const headers = ['Date', ...selectedGroupsData.map(group => group.name)];
  
  // Create data rows
  const rows = data.map(row => {
    const dataRow = [row.date];
    
    selectedGroupsData.forEach(group => {
      const key = group.name.toLowerCase().replace(' ', '') as keyof Omit<GroupedBetaData, 'date'>;
      let value: number;
      
      if (key === 'fixedincome') {
        value = row.fixedIncome;
      } else {
        value = row[key as keyof GroupedBetaData] as number;
      }
      
      dataRow.push(value.toFixed(6)); // 6 decimal places for precision
    });
    
    return dataRow;
  });
  
  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
  
  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export function generateExportFilename(
  selectedGroups: Set<string>, 
  dateRange: DateRange, 
  viewMode: ViewMode
): string {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  // Create groups string
  const groupsArray = Array.from(selectedGroups).sort();
  const groupsString = groupsArray.length <= 3 
    ? groupsArray.join('_').toLowerCase().replace(/\s+/g, '_')
    : `${groupsArray.length}groups`;
  
  // Create date range string
  let dateRangeString = dateRange.type;
  if (dateRange.type === 'custom' && dateRange.startDate && dateRange.endDate) {
    dateRangeString = `custom_${dateRange.startDate}_to_${dateRange.endDate}`;
  }
  
  // Create view mode string
  let viewModeString = '';
  if (viewMode.type === 'total_sp') {
    viewModeString = 'total_sp_weighted';
  } else if (viewMode.type === 'sector_breakdown' && viewMode.selectedSector) {
    const sectorName = viewMode.selectedSector.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const weightingType = viewMode.isSPWeighted ? 'sp_weighted' : 'unweighted';
    viewModeString = `sector_${sectorName}_${weightingType}`;
  }
  
  // Combine all parts
  const parts = [
    'beta_export',
    viewModeString,
    groupsString,
    dateRangeString,
    timestamp
  ].filter(part => part.length > 0);
  
  return `${parts.join('_')}.csv`;
}