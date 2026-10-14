import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in Application:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl border border-red-500/30 bg-[#161b22] p-8 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 mb-5">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h1 className="font-heading text-xl sm:text-2xl font-black uppercase tracking-wide text-white">
              Ocorreu um imprevisto
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
              O aplicativo encontrou um erro inesperado ao processar os dados. Não se preocupe, seus dados locais continuam preservados.
            </p>
            <div className="mt-6 flex justify-center">
              <button
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 rounded-xl bg-[#22d3ee] px-6 py-2.5 text-xs font-black uppercase text-[#0d1117] shadow-lg shadow-[#22d3ee]/20 hover:bg-[#67e8f9] transition-all cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Recarregar Página</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
