"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { BellItem } from "@/lib/notifications";
import { markNotificationsRead } from "@/app/actions/notifications";

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationBell({
  items,
  unreadCount,
}: {
  items: BellItem[];
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function handleMarkAllRead() {
    await markNotificationsRead();
    router.refresh();
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative"
      >
        <Bell className="size-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-lg border bg-popover shadow-lg">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <p className="text-sm font-medium">Notifications</p>
              {unreadCount > 0 ? (
                <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
                  <CheckCheck className="size-3.5" />
                  Mark all read
                </Button>
              ) : null}
            </div>
            <ul className="max-h-80 divide-y overflow-y-auto">
              {items.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No notifications yet.
                </li>
              ) : (
                items.map((item) => {
                  const inner = (
                    <span>
                      <span className="flex items-center justify-between gap-2">
                        <span className={`text-sm ${item.read ? "" : "font-medium"}`}>
                          {item.title}
                          {!item.read ? (
                            <span className="ml-2 inline-block size-1.5 rounded-full bg-destructive align-middle" />
                          ) : null}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {timeAgo(item.createdAt)}
                        </span>
                      </span>
                      {item.body ? (
                        <span className="block text-xs text-muted-foreground">
                          {item.body}
                        </span>
                      ) : null}
                    </span>
                  );
                  return (
                    <li key={item.id}>
                      {item.link ? (
                        <Link
                          href={item.link}
                          onClick={() => setOpen(false)}
                          className={`block px-3 py-2.5 hover:bg-muted ${item.read ? "" : "bg-muted/40"}`}
                        >
                          {inner}
                        </Link>
                      ) : (
                        <span className="block px-3 py-2.5">{inner}</span>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}