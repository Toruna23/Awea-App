import "./globals.css";

export const metadata = {
  title: "Awea",
  description: "Digital menus, rewards, and retargeting for restaurants.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-body">{children}</body>
    </html>
  );
}