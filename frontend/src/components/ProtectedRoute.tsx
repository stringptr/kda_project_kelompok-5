import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getConfig } from "../lib/db/config";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [hasConfig, setHasConfig] = useState(false);

  useEffect(() => {
    getConfig().then((config) => {
      setHasConfig(config !== null);
      setChecking(false);
    });
  }, []);

  if (checking) return null;
  if (!hasConfig) return <Navigate to="/" replace />;
  return <>{children}</>;
}