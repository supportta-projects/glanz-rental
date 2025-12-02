"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Order } from "@/lib/types";

interface VirtualizedTableProps {
  orders: Order[];
  renderRow: (order: Order, index: number) => React.ReactNode;
  height?: number;
  rowHeight?: number;
}

export function VirtualizedTable({ 
  orders, 
  renderRow, 
  height = 400,
  rowHeight = 72, // Thumb-friendly height
}: VirtualizedTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: orders.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 3, // Reduced from 5 to 3 for better performance
    measureElement: undefined, // Use estimateSize for better performance
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div 
      ref={parentRef} 
      style={{ 
        height, 
        overflow: "auto",
        WebkitOverflowScrolling: "touch", // Smooth scrolling on iOS
      }}
      className="rounded-lg border border-gray-200 bg-white"
    >
      <table className="w-full caption-bottom text-sm border-collapse" style={{ tableLayout: "auto" }}>
        <colgroup>
          <col style={{ minWidth: "200px" }} />
          <col style={{ minWidth: "250px" }} />
          <col style={{ minWidth: "120px" }} />
          <col style={{ minWidth: "150px" }} />
          <col style={{ minWidth: "120px" }} />
        </colgroup>
        <thead className="sticky top-0 z-10 bg-[#f1f5f9] border-b border-gray-200">
          <tr className="border-b border-gray-200">
            <th className="h-12 px-4 text-left align-middle font-medium text-gray-700 text-xs uppercase tracking-wider whitespace-nowrap">
              Order & Customer
            </th>
            <th className="h-12 px-4 text-left align-middle font-medium text-gray-700 text-xs uppercase tracking-wider whitespace-nowrap">
              Schedule
            </th>
            <th className="h-12 px-4 text-left align-middle font-medium text-gray-700 text-xs uppercase tracking-wider whitespace-nowrap">
              Status
            </th>
            <th className="h-12 px-4 text-left align-middle font-medium text-gray-700 text-xs uppercase tracking-wider whitespace-nowrap">
              Phone Number
            </th>
            <th className="h-12 px-4 text-left align-middle font-medium text-gray-700 text-xs uppercase tracking-wider whitespace-nowrap">
              Actions
            </th>
          </tr>
        </thead>
        <tbody
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            position: "relative",
          }}
        >
          {virtualItems.map((virtualRow) => {
            const order = orders[virtualRow.index];
            return (
              <tr
                key={order.id}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="border-b border-gray-200 hover:bg-zinc-50 transition-colors bg-white"
              >
                {renderRow(order, virtualRow.index)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

