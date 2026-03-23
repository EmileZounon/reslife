"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, updateDoc, orderBy, limit, Timestamp } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Bell } from "lucide-react";
import Link from "next/link";
import type { Notification } from "@/types";

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    async function loadNotifications() {
      const db = getFirebaseDb();
      const snap = await getDocs(
        query(
          collection(db, "notifications"),
          where("userId", "==", user!.id),
          orderBy("sentAt", "desc"),
          limit(10)
        )
      );

      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification));
      setNotifications(items);
      setUnreadCount(items.filter((n) => !n.read).length);
    }

    loadNotifications();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkRead = async (notifId: string) => {
    const db = getFirebaseDb();
    await updateDoc(doc(db, "notifications", notifId), {
      read: true,
      readAt: Timestamp.now(),
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const typeHref: Record<string, string> = {
    ANNOUNCEMENT: "/announcements",
    MAINTENANCE: "/maintenance",
    INCIDENT: "/incidents",
    SYSTEM: "/",
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-gray-100"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-lg border z-50 max-h-96 overflow-y-auto">
            <div className="p-3 border-b">
              <p className="font-semibold text-sm">Notifications</p>
            </div>
            {notifications.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center">No notifications</div>
            ) : (
              notifications.map((notif) => (
                <Link
                  key={notif.id}
                  href={notif.relatedId ? `${typeHref[notif.type]}/${notif.relatedId}` : typeHref[notif.type]}
                  onClick={() => {
                    if (!notif.read) handleMarkRead(notif.id);
                    setOpen(false);
                  }}
                  className={`block p-3 border-b hover:bg-gray-50 ${
                    !notif.read ? "bg-blue-50" : ""
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.body}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {notif.sentAt?.toDate?.()?.toLocaleString() || ""}
                  </p>
                </Link>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
