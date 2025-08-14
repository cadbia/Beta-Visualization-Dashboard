export interface BetaData {
  date: string;
  sector: string;
  sectorWeight: number;
  values: number[];
}

export interface GroupedBetaData {
  date: string;
  value: number;
  volatility: number;
  growth: number;
  commodities: number;
  fixedIncome: number;
  index: number;
  macro: number;
  sector: number;
}

export interface SectorData {
  [sectorName: string]: GroupedBetaData[];
}

export interface ViewMode {
  type: 'total_sp' | 'sector_breakdown';
  selectedSector?: string;
  isSPWeighted?: boolean;
}

export interface BetaGroup {
  name: string;
  color: string;
  indices: number[];
  description: string;
}

export interface DateRange {
  type: 'all' | '6months' | 'year' | '2years' | '3years' | 'custom';
  startDate?: string;
  endDate?: string;
}

export const BETA_GROUPS: BetaGroup[] = [
  {
    name: 'Value',
    color: '#3B82F6',
    indices: [1, 2, 3, 4, 5, 6, 7, 29, 64, 65, 66, 67, 68],
    description: 'Value-oriented factors and strategies'
  },
  {
    name: 'Growth',
    color: '#10B981',
    indices: [8, 24, 25, 26, 27, 28],
    description: 'Growth-focused investment factors'
  },
  {
    name: 'Volatility',
    color: '#F59E0B',
    indices: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 42, 70, 71, 72],
    description: 'Volatility and risk-related measures'
  },
  {
    name: 'Commodities',
    color: '#8B5CF6',
    indices: [30, 31, 73, 74, 75, 76, 77, 78],
    description: 'Commodity and natural resource exposure'
  },
  {
    name: 'Fixed Income',
    color: '#EF4444',
    indices: [32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 54, 55, 56],
    description: 'Bond and fixed income factors'
  },
  {
    name: 'Index',
    color: '#06B6D4',
    indices: [43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53],
    description: 'Broad market index exposures'
  },
  {
    name: 'Macro',
    color: '#84CC16',
    indices: [57, 58, 59, 60, 61, 62, 63],
    description: 'Macroeconomic factors and indicators'
  },
  {
    name: 'Sector',
    color: '#F97316',
    indices: [79, 80, 81, 82, 83, 84, 85, 86, 87, 88],
    description: 'Sector-specific exposures'
  }
];