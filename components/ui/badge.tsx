import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-primary/20 bg-primary/10 text-primary",
        secondary: "border-border bg-secondary text-secondary-foreground",
        destructive: "border-red-500/20 bg-red-500/10 text-red-400",
        success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
        warning: "border-amber-500/20 bg-amber-500/10 text-amber-400",
        outline: "border-border text-foreground",
        hot: "border-red-500/20 bg-red-500/10 text-red-400",
        warm: "border-amber-500/20 bg-amber-500/10 text-amber-400",
        cold: "border-blue-500/20 bg-blue-500/10 text-blue-400",
        running: "border-blue-500/20 bg-blue-500/10 text-blue-400",
        completed: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
        failed: "border-red-500/20 bg-red-500/10 text-red-400",
        partial: "border-amber-500/20 bg-amber-500/10 text-amber-400",
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
