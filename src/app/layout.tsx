import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SidebarNav } from "./components/SidebarNav";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "RazorRecovery | AI Revenue Recovery",
  description: "Enterprise AI Revenue Recovery Control Plane",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const authContext = await getAuthContext();

  // Pull real merchant/user/store data from DB
  let merchant = null;
  let adminUser = null;
  let primaryStore = null;

  if (authContext) {
    try {
      adminUser = await prisma.user.findUnique({ where: { id: authContext.userId } });
      primaryStore = await prisma.store.findFirst({ where: { merchantId: authContext.merchantId } });
    } catch {
      // non-fatal
    }
  }

  const storeName = primaryStore?.name ?? "Default Store";
  const userName = adminUser?.name ?? adminUser?.email?.split("@")[0] ?? "Admin";
  const userEmail = adminUser?.email ?? "";
  const userInitials = userName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <html lang="en" className="h-full antialiased bg-zinc-50">
      <body className={`${inter.variable} font-sans h-full text-black bg-zinc-50`}>
        {authContext ? (
          <div className="flex h-full min-h-screen">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-zinc-200 flex flex-col">
              <div className="p-6 border-b border-zinc-200">
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="RazorRecovery Logo" className="h-8 w-auto object-contain" />
                  <span className="font-bold text-black tracking-tight ml-2">RazorRecovery</span>
                </div>
                {/* Store Switcher — real store name from DB */}
                <div className="mt-6">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Current Store</div>
                  <div className="w-full px-3 py-2 rounded-md bg-zinc-50 border border-zinc-200 text-xs font-bold text-black">
                    {storeName}
                  </div>
                </div>
              </div>
              
              <SidebarNav />
              
              {/* Real user identity from DB */}
              <div className="p-4 border-t border-zinc-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {userInitials}
                  </div>
                  <div className="text-xs min-w-0">
                    <p className="font-bold text-black truncate">{userName}</p>
                    {userEmail && <p className="text-zinc-500 text-[11px] truncate">{userEmail}</p>}
                  </div>
                </div>
              </div>
            </aside>
            
            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <header className="h-16 border-b border-zinc-200 bg-white flex items-center px-8 justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <h1 className="text-sm font-bold text-black">RazorRecovery Control Plane</h1>
                  <span className="text-[10px] px-2.5 py-0.5 rounded font-bold bg-zinc-100 text-black border border-zinc-300 uppercase tracking-wider">Razorpay Test Mode</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-black bg-zinc-100 px-3 py-1 rounded-full border border-zinc-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse"></span>
                    Webhook Listener Active
                  </span>
                  <a href="/demo" className="text-xs font-bold bg-black text-white px-3.5 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors shadow-2xs">
                    + Test Checkout
                  </a>
                </div>
              </header>
              <div className="flex-1 overflow-auto bg-zinc-50 p-8">
                {children}
              </div>
            </main>
          </div>
        ) : (
          <div className="min-h-screen flex items-center justify-center p-4">
            {children}
          </div>
        )}
      </body>
    </html>
  );
}
