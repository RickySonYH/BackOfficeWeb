// frontend/src/components/common/Table.tsx

import React, { ReactNode } from 'react';

interface Column<T> {
  key: keyof T;
  label: string;
  render?: (value: any, item: T) => ReactNode;
  width?: string;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  className?: string;
  isLoading?: boolean;
  emptyMessage?: string;
}

function Table<T extends Record<string, any>>({
  data,
  columns,
  className = '',
  isLoading = false,
  emptyMessage = '데이터가 없습니다.'
}: TableProps<T>) {
  const baseClasses = 'min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden';
  
  const tableClasses = `${baseClasses} ${className}`.trim();

  if (isLoading) {
    return (
      <div className={tableClasses}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A8D5E2]"></div>
          <span className="ml-2 text-gray-600">로딩중...</span>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={tableClasses}>
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  if (!columns || columns.length === 0) {
    return (
      <div className={tableClasses}>
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">테이블 구성 정보가 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className={tableClasses}>
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                style={{ width: column.width }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.map((item, index) => (
            <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
              {columns.map((column) => (
                <td
                  key={String(column.key)}
                  className="px-4 py-3 whitespace-nowrap text-sm text-gray-900"
                >
                  {column.render 
                    ? column.render(item[column.key], item)
                    : String(item[column.key] || '-')
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
