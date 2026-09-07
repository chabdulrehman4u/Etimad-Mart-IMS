import React from 'react';
import { Calendar } from 'lucide-react';

const DateRangeFilter = ({ startDate, endDate, onStartDateChange, onEndDateChange, onQuickFilter }) => {
  const quickFilters = [
    { label: 'Today', value: 'today' },
    { label: 'Last 7 Days', value: 'week' },
    { label: 'Last 30 Days', value: 'month' },
    { label: 'This Year', value: 'year' },
    { label: 'All Time', value: 'all' }
  ];

  const handleQuickFilter = (value) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let start = new Date();
    let end = new Date();
    
    switch (value) {
      case 'today':
        start = today;
        end = new Date();
        break;
      case 'week':
        start = new Date(today);
        start.setDate(today.getDate() - 7);
        end = new Date();
        break;
      case 'month':
        start = new Date(today);
        start.setDate(today.getDate() - 30);
        end = new Date();
        break;
      case 'year':
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date();
        break;
      case 'all':
        start = null;
        end = null;
        break;
      default:
        break;
    }
    
    onQuickFilter(start, end);
  };

  return (
    <div className="space-y-3">
      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {quickFilters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => handleQuickFilter(filter.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-emerald-50 hover:border-emerald-500 transition-colors"
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Custom Date Range */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="text-gray-400" size={16} />
            </div>
            <input
              type="date"
              value={startDate || ''}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="text-gray-400" size={16} />
            </div>
            <input
              type="date"
              value={endDate || ''}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateRangeFilter;
