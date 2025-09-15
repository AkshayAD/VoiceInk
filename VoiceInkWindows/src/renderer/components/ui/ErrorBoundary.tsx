import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Bug, Send } from 'lucide-react'
import { Button } from './Button'
import { Card, CardContent, CardHeader, CardTitle } from './Card'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  isReporting: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, isReporting: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, isReporting: false }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ errorInfo })
    
    // Log to error reporting service in production
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo)
    }
  }

  reportError = async (error: Error, errorInfo: ErrorInfo) => {
    this.setState({ isReporting: true })
    
    try {
      // In a real app, send to error reporting service
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      console.log('Error reported:', { error, errorInfo })
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError)
    } finally {
      this.setState({ isReporting: false })
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  handleReportBug = () => {
    const { error, errorInfo } = this.state
    if (error && errorInfo) {
      this.reportError(error, errorInfo)
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-xl">Something went wrong</CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <p className="text-center text-muted-foreground">
                An unexpected error occurred. This has been automatically reported to help us improve the app.
              </p>

              {/* Error Details (Development) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium mb-2">
                    Error Details (Development)
                  </summary>
                  <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-32">
                    <div className="text-red-600 font-bold mb-2">
                      {this.state.error.name}: {this.state.error.message}
                    </div>
                    <pre className="whitespace-pre-wrap">
                      {this.state.error.stack}
                    </pre>
                  </div>
                </details>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={this.handleRetry}
                  className="flex-1"
                  variant="outline"
                >
                  <RefreshCw size={16} className="mr-2" />
                  Try Again
                </Button>
                
                <Button
                  onClick={this.handleReportBug}
                  disabled={this.state.isReporting}
                  variant="outline"
                  className="flex-1"
                >
                  {this.state.isReporting ? (
                    <>
                      <Send size={16} className="mr-2 animate-pulse" />
                      Reporting...
                    </>
                  ) : (
                    <>
                      <Bug size={16} className="mr-2" />
                      Report Bug
                    </>
                  )}
                </Button>
              </div>

              {/* Support Info */}
              <div className="pt-4 border-t text-center">
                <p className="text-xs text-muted-foreground">
                  If the problem persists, please contact support with error code: 
                  <span className="font-mono ml-1">
                    {this.state.error?.name}-{Date.now().toString(36)}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Simplified error boundary for smaller components
interface SimpleErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error) => ReactNode
}

interface SimpleErrorBoundaryState {
  error?: Error
}

export class SimpleErrorBoundary extends Component<SimpleErrorBoundaryProps, SimpleErrorBoundaryState> {
  constructor(props: SimpleErrorBoundaryProps) {
    super(props)
    this.state = {}
  }

  static getDerivedStateFromError(error: Error): SimpleErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SimpleErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error)
      }

      return (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertTriangle size={16} />
            <span className="text-sm font-medium">Component Error</span>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">
            This component failed to load. Please try refreshing the page.
          </p>
        </div>
      )
    }

    return this.props.children
  }
}