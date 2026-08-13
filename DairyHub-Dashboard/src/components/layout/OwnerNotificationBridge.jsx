import useNotificationBridge from "../../hooks/useNotificationBridge";

/** Runs the client-side RTDB → Firestore bridge for all owner pages. */
export default function OwnerNotificationBridge() {
  useNotificationBridge();
  return null;
}
