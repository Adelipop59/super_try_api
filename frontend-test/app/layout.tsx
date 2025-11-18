import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Super Try - Tests Produits",
  description: "Plateforme de tests produits rémunérés",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
