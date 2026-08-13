import { useEffect, useRef } from "react";

/**
 * @deprecated Replaced by Cloud Function `onMilkTestCreated`.
 * RTDB milkTests/{testId} triggers server-side Firestore persistence,
 * notifications, and WhatsApp alerts — no browser required.
 *
 * This hook is kept for reference only and should not be mounted.
 */
export default function useAutoLogCollection() {
  const warned = useRef(false);

  useEffect(() => {
    if (!warned.current) {
      console.warn(
        "useAutoLogCollection is deprecated. Milk test logging is handled by Cloud Functions."
      );
      warned.current = true;
    }
  }, []);
}
