import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function QRScanner({ onScanSuccess, onClose }) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    try {
      const html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" }, // Use back camera on mobile
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText, decodedResult) => {
          // QR Code successfully scanned
          console.log("QR Code scanned:", decodedText);

          // Extract room code from URL or use direct code
          let roomCode = decodedText;

          // If it's a URL, extract the room parameter
          if (decodedText.includes("room=")) {
            const urlParams = new URLSearchParams(decodedText.split("?")[1]);
            roomCode = urlParams.get("room");
          }

          // If it's a full URL without params, try to extract room code pattern
          if (decodedText.includes("RM-")) {
            const match = decodedText.match(/RM-[A-Z0-9]{6}/);
            if (match) {
              roomCode = match[0];
            }
          }

          stopScanner();
          onScanSuccess(roomCode);
        },
        (errorMessage) => {
          // Scanning error (usually just "No QR code found")
          // We don't need to show this to the user
        }
      );

      setScanning(true);
      setError("");
    } catch (err) {
      console.error("Scanner error:", err);
      setError("Unable to access camera. Please check permissions.");
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      }
    } catch (err) {
      console.error("Error stopping scanner:", err);
    }
    setScanning(false);
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.9)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem"
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "var(--radius-lg)",
          padding: "2rem",
          maxWidth: "500px",
          width: "100%",
          position: "relative"
        }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            background: "var(--gray-200)",
            border: "none",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            cursor: "pointer",
            fontSize: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--gray-700)"
          }}
        >
          ×
        </button>

        <h2 style={{ color: "var(--primary-blue)", marginBottom: "1rem", textAlign: "center" }}>
          Scan QR Code
        </h2>

        {error ? (
          <div
            style={{
              padding: "1rem",
              background: "#fef2f2",
              color: "var(--error)",
              borderRadius: "var(--radius-md)",
              marginBottom: "1rem",
              textAlign: "center"
            }}
          >
            <p style={{ margin: 0 }}>{error}</p>
            <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.9rem" }}>
              Please allow camera access in your browser settings.
            </p>
          </div>
        ) : (
          <>
            <p style={{ textAlign: "center", color: "var(--gray-600)", marginBottom: "1.5rem" }}>
              Point your camera at the QR code
            </p>

            {/* QR Scanner Container */}
            <div
              id="qr-reader"
              ref={scannerRef}
              style={{
                width: "100%",
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
                border: "2px solid var(--primary-teal)"
              }}
            ></div>

            {scanning && (
              <p
                style={{
                  textAlign: "center",
                  color: "var(--success)",
                  marginTop: "1rem",
                  fontSize: "0.9rem"
                }}
              >
                Scanning...
              </p>
            )}
          </>
        )}

        <button
          onClick={handleClose}
          className="btn btn-ghost"
          style={{ width: "100%", marginTop: "1rem" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
