import type { Metadata } from 'next';
import { Montserrat, Cinzel, Alex_Brush } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/context/CartContext';
import CartDrawer from '@/components/CartDrawer';


const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
});

const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-cinzel',
});

// Tipografía exacta al logotipo de E-Aura
const alexBrush = Alex_Brush({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-alex-brush',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'E-Aura — Velas Artesanales & Recuerdos',
  description: 'Velas artesanales y recuerdos hechos a mano',
  icons: {
    icon: [
      {
        url: '/favicon-black.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/favicon-white.png',
        media: '(prefers-color-scheme: dark)',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body
        className={`${alexBrush.variable} ${montserrat.variable} ${cinzel.variable} font-sans antialiased text-stone-800 bg-stone-50`}
      >
        <CartProvider>
          {children}
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}