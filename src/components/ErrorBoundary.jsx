import { Component } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);

    // Auto-recover from stale deploy chunks & MIME type errors (text/html)
    const errorMsg = String(error?.message || "");
    const isChunkOrMimeError =
      errorMsg.includes("MIME type") ||
      errorMsg.includes("text/html") ||
      errorMsg.includes("dynamically imported module") ||
      errorMsg.includes("Loading chunk") ||
      errorMsg.includes("Failed to fetch") ||
      error?.name === "ChunkLoadError";

    if (isChunkOrMimeError && typeof window !== "undefined") {
      const lastReload = sessionStorage.getItem("meditrack_chunk_reload_ts");
      const now = Date.now();
      // Reload once within 15 seconds to fetch latest deployed bundle
      if (!lastReload || now - Number(lastReload) > 15000) {
        sessionStorage.setItem("meditrack_chunk_reload_ts", String(now));
        window.location.reload();
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Hard refresh on user retry to clear stale browser scripts
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/dashboard";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
          <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-rose-100 dark:border-rose-950/50 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-rose-600 dark:text-rose-400" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              A newer version of the application may have been deployed. Please reload to fetch the latest update.
            </p>
            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 h-11 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw size={14} />
                Reload Application
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 h-11 rounded-lg bg-[#0284c7] text-white text-sm font-semibold hover:bg-[#0369a1] transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home size={14} />
                Go Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
