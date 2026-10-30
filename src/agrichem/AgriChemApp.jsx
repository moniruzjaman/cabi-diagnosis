import "./index.css";
import { LanguageProvider } from "./context/LanguageContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./components/Toast";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthProvider } from "./hooks/useAuth";
import AgriChemAppInner from "./App";

/**
 * AgriChem Guide & Pest Control Database — embedded as a separate tab
 * inside the উদ্ভিদ গোয়েন্দা (Plant Detective) app.
 *
 * Wraps the standalone AgriChem app in:
 *   - LanguageProvider (bn/en bilingual support)
 *   - ThemeProvider (light/dark/system mode, persisted, OS-aware)
 *   - AuthProvider (Google Sign-In + session via httpOnly cookie)
 *   - ToastProvider (global toast notification system)
 *   - ErrorBoundary (graceful recovery UI for render-time errors)
 */
export default function AgriChemApp() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <div className="agrichem-root">
              <ErrorBoundary>
                <AgriChemAppInner />
              </ErrorBoundary>
            </div>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
