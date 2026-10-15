import { useEffect, useRef, useState } from "react";
import { IoBarcodeOutline } from "react-icons/io5";
import { Field } from "../ui/Field";
import { Modal } from "../ui/Modal";

// BarcodeDetector todavía no está en los tipos de TypeScript
type Detector = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
declare const BarcodeDetector: { new (o?: { formats: string[] }): Detector };

export const scannerSupported = () => typeof window !== "undefined" && "BarcodeDetector" in window && !!navigator.mediaDevices?.getUserMedia;

/** Escáner con la cámara (si el navegador soporta BarcodeDetector) y entrada manual como alternativa. */
export function Scanner({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [manual, setManual] = useState("");
  const [status, setStatus] = useState(scannerSupported() ? "Iniciando cámara..." : "Tu navegador no soporta escanear con la cámara. Escribí el código.");

  useEffect(() => {
    if (!scannerSupported()) return;
    let stream: MediaStream | null = null;
    let stop = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (stop || !video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        setStatus("Apuntá al código de barras");
        const det = new BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
        const tick = async () => {
          if (stop || !video.current) return;
          try {
            const found = await det.detect(video.current);
            if (found[0]?.rawValue) { onCode(found[0].rawValue); return; }
          } catch { /* frame no listo */ }
          setTimeout(tick, 250);
        };
        tick();
      } catch {
        setStatus("No pudimos usar la cámara (permiso denegado). Escribí el código.");
      }
    })();
    return () => { stop = true; stream?.getTracks().forEach((t) => t.stop()); };
  }, [onCode]);

  return (
    <Modal title="Escanear código de barras" onClose={onClose}>
      {scannerSupported() && <video ref={video} className="scanner" playsInline muted />}
      <p className="muted" style={{ textAlign: "center" }}>{status}</p>
      <form onSubmit={(e) => { e.preventDefault(); if (manual.trim().length >= 5) onCode(manual.trim()); }}>
        <Field icon={<IoBarcodeOutline size={20} />} inputMode="numeric" placeholder="O escribí el código (EAN)" value={manual} onChange={(e) => setManual(e.target.value.replace(/\D/g, ""))} />
        <button className="btn" disabled={manual.trim().length < 5}>Buscar</button>
      </form>
    </Modal>
  );
}
