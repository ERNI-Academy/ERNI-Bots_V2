"use client";

import { Skeleton, SkeletonItem, TableBody, TableCell, TableRow } from "@fluentui/react-components";

interface TableSkeletonProps {
  rows: number;
  columns: number;
}

/** Placeholder `<TableBody>` rows shown while data loads. Render inside a Fluent `<Table>`. */
export function TableSkeleton({ rows, columns }: TableSkeletonProps) {
  return (
    <TableBody aria-busy="true" aria-label="Cargando">
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: columns }).map((__, j) => (
            <TableCell key={j}>
              <Skeleton aria-hidden>
                <SkeletonItem size={12} style={{ maxWidth: 120 }} />
              </Skeleton>
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
}
