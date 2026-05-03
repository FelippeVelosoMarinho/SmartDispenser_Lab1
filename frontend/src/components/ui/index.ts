/**
 * Pillar Design System — UI Components
 *
 * A complete set of accessible, production-ready components
 * following the Pillar Design System principles.
 *
 * @see README.md for usage guidelines
 */

// Button
export { Button } from "./Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./Button";

// Input
export { Input } from "./Input";
export type { InputProps } from "./Input";

// Card
export { Card, CardHeader, CardContent, CardFooter } from "./Card";
export type {
  CardProps,
  CardHeaderProps,
  CardContentProps,
  CardFooterProps,
  CardVariant,
} from "./Card";

// Toast
export { ToastProvider, useToast } from "./Toast";
export type { Toast, ToastVariant } from "./Toast";

// Alert
export { Alert } from "./Alert";
export type { AlertProps, AlertVariant } from "./Alert";

// Sidebar
export { Sidebar } from "./Sidebar";
export type { SidebarProps, NavItem } from "./Sidebar";

// Table
export {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "./Table";
export type {
  TableProps,
  TableHeaderProps,
  TableHeadProps,
  TableBodyProps,
  TableRowProps,
  TableCellProps,
  TableVariant,
  TableSortDirection,
  TableCellAlignment,
} from "./Table";

// Pagination
export { Pagination, PaginationButton } from "./Pagination";
export type {
  PaginationProps,
  PaginationButtonProps,
  PaginationButtonVariant,
} from "./Pagination";
