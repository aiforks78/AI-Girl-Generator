import { SVGProps } from "react";
import { ReactNode } from "react";

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export interface ContextProviderValue {
  [propName: string]: unknown;
}

export interface ContextProviderProps {
  children: ReactNode;
}
