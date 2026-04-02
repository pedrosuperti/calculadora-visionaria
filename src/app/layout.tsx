import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Calculadora de Riqueza | Pedro Superti",
  description:
    "Descubra quanta riqueza esta escondida no seu mercado — e como desbloquear em 90 dias.",
  openGraph: {
    title: "Calculadora de Riqueza | Pedro Superti",
    description:
      "Descubra quanta riqueza esta escondida no seu mercado — e como desbloquear em 90 dias.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
