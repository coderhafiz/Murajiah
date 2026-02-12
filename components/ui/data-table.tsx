"use client";

/**
 * Opt-out of React Compiler for this component because TanStack Table
 * returns non-memoized functions which causes compiler errors.
 */
"use no memo";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  ColumnPinningState,
  Column,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState, CSSProperties } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Pin, PinOff, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

// Helper to get common pinning styles
const getCommonPinningStyles = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  column: Column<any>,
): CSSProperties => {
  const isPinned = column.getIsPinned();
  const isLastLeftPinned =
    isPinned === "left" && column.getIsLastColumn("left");
  const isFirstRightPinned =
    isPinned === "right" && column.getIsFirstColumn("right");

  return {
    boxShadow: isLastLeftPinned
      ? "-4px 0 4px -4px gray inset"
      : isFirstRightPinned
        ? "4px 0 4px -4px gray inset"
        : undefined,
    left: isPinned === "left" ? `${column.getStart("left")}px` : undefined,
    right: isPinned === "right" ? `${column.getAfter("right")}px` : undefined,
    opacity: isPinned ? 0.95 : 1,
    position: isPinned ? "sticky" : "relative",
    width: column.getSize(),
    zIndex: isPinned ? 1 : 0,
    backgroundColor: isPinned ? "var(--background)" : "transparent", // Ensure pinned columns have background so valid text doesn't show through
  };
};

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({
    left: [],
    right: [],
  });

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: {
      columnPinning,
    },
    onColumnPinningChange: setColumnPinning,
  });

  return (
    <div className="-mx-4 md:mx-0 rounded-none md:rounded-md border-x-0 md:border overflow-x-auto relative">
      <Table className="w-full">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const { column } = header;
                return (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    style={{ ...getCommonPinningStyles(column) }}
                    className={cn(
                      column.getIsPinned() && "bg-background",
                      "group relative px-4",
                    )}
                  >
                    {!header.isPlaceholder && (
                      <div className="flex items-center justify-between gap-2">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {/* Pinning Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity data-[state=open]:opacity-100"
                            >
                              <MoreHorizontal className="h-3 w-3" />
                              <span className="sr-only">Menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem
                              onClick={() => column.pin("left")}
                              disabled={column.getIsPinned() === "left"}
                            >
                              <Pin className="mr-2 h-3.5 w-3.5 rotate-90" />
                              Pin Left
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => column.pin("right")}
                              disabled={column.getIsPinned() === "right"}
                            >
                              <Pin className="mr-2 h-3.5 w-3.5 -rotate-90" />
                              Pin Right
                            </DropdownMenuItem>
                            {column.getIsPinned() && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => column.pin(false)}
                                >
                                  <PinOff className="mr-2 h-3.5 w-3.5" />
                                  Unpin
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => {
                  const { column } = cell;
                  return (
                    <TableCell
                      key={cell.id}
                      style={{ ...getCommonPinningStyles(column) }}
                      className={cn(column.getIsPinned() && "bg-background")}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
