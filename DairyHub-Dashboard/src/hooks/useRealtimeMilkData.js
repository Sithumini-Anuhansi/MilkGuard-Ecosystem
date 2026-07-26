import { useEffect, useState } from "react";
import { subscribeCurrentTest } from "../firebase/realtime";

export default function useRealtimeMilkData() {

    const [milkData, setMilkData] = useState(null);

    useEffect(() => {

        const unsubscribe =
            subscribeCurrentTest((data) => {

                setMilkData(data);

            });

        return () => {

            unsubscribe();

        };

    }, []);

    return milkData;

}