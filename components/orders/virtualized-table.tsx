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
    overscan: 5, // Render 5 extra rows for smooth scrolling
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
      className="rounded-lg border border-gray-200"
    >
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-[#f1f5f9]">
          <TableRow>
            <TableHead>Order & Customer</TableHead>
            <TableHead>Schedule</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Phone Number</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            position: "relative",
          }}
        >
          {virtualItems.map((virtualRow) => {
            const order = orders[virtualRow.index];
            return (
              <TableRow
                key={order.id}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="hover:bg-zinc-50 transition-colors"
              >
                {renderRow(order, virtualRow.index)}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

