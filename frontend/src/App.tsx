import { Routes, Route } from "react-router-dom";
import GenerateKey from "./pages/GenerateKey";
import ProtectedRoute from "./components/ProtectedRoute";
import Upload from "./pages/Upload";
import Download from "./pages/Download";
import "./App.css";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<GenerateKey />} />
      <Route
        path="/upload"
        element={
          <ProtectedRoute>
            <Upload />
          </ProtectedRoute>
        }
      />

      <Route
        path="/download"
        element={
          <ProtectedRoute>
            <Download />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
