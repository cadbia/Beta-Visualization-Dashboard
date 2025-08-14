import React from 'react';
import { BETA_GROUPS } from '../types/beta';

interface GroupSelectorProps {
  selectedGroups: Set<string>;
  onToggleGroup: (groupName: string) => void;
}

export function GroupSelector({ selectedGroups, onToggleGroup }: GroupSelectorProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-4 w-64 flex flex-col" style={{ borderColor: '#2A6A9E', borderWidth: '1px', minHeight: '400px' }}>
      <h3 className="text-lg font-semibold mb-4" style={{ color: '#2A6A9E' }}>Factor Groups</h3>
      <div className="space-y-3 flex-1">
        {BETA_GROUPS.map(group => (
          <div key={group.name} className="flex items-center justify-between">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={selectedGroups.has(group.name)}
                onChange={() => onToggleGroup(group.name)}
                className="sr-only"
              />
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                selectedGroups.has(group.name) 
                  ? 'border-transparent' 
                  : ''
              }`} style={{ 
                backgroundColor: selectedGroups.has(group.name) ? group.color : 'transparent',
                borderColor: selectedGroups.has(group.name) ? 'transparent' : '#2A6A9E'
              }}>
                {selectedGroups.has(group.name) && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className="ml-2 text-sm font-medium flex-1" style={{ color: '#2A6A9E' }}>{group.name}</span>
            </label>
            <div 
              className="w-3 h-3 rounded-full ml-2" 
              style={{ backgroundColor: group.color }}
            />
          </div>
        ))}
      </div>
      
      <div className="mt-auto pt-4" style={{ borderTop: '1px solid #2A6A9E' }}>
        <div className="flex space-x-2">
          <button
            onClick={() => BETA_GROUPS.forEach(group => onToggleGroup(group.name))}
            className="px-2 py-1 text-xs rounded transition-colors font-medium flex-1"
            onClick={() => {
              BETA_GROUPS.forEach(group => {
                if (!selectedGroups.has(group.name)) {
                  onToggleGroup(group.name);
                }
              });
            }}
            style={{ 
              backgroundColor: '#f1f5f9', 
              color: '#2A6A9E'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
          >
            Select All
          </button>
          <button
            onClick={() => {
              BETA_GROUPS.forEach(group => {
                if (selectedGroups.has(group.name)) {
                  onToggleGroup(group.name);
                }
              });
            }}
            className="px-2 py-1 text-xs rounded transition-colors font-medium flex-1"
            style={{ 
              backgroundColor: '#f1f5f9', 
              color: '#2A6A9E'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
          >
            Clear All
          </button>
        </div>
      </div>
    </div>
  );
}