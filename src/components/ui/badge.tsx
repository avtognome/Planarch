import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
        secondary:
          "border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
        destructive:
          "border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
        outline: "text-foreground border border-slate-300 dark:border-slate-700",
        success:
          "border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        info:
          "border border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
        purple:
          "border border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
