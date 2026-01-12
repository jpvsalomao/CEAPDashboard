import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error boundary component that catches JavaScript errors anywhere in the child
 * component tree and displays a fallback UI instead of crashing the app.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error);
      console.error('Component stack:', errorInfo.componentStack);
    }

    // In production, you could send this to an error reporting service
    // Example: errorReportingService.captureError(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="glass-card p-8 text-center" role="alert" aria-live="assertive">
          <div className="w-16 h-16 mx-auto mb-4 bg-accent-red/20 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-accent-red"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Algo deu errado
          </h2>

          <p className="text-text-secondary mb-4 max-w-md mx-auto">
            Ocorreu um erro inesperado ao renderizar esta secao.
            Tente recarregar a pagina ou voltar para a pagina inicial.
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-accent-teal text-bg-primary rounded-lg font-medium hover:bg-accent-teal/90 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-teal focus:ring-offset-2 focus:ring-offset-bg-primary"
            >
              Tentar novamente
            </button>

            <a
              href="/"
              className="px-4 py-2 bg-bg-secondary text-text-primary rounded-lg font-medium hover:bg-bg-card transition-colors focus:outline-none focus:ring-2 focus:ring-accent-teal focus:ring-offset-2 focus:ring-offset-bg-primary"
            >
              Voltar ao inicio
            </a>
          </div>

          {/* Show error details in development */}
          {import.meta.env.DEV && this.state.error && (
            <details className="mt-6 text-left">
              <summary className="text-sm text-text-muted cursor-pointer hover:text-text-secondary">
                Detalhes do erro (apenas em desenvolvimento)
              </summary>
              <div className="mt-2 p-4 bg-bg-secondary rounded-lg overflow-x-auto">
                <pre className="text-xs text-accent-red font-mono whitespace-pre-wrap">
                  {this.state.error.message}
                </pre>
                {this.state.errorInfo && (
                  <pre className="mt-2 text-xs text-text-muted font-mono whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Smaller error boundary for individual chart sections
 */
export function ChartErrorBoundary({
  children,
  chartName = 'grafico'
}: {
  children: ReactNode;
  chartName?: string;
}) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 mb-3 bg-accent-amber/20 rounded-full flex items-center justify-center">
            <svg
              className="w-6 h-6 text-accent-amber"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <p className="text-sm text-text-secondary">
            Erro ao carregar {chartName}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-xs text-accent-teal hover:underline"
          >
            Recarregar pagina
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Section error boundary for card/section components
 * Smaller and less intrusive than the chart boundary
 */
export function SectionErrorBoundary({
  children,
  sectionName = 'esta secao'
}: {
  children: ReactNode;
  sectionName?: string;
}) {
  return (
    <ErrorBoundary
      fallback={
        <div className="glass-card p-4 border-l-4 border-accent-amber">
          <div className="flex items-center gap-2 text-accent-amber">
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm font-medium">Erro ao carregar {sectionName}</span>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Network/data error boundary with retry functionality
 * For components that fetch data and might fail
 */
interface DataErrorBoundaryState extends ErrorBoundaryState {
  retryCount: number;
}

interface DataErrorBoundaryProps {
  children: ReactNode;
  onRetry?: () => void;
  maxRetries?: number;
}

export class DataErrorBoundary extends Component<DataErrorBoundaryProps, DataErrorBoundaryState> {
  constructor(props: DataErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<DataErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    if (import.meta.env.DEV) {
      console.error('DataErrorBoundary caught an error:', error);
    }
  }

  handleRetry = (): void => {
    const { maxRetries = 3 } = this.props;
    const newCount = this.state.retryCount + 1;

    if (newCount <= maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: newCount,
      });
      this.props.onRetry?.();
    }
  };

  render(): ReactNode {
    const { maxRetries = 3 } = this.props;
    const canRetry = this.state.retryCount < maxRetries;

    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-10 h-10 mb-3 bg-accent-red/20 rounded-full flex items-center justify-center">
            <svg
              className="w-5 h-5 text-accent-red"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-sm text-text-secondary mb-2">
            Erro ao carregar dados
          </p>
          {canRetry ? (
            <button
              onClick={this.handleRetry}
              className="text-xs text-accent-teal hover:underline flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Tentar novamente ({maxRetries - this.state.retryCount} restantes)
            </button>
          ) : (
            <p className="text-xs text-text-muted">
              Nao foi possivel carregar. Recarregue a pagina.
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Error fallback component for React Query errors
 * Use this when displaying data that comes from useQuery hooks
 */
interface QueryErrorFallbackProps {
  error: Error | null;
  isError: boolean;
  refetch?: () => void;
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

export function QueryErrorFallback({
  error,
  isError,
  refetch,
  size = 'md',
  message = 'Erro ao carregar dados',
}: QueryErrorFallbackProps) {
  if (!isError) return null;

  const sizeClasses = {
    sm: 'py-4',
    md: 'py-8',
    lg: 'py-12',
  };

  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`flex flex-col items-center justify-center text-center ${sizeClasses[size]}`}>
      <div className={`${iconSizes[size]} mb-3 bg-accent-red/20 rounded-full flex items-center justify-center`}>
        <svg
          className="w-1/2 h-1/2 text-accent-red"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <p className="text-sm text-text-secondary mb-2">{message}</p>
      {import.meta.env.DEV && error && (
        <p className="text-xs text-text-muted mb-2 max-w-sm truncate">
          {error.message}
        </p>
      )}
      {refetch && (
        <button
          onClick={() => refetch()}
          className="text-xs text-accent-teal hover:underline flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Tentar novamente
        </button>
      )}
    </div>
  );
}

/**
 * Wrapper component that handles loading, error, and success states from React Query
 * Reduces boilerplate in components that use useQuery
 */
interface QueryStateWrapperProps<T> {
  query: {
    data: T | undefined;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    refetch: () => void;
  };
  children: (data: T) => ReactNode;
  loadingFallback?: ReactNode;
  errorMessage?: string;
}

export function QueryStateWrapper<T>({
  query,
  children,
  loadingFallback,
  errorMessage,
}: QueryStateWrapperProps<T>) {
  const { data, isLoading, isError, error, refetch } = query;

  if (isLoading) {
    return loadingFallback ? (
      <>{loadingFallback}</>
    ) : (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-accent-teal border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <QueryErrorFallback
        error={error}
        isError={isError}
        refetch={refetch}
        message={errorMessage}
      />
    );
  }

  if (!data) {
    return null;
  }

  return <>{children(data)}</>;
}
