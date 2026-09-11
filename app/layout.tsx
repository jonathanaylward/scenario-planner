import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Scenario Planner",
  description: "Local cash flow and budget scenario planner",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-gray-900 min-h-screen`}>
        <nav className="bg-gray-900 text-white p-4 shadow-md">
          <div className="max-w-7xl mx-auto flex gap-6">
            <Link href="/" className="hover:text-blue-300 transition font-medium">Scenario Planner</Link>
            <Link href="/debt" className="hover:text-blue-300 transition font-medium">Debt Amortization Engine</Link>
          </div>
        </nav>
        <main className="pt-6">
          {children}
        </main>
      </body>
    </html>
  );
}