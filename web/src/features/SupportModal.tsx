import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { sendSupport } from "../api/endpoints";
import { TextArea } from "../ui/Field";
import { Modal } from "../ui/Modal";
import { ErrorBox } from "../ui/Misc";
import { errMsg } from "../ui/Toast";

export function SupportModal({ onClose }: { onClose: () => void }) {
  const [msg, setMsg] = useState("");
  const send = useMutation({ mutationFn: () => sendSupport(msg.trim()) });

  return (
    <Modal
      title="Reportar un error"
      onClose={onClose}
      footer={
        send.isSuccess ? (
          <button className="btn" onClick={onClose}>Cerrar</button>
        ) : (
          <>
            <button className="btn ghost" onClick={onClose}>Cancelar</button>
            <button className="btn" disabled={msg.trim().length < 3 || send.isPending} onClick={() => send.mutate()}>{send.isPending ? "Enviando..." : "Enviar"}</button>
          </>
        )
      }
    >
      {send.isSuccess ? (
        <div className="alert ok">¡Gracias! Recibimos tu mensaje.</div>
      ) : (
        <>
          <TextArea placeholder="Contanos qué pasó..." value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={4000} rows={5} />
          <ErrorBox>{send.error ? errMsg(send.error) : ""}</ErrorBox>
        </>
      )}
    </Modal>
  );
}
