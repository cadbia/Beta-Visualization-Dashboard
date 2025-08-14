import React, { useMemo, useState, useCallback } from 'react';
import { GroupedBetaData, BETA_GROUPS } from '../types/beta';

interface LineChartProps {
  data: GroupedBetaData[];
  selectedGroups: Set<string>;
  width: number;
  height: number;
  showSPData?: boolean;
  spPriceData?: Array<{ date: string; spPriceZScore: number; spPrice?: number }>;
  scaleFactor?: number;
  isFullscreen?: boolean;
}

interface TooltipData {
  x: number;
  y: number;
  date: string;
  values: Array<{ group: string; value: number; color: string }>;
  spPrice?: number;
}

export function LineChart({ 
  data, 
  selectedGroups, 
  width, 
  height, 
  showSPData = false, 
  spPriceData = [], 
  scaleFactor = 1,
  isFullscreen = false
}: LineChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  
  // Calculate responsive dimensions
  const actualWidth = width > 0 ? width : (containerRef?.clientWidth || 800);
  const actualHeight = height > 0 ? height : (containerRef?.clientHeight || 500);

  const { paths, xScale, yScale, minY, maxY, dataPoints, spPricePath } = useMemo(() => {
    if (data.length === 0 || actualWidth <= 0 || actualHeight <= 0) {
      return { paths: [], xScale: () => 0, yScale: () => 0, minY: 0, maxY: 0, dataPoints: [], spPricePath: null };
    }

    const margin = { top: 20, right: 20, bottom: 60, left: 80 };
    const chartWidth = actualWidth - margin.left - margin.right;
    const chartHeight = actualHeight - margin.top - margin.bottom;
    
    // Get all values for selected groups to calculate y-axis range
    const allValues: number[] = [];
    data.forEach(d => {
      BETA_GROUPS.forEach(group => {
        if (selectedGroups.has(group.name)) {
          const key = group.name.toLowerCase().replace(' ', '') as keyof Omit<GroupedBetaData, 'date'>;
          if (key === 'fixedincome') {
            allValues.push(d.fixedIncome);
          } else {
            allValues.push(d[key as keyof GroupedBetaData] as number);
          }
        }
      });
    });
    
    // Include S&P price z-scores in range calculation if showing
    if (showSPData && spPriceData.length > 0) {
      spPriceData.forEach(d => allValues.push(d.spPriceZScore));
    }
    
    const minY = Math.min(...allValues) * 1.1;
    const maxY = Math.max(...allValues) * 1.1;
    
    const xScale = (index: number) => (index / (data.length - 1)) * chartWidth;
    const yScale = (value: number) => chartHeight - ((value - minY) / (maxY - minY)) * chartHeight;
    
    // Create data points for hover detection
    const dataPoints = data.map((d, i) => ({
      x: xScale(i),
      date: d.date,
      index: i,
      values: BETA_GROUPS.filter(group => selectedGroups.has(group.name)).map(group => {
        const key = group.name.toLowerCase().replace(' ', '') as keyof Omit<GroupedBetaData, 'date'>;
        let value: number;
        if (key === 'fixedincome') {
          value = d.fixedIncome;
        } else {
          value = d[key as keyof GroupedBetaData] as number;
        }
        return {
          group: group.name,
          value,
          color: group.color,
          y: yScale(value)
        };
      })
    }));
    
    const paths = BETA_GROUPS.filter(group => selectedGroups.has(group.name)).map(group => {
      const key = group.name.toLowerCase().replace(' ', '') as keyof Omit<GroupedBetaData, 'date'>;
      const points = data.map((d, i) => {
        let value: number;
        if (key === 'fixedincome') {
          value = d.fixedIncome;
        } else {
          value = d[key as keyof GroupedBetaData] as number;
        }
        return `${xScale(i)},${yScale(value)}`;
      });
      
      return {
        path: `M ${points.join(' L ')}`,
        color: group.color,
        name: group.name
      };
    });
    
    // Create S&P price path if showing
    let spPricePath = null;
    if (showSPData && spPriceData.length > 0) {
      const spPoints = spPriceData.map((d, i) => {
        const dataIndex = data.findIndex(bd => bd.date === d.date);
        if (dataIndex >= 0) {
          return `${xScale(dataIndex)},${yScale(d.spPriceZScore)}`;
        }
        return null;
      }).filter(p => p !== null);
      
      if (spPoints.length > 0) {
        spPricePath = {
          path: `M ${spPoints.join(' L ')}`,
          color: '#6B7280',
          name: 'S&P 500 (normalized)'
        };
      }
    }
    
    return { paths, xScale, yScale, minY, maxY, dataPoints, spPricePath };
  }, [data, selectedGroups, actualWidth, actualHeight, showSPData, spPriceData]);

  const handleMouseMove = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const mouseX = event.clientX - rect.left - 80; // Account for left margin
    const mouseY = event.clientY - rect.top;
    
    // Find the closest data point
    let closestPoint = null;
    let minDistance = Infinity;
    
    dataPoints.forEach(point => {
      const distance = Math.abs(point.x - mouseX);
      if (distance < minDistance && distance < 20) { // 20px tolerance
        minDistance = distance;
        closestPoint = point;
      }
    });
    
    if (closestPoint) {
      // Find S&P price for this date if available
      const spDataPoint = spPriceData.find(sp => sp.date === closestPoint.date);
      
      setTooltip({
        x: event.clientX,
        y: event.clientY,
        date: closestPoint.date,
        values: closestPoint.values,
        spPrice: spDataPoint?.spPrice
      });
    } else {
      setTooltip(null);
    }
  }, [dataPoints]);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);
  
  if (data.length === 0) {
    return (
      <div 
        ref={setContainerRef}
        className="flex items-center justify-center h-full text-slate-500"
      >
        No data available
      </div>
    );
  }
  
  const margin = { top: 20, right: 20, bottom: 60, left: 80 };
  const chartWidth = actualWidth - margin.left - margin.right;
  const chartHeight = actualHeight - margin.top - margin.bottom;
  
  // Generate tick marks for axes - more ticks in fullscreen
  const numXTicks = isFullscreen ? 12 : 6;
  const numYTicks = isFullscreen ? 10 : 6;
  
  const xTicks = Array.from({ length: numXTicks }, (_, i) => {
    const index = Math.floor((i / (numXTicks - 1)) * (data.length - 1));
    return {
      x: xScale(index),
      label: data[index]?.date || ''
    };
  });
  
  const yTicks = Array.from({ length: numYTicks }, (_, i) => {
    const value = minY + (i / (numYTicks - 1)) * (maxY - minY);
    return {
      y: yScale(value),
      label: value.toFixed(3)
    };
  });
  
  return (
    <div 
      ref={setContainerRef}
      className="relative w-full h-full"
    >
      <svg 
        width="100%" 
        height="100%" 
        viewBox={`0 0 ${actualWidth} ${actualHeight}`}
        className="bg-white border border-slate-200 rounded-lg w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Grid lines */}
          {yTicks.map((tick, i) => (
            <line
              key={i}
              x1={0}
              y1={tick.y}
              x2={chartWidth}
              y2={tick.y}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
          ))}
          
          {xTicks.map((tick, i) => (
            <line
              key={i}
              x1={tick.x}
              y1={0}
              x2={tick.x}
              y2={chartHeight}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
          ))}
          
          {/* Y-axis */}
          <line x1={0} y1={0} x2={0} y2={chartHeight} stroke="#2A6A9E" strokeWidth={2} />
          
          {/* X-axis */}
          <line x1={0} y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#2A6A9E" strokeWidth={2} />
          
          {/* Zero line */}
          <line
            x1={0}
            y1={yScale(0)}
            x2={chartWidth}
            y2={yScale(0)}
            stroke="#e2e8f0"
            strokeWidth={1}
            strokeDasharray="2,2"
          />
          
          {/* Y-axis labels */}
          {yTicks.map((tick, i) => (
            <text
              key={i}
              x={-15}
              y={tick.y + 4}
              textAnchor="end"
              fontSize="12"
              fill="#2A6A9E"
              fontFamily="ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace"
            >
              {tick.label}
            </text>
          ))}
          
          {/* X-axis labels */}
          {xTicks.map((tick, i) => (
            <text
              key={i}
              x={tick.x}
             y={chartHeight + (isFullscreen ? 25 : 25)}
              textAnchor="middle"
              fontSize="11"
              fill="#2A6A9E"
             transform={`rotate(-45, ${tick.x}, ${chartHeight + (isFullscreen ? 35 : 25)})`}
            >
              {tick.label}
            </text>
          ))}
          
          {/* Data lines */}
          {paths.map((pathData, i) => (
            <path
              key={i}
              d={pathData.path}
              fill="none"
              stroke={pathData.color}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))' }}
            />
          ))}
          
          {/* S&P Price line (dashed) */}
          {spPricePath && (
            <path
              d={spPricePath.path}
              fill="none"
              stroke={spPricePath.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray="5,5"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))' }}
            />
          )}
          
          {/* Hover points */}
          {tooltip && dataPoints.find(p => p.date === tooltip.date)?.values.map((value, i) => (
            <circle
              key={i}
              cx={dataPoints.find(p => p.date === tooltip.date)?.x}
              cy={value.y}
              r={4}
              fill={value.color}
              stroke="white"
              strokeWidth={2}
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))' }}
            />
          ))}
          
          {/* S&P Price hover point */}
          {tooltip && showSPData && spPriceData.length > 0 && (() => {
            const spDataPoint = spPriceData.find(sp => sp.date === tooltip.date);
            const dataPoint = dataPoints.find(p => p.date === tooltip.date);
            if (spDataPoint && dataPoint) {
              return (
                <circle
                  cx={dataPoint.x}
                  cy={yScale(spDataPoint.spPriceZScore)}
                  r={4}
                  fill="#6B7280"
                  stroke="white"
                  strokeWidth={2}
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))' }}
                />
              );
            }
            return null;
          })()}
        </g>
        
        {/* Axis labels */}
        <text
          x={margin.left + chartWidth / 2}
         y={actualHeight - (isFullscreen ? 0 : 15)}
          textAnchor="middle"
          fontSize="14"
          fill="#2A6A9E"
          fontWeight="500"
        >
          Date
        </text>
        
        <text
          x={20}
          y={margin.top + chartHeight / 2}
          textAnchor="middle"
          fontSize="14"
          fill="#2A6A9E"
          fontWeight="500"
          transform={`rotate(-90, 20, ${margin.top + chartHeight / 2})`}
        >
          {showSPData && spPriceData && spPriceData.length > 0 
            ? 'Beta Values • Price (σ units)' 
            : 'Beta Values'
          }
        </text>
      </svg>
      
      {/* Legend */}
      
      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-lg p-3 pointer-events-none"
          style={{
            left: tooltip.x - 10,
            top: tooltip.y - 10,
            transform: 'translate(-100%, -100%)',
            border: '1px solid #2A6A9E'
          }}
        >
          <div className="text-sm font-semibold mb-2 pb-1" style={{ color: '#2A6A9E', borderBottom: '1px solid #e2e8f0' }}>
            {tooltip.date}
          </div>
          <div className="space-y-1">
            {tooltip.values.map((value, i) => (
              <div key={i} className="flex items-center justify-between space-x-3">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: value.color }}
                  />
                  <span className="text-sm" style={{ color: '#64748b' }}>{value.group}</span>
                </div>
                <span className="text-sm font-mono font-medium" style={{ color: '#2A6A9E' }}>
                  {value.value.toFixed(4)}
                </span>
              </div>
            ))}
            {tooltip.spPrice && (
              <div className="flex items-center justify-between space-x-3 pt-2 mt-2" style={{ borderTop: '1px solid #e2e8f0' }}>
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full border border-gray-400"
                    style={{ backgroundColor: 'transparent', borderStyle: 'dashed' }}
                  />
                  <span className="text-sm" style={{ color: '#64748b' }}>S&P 500</span>
                </div>
                <span className="text-sm font-mono font-medium" style={{ color: '#2A6A9E' }}>
                  ${tooltip.spPrice.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Legend - Outside chart area */}
      {!isFullscreen && (selectedGroups.size > 0 || (showSPData && spPricePath)) && (
        <div className={`mt-4 bg-white rounded p-3 border ${isFullscreen ? 'flex-shrink-0' : ''}`} style={{ borderColor: '#e2e8f0' }}>
          <div className={`flex flex-wrap gap-4 text-sm ${isFullscreen ? 'justify-center' : ''}`}>
            {BETA_GROUPS.filter(group => selectedGroups.has(group.name)).map(group => (
              <div key={group.name} className="flex items-center space-x-2">
                <div className="w-4 h-0.5" style={{ backgroundColor: group.color }} />
                <span style={{ color: '#64748b' }}>{group.name}</span>
              </div>
            ))}
            {showSPData && spPricePath && (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-0.5 border-dashed border-t-2" style={{ borderColor: '#6B7280' }} />
                <span style={{ color: '#64748b' }}>
                  S&P 500 (standardized, scale: {scaleFactor}×)
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}