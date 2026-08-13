import { useEffect, useState } from "react";
import { subscribeCurrentTest } from "../firebase/realtime";

/**
 * Subscribe to live RTDB currentTest, returning data only when it belongs
 * to the logged-in collector.
 */
export default function useCollectorLiveData(collectorId) {
  const [liveData, setLiveData] = useState(null);
  const [isMine, setIsMine] = useState(false);

  useEffect(() => {
    if (!collectorId) {
      setLiveData(null);
      setIsMine(false);
      return;
    }

    const unsubscribe = subscribeCurrentTest((reading) => {
      if (!reading) {
        setLiveData(null);
        setIsMine(false);
        return;
      }

      const mine = reading.collectorId === collectorId;
      setLiveData(reading);
      setIsMine(mine);
    });

    return () => unsubscribe();
  }, [collectorId]);

  return { liveData: isMine ? liveData : null, isMine };
}
