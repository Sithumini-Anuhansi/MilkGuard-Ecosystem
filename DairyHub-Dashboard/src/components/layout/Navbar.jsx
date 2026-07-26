import { FiBell, FiMenu, FiUser } from "react-icons/fi";
import { useNavigate } from "react-router";

import useNotifications from "../../hooks/useNotifications";
import { useAuth } from "../../context/AuthContext";

export default function Navbar({ role, onMenuClick }) {
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const goToNotifications = () => {
    navigate(role === "owner" ? "/owner/notifications" : "/collector/notifications");
  };

  const displayName = profile?.name || user?.email || "User";

  return (
    <header className="h-16 bg-white/80 backdrop-blur shadow-sm border-b flex items-center justify-between px-4 sm:px-6 shrink-0">
      {/* Left */}
      <button
        onClick={onMenuClick}
        className="lg:hidden text-2xl text-gray-600 hover:text-gray-900"
        aria-label="Toggle menu"
      >
        <FiMenu />
      </button>

      <div className="hidden lg:block" />

      {/* Right */}
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Notifications */}
        <button className="relative text-gray-600 hover:text-gray-900" onClick={goToNotifications}>
          <FiBell size={22} />

          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* User */}
        <div className="flex items-center gap-2 max-w-[160px] sm:max-w-[220px]">
          <FiUser size={30} className="text-blue-600 shrink-0" />

          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{displayName}</p>
            <p className="text-[11px] text-gray-500 capitalize truncate">{role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
