// components/ui/label.tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { InfoIcon } from "lucide-react"

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
  {
    variants: {
      variant: {
        default: "text-foreground",
        muted: "text-muted-foreground",
        error: "text-destructive",
        success: "text-green-600 dark:text-green-400",
        warning: "text-yellow-600 dark:text-yellow-400",
      },
      size: {
        default: "text-sm",
        sm: "text-xs",
        lg: "text-base",
      },
      required: {
        true: "after:content-['*'] after:ml-0.5 after:text-destructive",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      required: false,
    },
  }
)

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement>,
    VariantProps<typeof labelVariants> {
  required?: boolean
  optional?: boolean
  info?: string
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, variant, size, required, optional, children, info, ...props }, ref) => {
    return (
      <div className="flex items-center justify-between mb-2">
        <label
          ref={ref}
          className={cn(labelVariants({ variant, size, required }), className)}
          {...props}
        >
          {children}
          {optional && !required && (
            <span className="text-xs text-muted-foreground ml-1 font-normal">
              (optional)
            </span>
          )}
        </label>
        {info && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <InfoIcon className="w-3 h-3" />
            <span>{info}</span>
          </div>
        )}
      </div>
    )
  }
)
Label.displayName = "Label"

export { Label }