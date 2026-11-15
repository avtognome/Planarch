import * as React from "react";
import { cn } from "@/lib/utils";

export interface SliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue"> {
  value?: number[] | number;
  defaultValue?: number[] | number;
  onValueChange?: (value: number[]) => void;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value, defaultValue, min = 0, max = 100, step = 1, onValueChange, onChange, ...props }, ref) => {
    const numVal = Array.isArray(value)
      ? (value[0] ?? 0)
      : typeof value === "number"
      ? value
      : Array.isArray(defaultValue)
      ? (defaultValue[0] ?? 0)
      : typeof defaultValue === "number"
      ? defaultValue
      : 0;
    const minNum = Number(min) || 0;
    const maxNum = Number(max) || 100;
    const pct = maxNum > minNum ? Math.min(100, Math.max(0, ((numVal - minNum) / (maxNum - minNum)) * 100)) : 0;

    return (
      <div className={cn("shadcn-slider-wrap relative flex w-full touch-none select-none items-center", className)}>
        <div className="shadcn-slider-track">
          <div className="shadcn-slider-range" style={{ width: `${pct}%` }} />
        </div>
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          value={numVal}
          onChange={(e) => {
            onChange?.(e);
            onValueChange?.([Number(e.target.value)]);
          }}
          className="shadcn-slider-input"
          {...props}
        />
      </div>
    );
  }
);
Slider.displayName = "Slider";

export { Slider };
