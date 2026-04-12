import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, ChevronLeft } from 'lucide-react';

interface Props {
  children: ReactNode;
  onBack?: () => void;
  fallbackLabel?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('🔴 [ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 gap-6">
          <div className="bg-red-50 border border-red-100 rounded-3xl p-8 max-w-lg w-full shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                <AlertCircle size={24} className="text-red-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-800">Đã xảy ra lỗi</h2>
                <p className="text-xs text-gray-500">Trang này không thể hiển thị được</p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-red-100 mb-6">
              <p className="text-xs font-mono text-red-700 break-all">
                {this.state.error?.message || 'Unknown error'}
              </p>
              {this.state.errorInfo && (
                <details className="mt-2">
                  <summary className="text-[10px] text-gray-400 cursor-pointer">
                    Chi tiết kỹ thuật
                  </summary>
                  <pre className="text-[9px] text-gray-500 mt-2 overflow-auto max-h-40">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex gap-3">
              {this.props.onBack && (
                <button
                  onClick={this.props.onBack}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft size={16} />
                  Quay lại
                </button>
              )}
              <button
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
              >
                <RefreshCw size={16} />
                Thử lại
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
