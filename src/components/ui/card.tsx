import * as React from "react"

import { cn } from "@/lib/utils"
import { useLanguage } from "@/contexts/LanguageContext"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-2xl border border-white/20 bg-white/90 backdrop-blur-sm text-card-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { isRTL } = useLanguage()
  return (
    <div 
      ref={ref} 
      className={cn("flex flex-col space-y-1.5 p-6", className)} 
      style={{ textAlign: isRTL ? 'right' : 'left', direction: isRTL ? 'rtl' : 'ltr' }}
      {...props} 
    />
  )
})
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => {
  const { language, isRTL } = useLanguage()
  return (
    <h3
      ref={ref}
      className={cn(
        "text-2xl font-semibold leading-none tracking-tight",
        language === 'ar' ? 'font-arabic' : '',
        className
      )}
      style={{ textAlign: isRTL ? 'right' : 'left' }}
      {...props}
    />
  )
})
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { language, isRTL } = useLanguage()
  return (
    <p
      ref={ref}
      className={cn(
        "text-sm text-muted-foreground",
        language === 'ar' ? 'font-arabic' : '',
        className
      )}
      style={{ textAlign: isRTL ? 'right' : 'left' }}
      {...props}
    />
  )
})
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { isRTL } = useLanguage()
  return (
    <div 
      ref={ref} 
      className={cn("p-6 pt-0", className)} 
      style={{ textAlign: isRTL ? 'right' : 'left', direction: isRTL ? 'rtl' : 'ltr' }}
      {...props} 
    />
  )
})
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { isRTL } = useLanguage()
  return (
    <div 
      ref={ref} 
      className={cn(
        "flex items-center p-6 pt-0",
        isRTL ? "flex-row-reverse" : "flex-row",
        className
      )} 
      style={{ direction: isRTL ? 'rtl' : 'ltr' }}
      {...props} 
    />
  )
})
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }