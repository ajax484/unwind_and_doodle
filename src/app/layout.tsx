import type { Metadata } from 'next';
import { Fredoka, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import { Toaster } from 'sonner';
import { CartProvider } from '@/context/CartContext';
import MetaPixel from '@/components/analytics/MetaPixel';

const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-fredoka',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://unwindanddoodle.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Unwind & Doodle | Mindful Coloring Books & Journals',
    template: '%s | Unwind & Doodle',
  },
  description:
    'Escape everyday stress and unleash your creativity with our beautifully designed coloring books, customizable journals, and mindful stationery.',
  keywords: [
    'Coloring Books',
    'Custom Journals',
    'Mindfulness',
    'Art Therapy',
    'Stress Relief',
    'Doodling',
    'Stationery',
    'Unwind & Doodle',
  ],
  authors: [{ name: 'Unwind & Doodle' }],
  creator: 'Unwind & Doodle',
  publisher: 'Unwind & Doodle',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/logo.ico' },
      { url: '/logo.png', sizes: '192x192', type: 'image/png' },
      { url: '/logo.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/logo.ico',
    apple: [{ url: '/logo.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Unwind & Doodle',
    title: 'Unwind & Doodle | Mindful Coloring Books & Journals',
    description:
      'Escape everyday stress and unleash your creativity with our beautifully designed coloring books and customizable journals.',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'Unwind & Doodle',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Unwind & Doodle | Mindful Coloring Books & Journals',
    description:
      'Escape everyday stress and unleash your creativity with our beautifully designed coloring books and customizable journals.',
    images: ['/logo.png'],
    creator: '@unwindanddoodle',
  },
  alternates: {
    canonical: '/',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fredoka.variable} ${plusJakartaSans.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${fredoka.variable} ${plusJakartaSans.variable} antialiased min-h-screen flex flex-col bg-bg-default text-text-primary`}>
        <MetaPixel />
        <CartProvider>
          <Navbar />
          <main className="grow">{children}</main>
          <Footer />
          <CartDrawer />
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              className: 'rounded-2xl font-body shadow-card border',
              classNames: {
                title: 'font-heading font-semibold text-[15px]',
                description: 'font-body text-[13px]',
              },
            }}
          />
        </CartProvider>
      </body>
    </html>
  );
}
