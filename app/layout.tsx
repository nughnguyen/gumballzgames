import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WebGames - Play Caro, Battleship & Chess Online",
  description: "Modern realtime multiplayer web game platform featuring Caro (Gomoku), Battleship, and Chess. Play with friends instantly!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
