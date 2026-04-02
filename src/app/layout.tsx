import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Calculadora de Petróleo | Visionários Day 2026",
  description:
    "Descubra o tamanho real do mercado que você está — ou poderia estar — acessando. Método SONDA por Pedro Superti.",
  openGraph: {
    title: "Calculadora de Petróleo | Visionários Day 2026",
    description:
      "Descubra o tamanho real do mercado que você está — ou poderia estar — acessando.",
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
