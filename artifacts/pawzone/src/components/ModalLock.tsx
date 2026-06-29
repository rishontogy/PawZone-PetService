import { useEffect } from "react";

export function ModalLock() {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.classList.add("pawzone-modal-open");
    document.body.style.overflow = "hidden";
    return () => {
      document.body.classList.remove("pawzone-modal-open");
      document.body.style.overflow = prev;
    };
  }, []);
  return null;
}
