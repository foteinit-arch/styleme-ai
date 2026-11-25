import { createPortal } from "react-dom";

/**
 * Renders modal markup straight into <body> so a transformed ancestor
 * (e.g. the pull-to-refresh content wrapper) can't trap position: fixed.
 */
export function portal(children) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

export default function ModalPortal({ children }) {
  return portal(children);
}