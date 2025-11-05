import "../styles/globals.css";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pipecat Flows Editor",
  description: "Visual editor for dynamic Pipecat Flows",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
