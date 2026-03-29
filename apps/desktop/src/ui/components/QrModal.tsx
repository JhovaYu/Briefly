import { useRef, useEffect } from 'react';
import QRCodeLib from 'qrcode';

export function QrModal({ value, onClose }: { value: string; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvasRef.current) {
      QRCodeLib.toCanvas(canvasRef.current, value, {
        width: Math.min(window.innerWidth, window.innerHeight) * 0.35,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
    }
  }, [value]);

  return (
    <div className="qr-overlay" onClick={onClose}>
      <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
        <canvas ref={canvasRef} />
        <p style={{ marginTop: 16, fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
          Escanea para unirte al espacio
        </p>
        <p style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, fontFamily: 'monospace', wordBreak: 'break-all', textAlign: 'center' }}>
          {value}
        </p>
        <button className="login-btn-secondary" style={{ marginTop: 8 }} onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}
