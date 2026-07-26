import Notifications from "../../components/notifications/Notifications";
import useNotifications from "../../hooks/useNotifications";

export default function OwnerNotifications() {
  const { notifications } = useNotifications();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Notifications</h1>

      <div className="bg-white shadow rounded-xl p-6">
        <Notifications notifications={notifications} />
      </div>
    </div>
  );
}
