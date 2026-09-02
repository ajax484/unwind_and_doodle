import type { Metadata } from 'next';
import { Fredoka, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';

const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-heading',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Unwind & Doodle | Mindful Coloring Books & Journals',
  description:
    'Escape everyday stress and unleash your creativity with our beautifully designed coloring books and customizable journals.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fredoka.variable} ${plusJakartaSans.variable}`}>
      <body className="antialiased min-h-screen flex flex-col bg-[#FFFDF7] text-slate-800">
        <Navbar />
        <main className="flex-grow">{children}</main>
        <Footer />
        <CartDrawer />
      </body>
    </html>
  );
}
