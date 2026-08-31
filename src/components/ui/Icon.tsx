import type { ReactNode } from "react";

type IconProps = {
  children: ReactNode;
};

export function Icon({ children }: IconProps) {
  return (
    <span className="icon" aria-hidden="true">
      {children}
    </span>
  );
}
