"use client";

import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";

export function NotificationBell({ topic }: { topic: string }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [popup, setPopup] = useState<any | null>(null);
  const popupTimer = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!topic || topic === "razorrecovery-default") return;

    const eventSource = new EventSource(`https://ntfy.sh/${topic}/sse`);

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.event === "message") {
          const newNotif = {
            id: data.id,
            title: data.title || "New Notification",
            message: data.message,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isVoucher: data.title?.includes("Voucher") || data.message?.includes("Voucher"),
          };
          
          setNotifications(prev => [newNotif, ...prev].slice(0, 10)); // keep last 10
          if (!isOpen) {
            setUnreadCount(prev => prev + 1);
            showPopup(newNotif);
          }
        }
      } catch (err) {
        // ignore parse errors
      }
    };

    return () => {
      eventSource.close();
    };
  }, [topic, isOpen]);

  const showPopup = (notif: any) => {
    setPopup(notif);
    if (popupTimer.current) clearTimeout(popupTimer.current);
    popupTimer.current = setTimeout(() => setPopup(null), 5000);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button 
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setUnreadCount(0);
        }}
        className="relative p-2 text-zinc-600 hover:text-black transition-colors rounded-full hover:bg-zinc-100 focus:outline-none"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-white"></span>
        )}
      </button>

      {/* Pop-up Toast (Apple style) */}
      {popup && !isOpen && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-zinc-200 p-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-lg ${popup.isVoucher ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-black'}`}>
              {popup.isVoucher ? '🎁' : '🔔'}
            </div>
            <div>
              <h4 className="text-xs font-bold text-black">{popup.title}</h4>
              <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug whitespace-pre-wrap">{popup.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-zinc-200 z-50 overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
            <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Notifications</h3>
            {notifications.length > 0 && (
              <button onClick={() => setNotifications([])} className="text-[10px] font-bold text-zinc-500 hover:text-black">Clear</button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 text-xs font-medium">
                No new notifications
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {notifications.map((n) => (
                  <div key={n.id} className="p-4 hover:bg-zinc-50 transition-colors flex gap-3 items-start">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-lg ${n.isVoucher ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-black'}`}>
                      {n.isVoucher ? '🎁' : '🔔'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-xs font-bold text-black truncate">{n.title}</h4>
                        <span className="text-[9px] font-bold text-zinc-400 shrink-0">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1 leading-snug whitespace-pre-wrap">{n.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
