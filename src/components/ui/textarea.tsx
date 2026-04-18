// components/ui/textarea.tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { AlertCircleIcon, CheckCircleIcon } from "lucide-react"

const textareaVariants = cva(
  "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-input focus-visible:ring-ring",
        error: "border-destructive focus-visible:ring-destructive",
        success: "border-green-500 focus-visible:ring-green-500",
        ghost: "border-transparent bg-transparent focus-visible:ring-0",
      },
      size: {
        default: "min-h-[80px]",
        sm: "min-h-[60px] text-xs",
        lg: "min-h-[120px] text-base",
        xl: "min-h-[200px] text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {
  error?: string
  success?: boolean
  showCount?: boolean
  maxLength?: number
  resizable?: boolean
  autoResize?: boolean
  characterCount?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    className, 
    variant, 
    size, 
    error, 
    success, 
    showCount, 
    maxLength, 
    resizable = true,
    autoResize = false,
    characterCount = false,
    value,
    onChange,
    ...props 
  }, ref) => {
    const [textLength, setTextLength] = React.useState(0)
    const textareaRef = React.useRef<HTMLTextAreaElement>(null)

    // Auto-resize logic
    React.useEffect(() => {
      if (autoResize && textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
      }
    }, [value, autoResize])

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setTextLength(e.target.value.length)
      if (onChange) onChange(e)
    }

    // Determine variant based on error/success
    let finalVariant = variant
    if (error) finalVariant = "error"
    else if (success) finalVariant = "success"

    return (
      <div className="space-y-2">
        <textarea
          ref={(node) => {
            // Merge refs
            if (typeof ref === 'function') ref(node)
            else if (ref) ref.current = node
            textareaRef.current = node
          }}
          className={cn(
            textareaVariants({ variant: finalVariant, size }),
            !resizable && "resize-none",
            className
          )}
          maxLength={maxLength}
          value={value}
          onChange={handleChange}
          {...props}
        />
        
        {/* Footer with character count and error message */}
        <div className="flex justify-between items-center text-xs">
          {error ? (
            <span className="text-destructive flex items-center gap-1">
              <AlertCircleIcon className="w-3 h-3" />
              {error}
            </span>
          ) : success ? (
            <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
              <CheckCircleIcon className="w-3 h-3" />
              Valid input
            </span>
          ) : (
            <span className="text-muted-foreground">
              {props.placeholder && `Enter ${props.placeholder.toLowerCase()}`}
            </span>
          )}
          
          {(characterCount || showCount) && maxLength && (
            <span className={cn(
              "text-muted-foreground",
              textLength > maxLength && "text-destructive font-medium"
            )}>
              {textLength} / {maxLength}
            </span>
          )}
        </div>
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }