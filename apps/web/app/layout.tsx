export const metadata = {
  title: "Junior UA",
  description: "Jobs & Events for beginners in Ukraine"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
