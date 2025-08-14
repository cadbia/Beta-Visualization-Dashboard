import { BetaData, GroupedBetaData, SectorData, BETA_GROUPS } from '../types/beta';

export function parseBetaCSV(csvText: string): BetaData[] {
  const lines = csvText.trim().split('\n');
  const data: BetaData[] = [];
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(',');
    const date = values[0];
    const sector = values[1];
    const sectorWeight = parseFloat(values[2]) || 0;
    const betas = values.slice(3).map(v => parseFloat(v) || 0);
    
    if (betas.length >= 88) {
      data.push({ date, sector, sectorWeight, values: betas });
    }
  }
  
  return data;
}

export function applyFactorGrouping(betaValues: number[]): Omit<GroupedBetaData, 'date'> {
  const grouped = {
    value: 0,
    volatility: 0,
    growth: 0,
    commodities: 0,
    fixedIncome: 0,
    index: 0,
    macro: 0,
    sector: 0
  };
  
  BETA_GROUPS.forEach(group => {
    const groupValues = group.indices.map(idx => betaValues[idx - 1] || 0);
    const average = groupValues.reduce((sum, val) => sum + val, 0) / groupValues.length;
    
    switch (group.name.toLowerCase()) {
      case 'value':
        grouped.value = average;
        break;
      case 'volatility':
        grouped.volatility = average;
        break;
      case 'growth':
        grouped.growth = average;
        break;
      case 'commodities':
        grouped.commodities = average;
        break;
      case 'fixed income':
        grouped.fixedIncome = average;
        break;
      case 'index':
        grouped.index = average;
        break;
      case 'macro':
        grouped.macro = average;
        break;
      case 'sector':
        grouped.sector = average;
        break;
    }
  });
  
  return grouped;
}

export function aggregateSPWeightedData(data: BetaData[]): GroupedBetaData[] {
  // Group data by date
  const dateGroups = new Map<string, BetaData[]>();
  
  data.forEach(row => {
    if (!dateGroups.has(row.date)) {
      dateGroups.set(row.date, []);
    }
    dateGroups.get(row.date)!.push(row);
  });
  
  // Calculate weighted averages for each date
  const result: GroupedBetaData[] = [];
  
  dateGroups.forEach((dateData, date) => {
    // Calculate total weight for normalization
    const totalWeight = dateData.reduce((sum, row) => sum + row.sectorWeight, 0);
    
    if (totalWeight === 0) return; // Skip if no valid weights
    
    // Calculate weighted average for each of the 88 beta values
    const weightedBetas = new Array(88).fill(0);
    
    dateData.forEach(row => {
      const weight = row.sectorWeight / totalWeight;
      row.values.forEach((beta, index) => {
        if (index < 88) {
          weightedBetas[index] += beta * weight;
        }
      });
    });
    
    // Apply factor grouping to the weighted betas
    const factorGroups = applyFactorGrouping(weightedBetas);
    
    result.push({
      date,
      ...factorGroups
    });
  });
  
  // Sort by date
  return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function createSectorBreakdownData(data: BetaData[]): SectorData {
  const sectorData: SectorData = {};
  
  // Group data by sector
  const sectorGroups = new Map<string, BetaData[]>();
  
  data.forEach(row => {
    if (!sectorGroups.has(row.sector)) {
      sectorGroups.set(row.sector, []);
    }
    sectorGroups.get(row.sector)!.push(row);
  });
  
  // Process each sector
  sectorGroups.forEach((sectorRows, sectorName) => {
    const groupedData: GroupedBetaData[] = sectorRows.map(row => {
      const factorGroups = applyFactorGrouping(row.values);
      return {
        date: row.date,
        ...factorGroups
      };
    });
    
    // Sort by date
    sectorData[sectorName] = groupedData.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  });
  
  return sectorData;
}

export function createSPWeightedSectorBreakdownData(data: BetaData[]): SectorData {
  const sectorData: SectorData = {};
  
  // Group data by sector
  const sectorGroups = new Map<string, BetaData[]>();
  
  data.forEach(row => {
    if (!sectorGroups.has(row.sector)) {
      sectorGroups.set(row.sector, []);
    }
    sectorGroups.get(row.sector)!.push(row);
  });
  
  // Process each sector with S&P weighting
  sectorGroups.forEach((sectorRows, sectorName) => {
    const groupedData: GroupedBetaData[] = sectorRows.map(row => {
      // Apply factor grouping to get the base averages
      const factorGroups = applyFactorGrouping(row.values);
      
      // Apply S&P sector weighting to each factor group
      const spWeightedGroups = {
        value: factorGroups.value * row.sectorWeight,
        volatility: factorGroups.volatility * row.sectorWeight,
        growth: factorGroups.growth * row.sectorWeight,
        commodities: factorGroups.commodities * row.sectorWeight,
        fixedIncome: factorGroups.fixedIncome * row.sectorWeight,
        index: factorGroups.index * row.sectorWeight,
        macro: factorGroups.macro * row.sectorWeight,
        sector: factorGroups.sector * row.sectorWeight
      };
      
      return {
        date: row.date,
        ...spWeightedGroups
      };
    });
    
    // Sort by date
    sectorData[sectorName] = groupedData.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  });
  
  return sectorData;
}

export function aggregateWeeklyAverages(data: GroupedBetaData[]): GroupedBetaData[] {
  if (data.length === 0) return [];
  
  // Group data by week
  const weekGroups = new Map<string, GroupedBetaData[]>();
  
  data.forEach(row => {
    const date = new Date(row.date);
    // Get the start of the week (Sunday)
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    const weekKey = startOfWeek.toISOString().split('T')[0];
    
    if (!weekGroups.has(weekKey)) {
      weekGroups.set(weekKey, []);
    }
    weekGroups.get(weekKey)!.push(row);
  });
  
  // Calculate weekly averages
  const result: GroupedBetaData[] = [];
  
  weekGroups.forEach((weekData, weekStart) => {
    const weekAverage: GroupedBetaData = {
      date: weekStart,
      value: weekData.reduce((sum, row) => sum + row.value, 0) / weekData.length,
      volatility: weekData.reduce((sum, row) => sum + row.volatility, 0) / weekData.length,
      growth: weekData.reduce((sum, row) => sum + row.growth, 0) / weekData.length,
      commodities: weekData.reduce((sum, row) => sum + row.commodities, 0) / weekData.length,
      fixedIncome: weekData.reduce((sum, row) => sum + row.fixedIncome, 0) / weekData.length,
      index: weekData.reduce((sum, row) => sum + row.index, 0) / weekData.length,
      macro: weekData.reduce((sum, row) => sum + row.macro, 0) / weekData.length,
      sector: weekData.reduce((sum, row) => sum + row.sector, 0) / weekData.length
    };
    
    result.push(weekAverage);
  });
  
  // Sort by date
  return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function groupBetaData(data: BetaData[]): GroupedBetaData[] {
  return data.map(row => {
    const factorGroups = applyFactorGrouping(row.values);
    return {
      date: row.date,
      ...factorGroups
    };
  });
}

export function calculateStatistics(data: GroupedBetaData[], groupName: keyof Omit<GroupedBetaData, 'date'>) {
  const values = data.map(d => d[groupName]);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  return { mean, stdDev, min, max };
}