import React from "react";
import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../AuthContext.jsx";
import { api, patch } from "../../api.js";
import { relativeTime } from "../../utils/time.js";

export default function NotificationBell() {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const load = useCallback(async () => {
    if (!auth.user) return;
    const data = await api("/notifications");
    setNotifications(data.notifications);
    setUnread(data.unreadCount);
  }, [auth.user]);
  useEffect(() => {
    load().catch(() => {});
    if (!auth.user) return undefined;
    const refresh = () => load().catch(() => {});
    const interval = window.setInterval(refresh, 5000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, [auth.user, load]);
  async function markAllRead() {
    await patch("/notifications/read-all");
    setUnread(0);
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
  }
  async function markRead(notificationId) {
    try {
      await patch(`/notifications/${notificationId}/read`);
      setUnread((prev) => Math.max(0, prev - 1));
      setNotifications((current) => current.map((n) => n._id === notificationId ? { ...n, read: true } : n));
    } catch {}
  }
  return (
    <div className="notification-wrap">
      <button className="icon-btn" title="Notifications" onClick={() => { setOpen(!open); load().catch(() => {}); }}>
        <Bell size={18} />
        {unread > 0 && <span className="notification-count">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && <div className="notification-panel">
        <div className="notification-heading"><b>Notifications</b>{unread > 0 && <button onClick={markAllRead}>Mark all read</button>}</div>
        <div className="notification-list">
          {notifications.map((notification) => (
            <Link className={notification.read ? "" : "unread"} key={notification._id} to={notification.faq ? `/faqs/${notification.faq}` : "/faqs"} onClick={() => { markRead(notification._id); setOpen(false); }}>
              <span>{notification.message}</span>
              <small>{relativeTime(notification.createdAt)}</small>
            </Link>
          ))}
          {!notifications.length && <p>No notifications yet.</p>}
        </div>
      </div>}
    </div>
  );
}

