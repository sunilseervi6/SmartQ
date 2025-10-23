import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import api from "../api/axios";

export default function QRCodeDisplay({ roomId, roomCode, qrCodeData }) {
  const [showQR, setShowQR] = useState(false);
  const [qrInfo, setQrInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchQRCode = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/rooms/${roomId}/qr`);
      if (response.data.success) {
        setQrInfo(response.data.qrCode);
        setShowQR(true);
      }
    } catch (err) {
      setError("Failed to generate QR code");
      console.error("QR code error:", err);
    }
    setLoading(false);
  };

  const downloadQRCode = () => {
    // Create a canvas to convert SVG to image
    const svg = document.getElementById(`qr-${roomId}`);
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR-${roomCode}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const copyToClipboard = () => {
    const url = qrCodeData || qrInfo?.joinURL;
    if (url) {
      navigator.clipboard.writeText(url);
      alert("Join URL copied to clipboard!");
    }
  };

  return (
    <div style={{ marginTop: "1rem" }}>
      {!showQR ? (
        <button
          onClick={fetchQRCode}
          disabled={loading}
          className="btn btn-primary"
          style={{ fontSize: "0.9rem" }}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="spinner" style={{ width: "1rem", height: "1rem", marginRight: "0" }}></div>
              <span>Generating...</span>
            </div>
          ) : (
            <>
              <span>Show QR Code</span>
            </>
          )}
        </button>
      ) : (
        <div style={{ marginTop: "1rem" }}>
          <div
            style={{
              background: "white",
              padding: "1.5rem",
              borderRadius: "var(--radius-md)",
              border: "2px solid var(--gray-200)",
              textAlign: "center",
            }}
          >
            <h4 style={{ marginBottom: "1rem", color: "var(--gray-700)" }}>
              Scan to Join Queue
            </h4>

            <div style={{ display: "inline-block", padding: "1rem", background: "white" }}>
              <QRCodeSVG
                id={`qr-${roomId}`}
                value={qrCodeData || qrInfo?.joinURL || ""}
                size={200}
                level="H"
                includeMargin={true}
                fgColor="#0F766E"
              />
            </div>

            <div style={{ marginTop: "1rem" }}>
              <p style={{ fontSize: "0.9rem", color: "var(--gray-600)", marginBottom: "0.5rem" }}>
                Room Code: <strong>{roomCode}</strong>
              </p>
              <p style={{ fontSize: "0.8rem", color: "var(--gray-500)", wordBreak: "break-all" }}>
                {qrCodeData || qrInfo?.joinURL}
              </p>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={downloadQRCode}
                className="btn btn-primary"
                style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}
              >
                Download QR
              </button>
              <button
                onClick={copyToClipboard}
                className="btn btn-ghost"
                style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}
              >
                Copy URL
              </button>
              <button
                onClick={() => setShowQR(false)}
                className="btn btn-ghost"
                style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}
              >
                Hide
              </button>
            </div>
          </div>

          {error && (
            <p style={{ color: "var(--error)", fontSize: "0.9rem", marginTop: "0.5rem" }}>
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
