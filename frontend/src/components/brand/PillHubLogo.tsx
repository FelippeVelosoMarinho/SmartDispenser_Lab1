import { cn } from "../../lib/utils";
import { APP_NAME, APP_LOGO_SRC } from "../../lib/brand";
import "./PillHubLogo.css";

type PillHubLogoSize = "sm" | "md" | "lg";

interface PillHubLogoProps {
  size?: PillHubLogoSize;
  showWordmark?: boolean;
  className?: string;
}

export function PillHubLogo({
  size = "md",
  showWordmark = true,
  className,
}: PillHubLogoProps) {
  return (
    <div
      className={cn("pillhub-logo", `pillhub-logo--${size}`, className)}
      aria-label={APP_NAME}
    >
      <img
        src={APP_LOGO_SRC}
        alt=""
        className="pillhub-logo__mark"
        aria-hidden="true"
      />
      {showWordmark && (
        <span className="pillhub-logo__wordmark">{APP_NAME}</span>
      )}
    </div>
  );
}
