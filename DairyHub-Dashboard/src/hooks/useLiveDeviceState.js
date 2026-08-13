import { useEffect, useState } from "react";
import { subscribeLatestStatus, subscribeCurrentCollector } from "../firebase/realtime";

export default function useLiveDeviceState() {
  const [latestStatus, setLatestStatus] = useState(null);
  const [currentCollector, setCurrentCollector] = useState(null);

  useEffect(() => {
    const unsubStatus = subscribeLatestStatus(setLatestStatus);
    const unsubCollector = subscribeCurrentCollector(setCurrentCollector);

    return () => {
      unsubStatus();
      unsubCollector();
    };
  }, []);

  return { latestStatus, currentCollector };
}
