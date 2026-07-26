import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // users/{uid} doc — name, phone, status, etc.
  const [role, setRole] = useState(null);
  // Only set for COLLECTOR users — the business-friendly id ("COL001") read
  // from their collectors/{uid} doc, used to query milkCollections.
  const [collectorId, setCollectorId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const docSnap = await getDoc(doc(db, "users", currentUser.uid));

          if (docSnap.exists()) {
            const data = docSnap.data();
            setProfile(data);

            const userRole = data.role ? data.role.toUpperCase() : null;
            setRole(userRole);

            if (userRole === "COLLECTOR") {
              // collectors/{uid} — same uid as the users doc, a direct get
              // rather than a query, so there's no ambiguity about which
              // record belongs to this login.
              const collectorSnap = await getDoc(doc(db, "collectors", currentUser.uid));
              setCollectorId(collectorSnap.exists() ? collectorSnap.data().collectorId : null);
            } else {
              setCollectorId(null);
            }
          } else {
            console.error("Firestore user doc does not exist!");
            setProfile(null);
            setRole(null);
            setCollectorId(null);
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setProfile(null);
          setRole(null);
          setCollectorId(null);
        }
      } else {
        setUser(null);
        setProfile(null);
        setRole(null);
        setCollectorId(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, role, collectorId, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
