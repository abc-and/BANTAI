// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Bantai - Traffic Management",
  description: "Modern Jeepney Traffic Management System",
  icons: {
    icon: "/bantai_logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
      <html lang="en">
          <head>
              {/* Added for Flutter-style Material Icons */}
              <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
          </head>
          <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
              <ThemeProvider>
                  <AuthProvider>{children}</AuthProvider>
              </ThemeProvider>
          </body>
      </html>
  );
}