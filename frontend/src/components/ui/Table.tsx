import React from "react";
import { cn } from "../../lib/utils";

export type TableVariant = "default" | "striped" | "bordered";
export type TableSortDirection = "asc" | "desc" | null;
export type TableCellAlignment = "left" | "center" | "right";

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  variant?: TableVariant;
}

export interface TableHeaderProps
  extends React.HTMLAttributes<HTMLTableSectionElement> {
  sticky?: boolean;
}

export interface TableHeadProps
  extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sortDirection?: TableSortDirection;
  onSort?: () => void;
  align?: TableCellAlignment;
}

export interface TableBodyProps
  extends React.HTMLAttributes<HTMLTableSectionElement> {}

export interface TableRowProps
  extends React.HTMLAttributes<HTMLTableRowElement> {
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}

export interface TableCellProps
  extends React.TdHTMLAttributes<HTMLTableCellElement> {
  align?: TableCellAlignment;
  truncate?: boolean;
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ variant = "default", className, ...props }, ref) => (
    <div className="w-full overflow-x-auto rounded-[--radius-lg] border border-border-subtle">
      <table
        ref={ref}
        className={cn("w-full caption-bottom", className)}
        {...props}
      />
    </div>
  ),
);
Table.displayName = "Table";

const TableHeader: React.FC<TableHeaderProps> = ({
  sticky = false,
  className,
  children,
  ...props
}) => (
  <thead
    className={cn("bg-surface-sunk", sticky && "sticky top-0 z-10", className)}
    {...props}
  >
    {children}
  </thead>
);
TableHeader.displayName = "TableHeader";

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  (
    {
      sortable = false,
      sortDirection = null,
      onSort,
      align = "left",
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const isSorted = sortDirection !== null;

    return (
      <th
        ref={ref}
        className={cn(
          "px-4 py-3 text-left font-sans text-sm font-semibold text-ink-2",
          "border-b border-border-subtle",
          "transition-colors duration-DEFAULT",
          align === "center" && "text-center",
          align === "right" && "text-right",
          sortable && "cursor-pointer select-none",
          sortable && !isSorted && "hover:bg-surface-dim hover:text-ink",
          isSorted && "bg-primary-soft/50 text-primary",
          className,
        )}
        aria-sort={
          isSorted
            ? sortDirection === "asc"
              ? "ascending"
              : "descending"
            : undefined
        }
        onClick={sortable ? onSort : undefined}
        {...props}
      >
        <span className="inline-flex items-center gap-1.5">
          {children}
          {sortable && (
            <i
              className={cn(
                "ph-duotone ph-arrows-down-up text-[0.875em]",
                isSorted && "text-primary",
              )}
            />
          )}
        </span>
      </th>
    );
  },
);
TableHead.displayName = "TableHead";

const TableBody: React.FC<TableBodyProps> = ({
  className,
  children,
  ...props
}) => (
  <tbody className={cn("divide-y divide-border-subtle", className)} {...props}>
    {children}
  </tbody>
);
TableBody.displayName = "TableBody";

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  (
    {
      selectable = false,
      selected = false,
      onSelect,
      className,
      children,
      ...props
    },
    ref,
  ) => (
    <tr
      ref={ref}
      className={cn(
        "bg-surface transition-colors duration-fast",
        "hover:bg-surface-dim",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        selectable && "cursor-pointer",
        selected && "bg-primary-soft",
        className,
      )}
      aria-selected={selectable ? selected : undefined}
      onClick={selectable ? onSelect : undefined}
      {...props}
    >
      {children}
    </tr>
  ),
);
TableRow.displayName = "TableRow";

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  (
    { align = "left", truncate = false, className, children, ...props },
    ref,
  ) => (
    <td
      ref={ref}
      className={cn(
        "px-4 py-3 text-sm text-ink-2",
        "font-sans",
        align === "center" && "text-center",
        align === "right" && "text-right",
        truncate && "max-w-[200px] truncate",
        className,
      )}
      {...props}
    >
      {children}
    </td>
  ),
);
TableCell.displayName = "TableCell";

export { Table, TableHeader, TableHead, TableBody, TableRow, TableCell };
