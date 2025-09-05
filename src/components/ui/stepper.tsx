import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle } from 'lucide-react';

interface StepperProps {
  activeStep: number;
  children: React.ReactNode;
  alternativeLabel?: boolean;
  className?: string;
}

interface StepProps {
  children: React.ReactNode;
  completed?: boolean;
  disabled?: boolean;
  className?: string;
}

interface StepLabelProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const Stepper: React.FC<StepperProps> = ({
  activeStep,
  children,
  alternativeLabel = false,
  className
}) => {
  const steps = React.Children.toArray(children);
  
  return (
    <div className={cn('flex items-center justify-between w-full', className)}>
      {steps.map((step, index) => {
        const isActive = index === activeStep;
        const isCompleted = index < activeStep;
        
        return (
          <div
            key={index}
            className="flex items-center flex-1"
          >
            <div className="flex flex-col items-center flex-1">
              {React.cloneElement(step as React.ReactElement, {
                isActive,
                isCompleted,
                stepIndex: index
              })}
            </div>
            
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-4',
                  isCompleted ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export const Step: React.FC<StepProps & { isActive?: boolean; isCompleted?: boolean; stepIndex?: number }> = ({
  children,
  completed,
  disabled,
  className,
  isActive,
  isCompleted,
  stepIndex
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center space-y-2',
        disabled && 'opacity-50',
        className
      )}
    >
      {children}
    </div>
  );
};

export const StepLabel: React.FC<StepLabelProps & { isActive?: boolean; isCompleted?: boolean }> = ({
  children,
  icon,
  className,
  isActive,
  isCompleted
}) => {
  return (
    <div className="flex flex-col items-center space-y-2">
      <div
        className={cn(
          'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors',
          isCompleted 
            ? 'bg-primary border-primary text-primary-foreground'
            : isActive 
              ? 'border-primary text-primary bg-background'
              : 'border-muted-foreground/30 text-muted-foreground bg-background',
          className
        )}
      >
        {isCompleted ? (
          <CheckCircle className="h-5 w-5" />
        ) : (
          icon || (
            <span className="text-sm font-medium">
              {/* Step number would go here if not using icons */}
            </span>
          )
        )}
      </div>
      
      <span
        className={cn(
          'text-sm font-medium text-center',
          isActive ? 'text-primary' : 'text-muted-foreground'
        )}
      >
        {children}
      </span>
    </div>
  );
};