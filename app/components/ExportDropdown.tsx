'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, DocumentIcon, TableCellsIcon, CalendarIcon, ClockIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';

interface ExportDropdownProps {
  onExport: (format: 'pdf' | 'csv', range: 'current' | 'full' | 'custom') => void;
}

export const ExportDropdown: React.FC<ExportDropdownProps> = ({ onExport }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = (format: 'pdf' | 'csv', range: 'current' | 'full' | 'custom') => {
    onExport(format, range);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-[#34A853] text-white rounded-md hover:bg-[#2D9348] transition-colors font-medium text-sm min-h-[44px] w-full sm:w-auto"
      >
        <DocumentIcon className="w-4 h-4" />
        <span className="truncate">Export Timeline</span>
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 sm:right-0 left-0 sm:left-auto mt-1 w-full sm:w-[280px] bg-white rounded-lg shadow-lg py-2 z-50 border border-gray-200">
          <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
            Export Options
          </div>

          <button
            onClick={() => handleExport('pdf', 'current')}
            className="w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 hover:bg-gray-50 text-left min-h-[44px] sm:min-h-0"
          >
            <DocumentIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900">Export as PDF</div>
              <div className="text-xs text-gray-500">Formatted document with timeline</div>
            </div>
            <span className="hidden sm:block text-xs bg-gray-100 px-2 py-1 rounded text-gray-500 font-mono">⌘P</span>
          </button>

          <button
            onClick={() => handleExport('csv', 'current')}
            className="w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 hover:bg-gray-50 text-left min-h-[44px] sm:min-h-0"
          >
            <TableCellsIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900">Export as CSV</div>
              <div className="text-xs text-gray-500">Spreadsheet format for analysis</div>
            </div>
            <span className="hidden sm:block text-xs bg-gray-100 px-2 py-1 rounded text-gray-500 font-mono">⌘E</span>
          </button>

          <div className="h-px bg-gray-200 my-2" />

          <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
            Export Range
          </div>

          <button
            onClick={() => handleExport('pdf', 'current')}
            className="w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 hover:bg-gray-50 text-left min-h-[44px] sm:min-h-0"
          >
            <ClockIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900">Current View</div>
              <div className="text-xs text-gray-500">Last 30 days of timeline</div>
            </div>
          </button>

          <button
            onClick={() => handleExport('pdf', 'full')}
            className="w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 hover:bg-gray-50 text-left min-h-[44px] sm:min-h-0"
          >
            <CalendarIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900">Full Timeline</div>
              <div className="text-xs text-gray-500">All project history</div>
            </div>
          </button>

          <button
            onClick={() => handleExport('pdf', 'custom')}
            className="w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 hover:bg-gray-50 text-left min-h-[44px] sm:min-h-0"
          >
            <AdjustmentsHorizontalIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900">Custom Range</div>
              <div className="text-xs text-gray-500">Select specific dates</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}; 