import {
  FiHome,
  FiUsers,
  FiDroplet,
  FiFileText,
  FiBell,
  FiSettings,
  FiClock,
  FiUser,
  FiLogOut,
} from "react-icons/fi";
import { NavLink, useNavigate } from "react-router";

import Logo from "../../images/Dairyhub-Logo.png";
import { logoutUser } from "../../firebase/auth";

export default function Sidebar({ role, open, onClose }) {
  const navigate = useNavigate();

  const ownerMenu = [
    { name: "Dashboard", path: "/owner/dashboard", icon: <FiHome /> },
    { name: "Collectors", path: "/owner/collectors", icon: <FiUsers /> },
    { name: "Milk Collections", path: "/owner/milk-collections", icon: <FiDroplet /> },
    { name: "Reports", path: "/owner/reports", icon: <FiFileText /> },
    { name: "Notifications", path: "/owner/notifications", icon: <FiBell /> },
    { name: "Settings", path: "/owner/settings", icon: <FiSettings /> },
  ];

  const collectorMenu = [
    { name: "Dashboard", path: "/collector/dashboard", icon: <FiHome /> },
    { name: "History", path: "/collector/history", icon: <FiClock /> },
    { name: "Notifications", path: "/collector/notifications", icon: <FiBell /> },
    { name: "Profile", path: "/collector/profile", icon: <FiUser /> },
  ];

  const menu = role === "owner" ? ownerMenu : collectorMenu;

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Failed to log out:", err);
    }
  };

  return (
    <aside
      className={`
        w-64 bg-gradient-to-b from-blue-900 to-blue-950 text-white flex flex-col
        fixed lg:static inset-y-0 left-0 z-40
        transform transition-transform duration-300
        ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
      `}
    >
      {/* Logo Container */}
      <div className="h-16 flex items-center gap-3 border-b border-blue-800/60 px-4">
        {/* Round Image Badge */}
        <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border border-blue-700/50">
          <img
            src={Logo}
            alt="DairyHub Logo"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Text Heading */}
        <div>
          <h1 className="text-3xl font-bold leading-none text-white">
            Dairy<span className="text-sky-300">Hub</span>
          </h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 mt-4 overflow-y-auto">
        {menu.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 mx-3 my-1 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? "bg-white text-blue-900 font-semibold shadow"
                  : "text-blue-100 hover:bg-blue-800/60"
              }`
            }
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t border-blue-800/60 p-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-blue-100 hover:bg-red-600 hover:text-white transition"
        >
          <FiLogOut />
          Logout
        </button>
      </div>
    </aside>
  );
}