import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
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

export function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-900 text-slate-100">
        <header className="border-b border-slate-800 px-4 py-4">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-xl font-bold text-slate-100">Transfer File</h1>
            <p className="text-sm text-slate-400">PC → Phone over LAN</p>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-8">
          <AppRoutes />
        </main>
      </div>
    </BrowserRouter>
  );
}
