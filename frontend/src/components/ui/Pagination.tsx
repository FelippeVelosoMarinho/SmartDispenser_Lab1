import React from "react";
import { cn } from "../../lib/utils";

export type PaginationButtonVariant =
  | "page"
  | "prev"
  | "next"
  | "first"
  | "last";

export interface PaginationProps extends React.HTMLAttributes<HTMLDivElement> {
  currentPage: number;
  totalPages: number;
  siblingCount?: number;
  onPageChange: (page: number) => void;
}

export interface PaginationButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: PaginationButtonVariant;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  disabled?: boolean;
  active?: boolean;
}

function getPageNumbers(
  currentPage: number,
  totalPages: number,
  siblingCount: number,
): (number | "...")[] {
  const range = (start: number, end: number) =>
    Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const totalNumbers = siblingCount * 2 + 5;

  if (totalPages <= totalNumbers) {
    return range(1, totalPages);
  }

  const leftSibling = Math.max(currentPage - siblingCount, 1);
  const rightSibling = Math.min(currentPage + siblingCount, totalPages);

  const showLeftDots = leftSibling > 2;
  const showRightDots = rightSibling < totalPages - 1;

  if (!showLeftDots && showRightDots) {
    const leftRange = range(1, totalNumbers - 2);
    return [...leftRange, "...", totalPages];
  }

  if (showLeftDots && !showRightDots) {
    const rightRange = range(totalPages - (totalNumbers - 2) + 1, totalPages);
    return [1, "...", ...rightRange];
  }

  const middleRange = range(leftSibling, rightSibling);
  return [1, "...", ...middleRange, "...", totalPages];
}

const Pagination = React.forwardRef<HTMLDivElement, PaginationProps>(
  (
    {
      currentPage,
      totalPages,
      siblingCount = 1,
      onPageChange,
      className,
      ...props
    },
    ref,
  ) => {
    const pages = getPageNumbers(currentPage, totalPages, siblingCount);

    return (
      <nav
        ref={ref}
        className={cn(
          "flex flex-wrap items-center justify-center gap-1",
          className,
        )}
        aria-label="Pagination"
        {...props}
      >
        <PaginationButton
          variant="prev"
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          disabled={currentPage <= 1}
          aria-label="Previous page"
        />

        <div className="flex items-center gap-1">
          {pages.map((page) =>
            page === "..." ? (
              <span key="ellipsis" className="px-3 py-2 text-sm text-ink-3">
                ...
              </span>
            ) : (
              <PaginationButton
                key={`page-${page}`}
                variant="page"
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
                active={page === currentPage}
              >
                {page}
              </PaginationButton>
            ),
          )}
        </div>

        <PaginationButton
          variant="next"
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
        />
      </nav>
    );
  },
);
Pagination.displayName = "Pagination";

const iconMap: Record<string, string> = {
  prev: "ph-duotone ph-caret-left",
  next: "ph-duotone ph-caret-right",
  first: "ph-duotone ph-chevrons-left",
  last: "ph-duotone ph-chevrons-right",
};

const PaginationButton = React.forwardRef<
  HTMLButtonElement,
  PaginationButtonProps
>(
  (
    {
      variant = "page",
      currentPage,
      totalPages,
      onPageChange,
      disabled = false,
      active = false,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || active;

    const handleClick = () => {
      if (isDisabled || !onPageChange || !currentPage || !totalPages) return;

      let newPage = currentPage;
      switch (variant) {
        case "prev":
          newPage = currentPage - 1;
          break;
        case "next":
          newPage = currentPage + 1;
          break;
        case "first":
          newPage = 1;
          break;
        case "last":
          newPage = totalPages;
          break;
        default:
          if (typeof children === "number") {
            newPage = children;
          }
      }

      if (newPage >= 1 && newPage <= totalPages) {
        onPageChange(newPage);
      }
    };

    const baseStyles = cn(
      "inline-flex items-center justify-center",
      "min-h-[44px] min-w-[44px]",
      "rounded-[--radius-sm]",
      "font-sans text-sm font-medium",
      "transition-all duration-fast",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
    );

    const variantStyles = {
      page: cn(
        "px-3",
        active
          ? "bg-primary text-primary-on"
          : "bg-surface text-ink-2 hover:bg-surface-dim hover:text-ink",
      ),
      prev: cn(
        "px-2",
        isDisabled
          ? "bg-surface-dim text-ink-4 cursor-not-allowed"
          : "bg-surface text-ink-2 hover:bg-surface-dim hover:text-ink",
      ),
      next: cn(
        "px-2",
        isDisabled
          ? "bg-surface-dim text-ink-4 cursor-not-allowed"
          : "bg-surface text-ink-2 hover:bg-surface-dim hover:text-ink",
      ),
      first: cn(
        "px-2",
        isDisabled
          ? "bg-surface-dim text-ink-4 cursor-not-allowed"
          : "bg-surface text-ink-2 hover:bg-surface-dim hover:text-ink",
      ),
      last: cn(
        "px-2",
        isDisabled
          ? "bg-surface-dim text-ink-4 cursor-not-allowed"
          : "bg-surface text-ink-2 hover:bg-surface-dim hover:text-ink",
      ),
    };

    return (
      <button
        ref={ref}
        type="button"
        className={cn(baseStyles, variantStyles[variant], className)}
        onClick={handleClick}
        disabled={isDisabled}
        aria-current={active ? "page" : undefined}
        {...props}
      >
        {iconMap[variant] !== undefined ? (
          <i className={cn("text-[1.125em]", iconMap[variant])} />
        ) : (
          children
        )}
      </button>
    );
  },
);
PaginationButton.displayName = "PaginationButton";

export { Pagination, PaginationButton };
