import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { HostPage } from "./pages/HostPage";
import { ReceiverPage } from "./pages/ReceiverPage";
import { isLocalhost } from "./api/client";

function AppRoutes() {
  const defaultToHost = isLocalhost();

  return (
    <Routes>
      <Route path="/" element={defaultToHost ? <HostPage /> : <Navigate to="/join" replace />} />
      <Route path="/join" element={<ReceiverPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppContent() {
  const location = useLocation();
  const isHost = location.pathname === "/" && isLocalhost();
  const mainClass = isHost
    ? "max-w-5xl mx-auto px-4 py-8"
    : "max-w-2xl mx-auto px-4 py-8";

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-800 px-4 py-4">
        <div className={isHost ? "max-w-5xl mx-auto" : "max-w-2xl mx-auto"}>
          <h1 className="text-xl font-bold text-slate-100">Transfer File</h1>
          <p className="text-sm text-slate-400">PC ↔ Phone over LAN</p>
        </div>
      </header>
      <main className={mainClass}>
        <AppRoutes />
      </main>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
