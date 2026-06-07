import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PropertyOS Operator',
  description: 'Decision-driven operator workspace for property management.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
