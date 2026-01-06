import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export default function ConnectionStatus({ socket = null }) {
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator !== "undefined") {
      return navigator.onLine;
    }
    return true;
  });
  const [socketConnected, setSocketConnected] = useState(socket?.connected ?? false);
  const [wasOffline, setWasOffline] = useState(false);

  // Detectar estado de conexión del navegador
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Detectar estado de conexión del socket
  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      setSocketConnected(true);
      if (wasOffline) {
        setWasOffline(false);
      }
    };

    const handleDisconnect = () => {
      setSocketConnected(false);
      setWasOffline(true);
    };

    setSocketConnected(socket.connected);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [socket, wasOffline]);

  // Si está online y el socket está conectado, no mostrar nada
  if (isOnline && socketConnected) {
    return null;
  }

  // Determinar el mensaje según el estado
  const getMessage = () => {
    if (!isOnline) {
      return t("connection_lost", "Sin conexión. Verifica tu internet.");
    }
    if (!socketConnected) {
      return t("reconnecting", "Reconectando...");
    }
    return t("connection_lost", "Sin conexión.");
  };

  return (
    <div
      className="connection-status"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <span className="connection-status__icon" aria-hidden="true">
        {!isOnline ? "⚠️" : "⟳"}
      </span>
      <span className="connection-status__message">{getMessage()}</span>
    </div>
  );
}

