import React from "react";
import { cn } from "../../lib/utils";
import "./Card.css";

export type CardVariant = "default" | "elevated" | "interactive";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visual variant of the card */
  variant?: CardVariant;
  /** Children elements (typically CardHeader, CardContent, CardFooter) */
  children: React.ReactNode;
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional eyebrow text above the title */
  eyebrow?: string;
  /** Title text */
  title?: string;
  /** Children elements (for custom header content) */
  children?: React.ReactNode;
}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Align footer content (left, center, right) */
  align?: "left" | "center" | "right";
  children: React.ReactNode;
}

/**
 * Card container component following Pillar Design System principles
 *
 * - Surface background with subtle border
 * - 18px border radius for friendliness
 * - Soft shadow for elevation
 * - Generous padding and spacing
 * - Interactive variant for clickable cards
 *
 * @example
 * <Card variant="elevated">
 *   <CardHeader eyebrow="Up next" title="Metformin · 500 mg" />
 *   <CardContent>
 *     <p>Take 1 tablet with breakfast</p>
 *   </CardContent>
 *   <CardFooter>
 *     <Button>Log this dose</Button>
 *   </CardFooter>
 * </Card>
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = "default", children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("pillar-card", `pillar-card--${variant}`, className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = "Card";

/**
 * Card header with optional eyebrow and title
 */
export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ eyebrow, title, children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("pillar-card__header", className)}
        {...props}
      >
        {eyebrow && <div className="pillar-card__eyebrow">{eyebrow}</div>}
        {title && <h3 className="pillar-card__title">{title}</h3>}
        {children}
      </div>
    );
  },
);

CardHeader.displayName = "CardHeader";

/**
 * Card content area with proper spacing
 */
export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("pillar-card__content", className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);

CardContent.displayName = "CardContent";

/**
 * Card footer for actions or metadata
 */
export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ align = "right", children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "pillar-card__footer",
          `pillar-card__footer--${align}`,
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

CardFooter.displayName = "CardFooter";
