import React from 'react';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T) => string | number;
  emptyMessage?: string;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  emptyMessage = 'No records found',
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="py-12 text-center text-xs text-slate-500 font-mono">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/[0.06] text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
            {columns.map((col, idx) => (
              <th key={idx} className={`py-3 px-4 ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04] text-xs">
          {data.map((row) => (
            <tr key={keyExtractor(row)} className="hover:bg-white/[0.02] transition-colors">
              {columns.map((col, idx) => (
                <td key={idx} className={`py-3.5 px-4 ${col.className || ''}`}>
                  {col.render ? col.render(row) : (col.accessorKey ? String(row[col.accessorKey]) : null)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
