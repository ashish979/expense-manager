"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  UsersRound,
  Receipt,
  ArrowLeftRight,
  Activity,
  User,
  DollarSign,
  Download,
  Share,
} from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/groups", label: "Groups", icon: UsersRound },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/settlements", label: "Settlements", icon: ArrowLeftRight },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/profile", label: "Profile", icon: User },
];

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function useIsIOS() {
  const [isIOS, setIsIOS] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream);
  }, []);
  return isIOS;
}

function useIsStandalone() {
  const [standalone, setStandalone] = useState(false);
  useEffect(() => {
    setStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
    );
  }, []);
  return standalone;
}

export function Sidebar() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const isIOS = useIsIOS();
  const isStandalone = useIsStandalone();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  const showInstallButton = deferredPrompt !== null;
  const showIOSHint = isIOS && !isStandalone && !dismissed;

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 min-h-screen">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-200 dark:border-gray-800">
        <DollarSign className="h-6 w-6 text-emerald-600" />
        <span className="font-bold text-lg">SplitEase</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              prefetch={true}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${active
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Install App prompt - Android/Chrome */}
      {showInstallButton && (
        <div className="px-3 pb-4">
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Download className="h-4 w-4" />
            Install App
          </button>
        </div>
      )}

      {/* Install hint - iOS */}
      {showIOSHint && (
        <div className="px-3 pb-4">
          <div className="relative flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800">
            <Share className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Tap <strong>Share</strong> then <strong>Add to Home Screen</strong> to install
            </span>
            <button
              onClick={() => setDismissed(true)}
              className="absolute top-1 right-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs leading-none p-0.5"
              aria-label="Dismiss"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
