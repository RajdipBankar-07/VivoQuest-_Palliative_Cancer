import React from 'react';
import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading healthcare information...',
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-card border border-border/60 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="relative w-12 h-12 mb-4">
        <div className="w-12 h-12 rounded-full border-3 border-primary/20 border-t-primary animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2.5 h-2.5 bg-secondary rounded-full animate-ping" />
        </div>
      </div>
      <p className="text-sm font-medium text-navy/80">{message}</p>
      <span className="sr-only">Loading</span>
    </div>
  );
};

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  actionHref?: string;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionText,
  onAction,
  actionHref,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-white border border-border shadow-card ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-background border border-border/60 flex items-center justify-center text-primary mb-4 shadow-sm">
        {icon || <Inbox size={28} className="text-muted-foreground" />}
      </div>
      <h3 className="text-lg font-bold text-navy mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionText && (
        actionHref ? (
          <Button href={actionHref} variant="primary" size="md">
            {actionText}
          </Button>
        ) : (
          <Button onClick={onAction} variant="primary" size="md">
            {actionText}
          </Button>
        )
      )}
    </div>
  );
};

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Unable to Load Data',
  message = 'A temporary network or service error occurred. Please try again.',
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-2xl bg-red-50/50 border border-destructive/20 text-navy ${className}`}
      role="alert"
    >
      <div className="w-12 h-12 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mb-3.5">
        <AlertTriangle size={24} />
      </div>
      <h3 className="text-base font-bold text-navy mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-sm mb-5 leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw size={14} />}
          className="border-destructive/30 hover:bg-white text-destructive hover:text-destructive"
        >
          Try Again
        </Button>
      )}
    </div>
  );
};
