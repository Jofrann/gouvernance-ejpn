import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Responsive table component that stacks on mobile instead of scrolling horizontally.
 * Usage:
 * <ResponsiveTable
 *   headers={['Name', 'Email', 'Status']}
 *   rows={[{name: 'John', email: 'john@example.com', status: 'Active'}]}
 *   renderCell={(key, value) => <span>{value}</span>}
 * />
 */
export default function ResponsiveTable({ headers, rows, renderCell, className }) {
  return (
    <>
      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className={cn("w-full text-sm", className)}>
          <thead>
            <tr className="border-b border-white/[0.07]">
              {headers.map((header, idx) => (
                <th
                  key={idx}
                  className="text-left py-3 px-4 text-[11px] text-zinc-500 font-semibold uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                {headers.map((header, colIdx) => (
                  <td key={colIdx} className="py-3 px-4">
                    {renderCell?.(header.toLowerCase().replace(/\s+/g, '_'), row[header.toLowerCase().replace(/\s+/g, '_')], row) || row[header.toLowerCase().replace(/\s+/g, '_')]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-3">
        {rows.map((row, rowIdx) => (
          <div
            key={rowIdx}
            className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 space-y-2"
          >
            {headers.map((header, colIdx) => (
              <div key={colIdx} className="flex items-start justify-between gap-2">
                <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider flex-shrink-0">
                  {header}
                </span>
                <span className="text-sm text-white text-right flex-1">
                  {renderCell?.(header.toLowerCase().replace(/\s+/g, '_'), row[header.toLowerCase().replace(/\s+/g, '_')], row) || row[header.toLowerCase().replace(/\s+/g, '_')]}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}