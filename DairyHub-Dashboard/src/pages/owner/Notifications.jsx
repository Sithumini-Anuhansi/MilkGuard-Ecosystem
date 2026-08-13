import Notifications from "../../components/notifications/Notifications";
import useNotifications from "../../hooks/useNotifications";
import useMarkNotificationsReadOnView from "../../hooks/useMarkNotificationsReadOnView";

export default function OwnerNotifications() {
  const { notifications } = useNotifications({ role: "OWNER" });
  useMarkNotificationsReadOnView(notifications);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Notifications</h1>

      <div className="bg-white shadow rounded-xl p-6">
        <Notifications notifications={notifications} role="OWNER" />
      </div>
    </div>
  );
}
