import { useState } from "react";
import { useNavigate } from "react-router";

// Import your PNG logo (assuming it's in src/assets/Logo.png)
import logoImg from "../../images/Dairyhub-Dashboard.png"; 

import { loginUser } from "../../firebase/auth";
import { getUserData } from "../../firebase/firestore";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const firebaseUser = await loginUser(email, password);
      const userData = await getUserData(firebaseUser.uid);

      if (!userData) {
        setError("User profile not found.");
        return;
      }

      switch (userData.role) {
        case "OWNER":
          navigate("/owner/dashboard", { replace: true });
          break;

        case "COLLECTOR":
          navigate("/collector/dashboard", { replace: true });
          break;

        default:
          setError("Unknown user role.");
      }
    } catch (err) {
      setError("Invalid email or password.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-sky-600 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-5">
        <div className="flex flex-col items-center text-center mb-4">
          {/* Replaced <Logo /> with standard <img> tag */}
          <img 
            src={logoImg}
            alt="DairyHub Logo" 
            className="h-56 w-56 object-contain" 
          />
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Email</label>
            <input
              type="email"
              className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="owner@dairyhub.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Password</label>
            <input
              type="password"
              className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-100 text-red-700 p-3 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-700 to-sky-600 hover:from-blue-800 hover:to-sky-700 text-white rounded-lg py-3 font-semibold transition disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}