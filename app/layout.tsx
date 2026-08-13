import type { Metadata } from 'next';
import { Great_Vibes, Cinzel, Montserrat } from 'next/font/google';
import './globals.css';

const greatVibes = Great_Vibes({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-great-vibes',
});

const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-cinzel',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
});

export const metadata: Metadata = {
  title: 'E-Aura | Velas Artesanales Hechas a Mano',
  description: 'Velas artesanales y recuerdos exclusivos para eventos especiales.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${greatVibes.variable} ${cinzel.variable} ${montserrat.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
