import type { Metadata } from 'next';
import '../index.css';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'VivoQuest — Better Healthcare, Right at Home',
  description: 'Connect with qualified healthcare professionals, preventive care services, and essential medical equipment through one coordinated Indian healthcare marketplace.',
  keywords: [
    'VivoQuest',
    'Home Healthcare India',
    'Preventive Care',
    'Phlebotomy Home Visit',
    'Physiotherapy at Home',
    'Medical Equipment Rental',
    'ABDM',
    'eSanjeevani Teleconsultation'
  ],
  authors: [{ name: 'VivoQuest Health Technologies' }],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-background text-navy antialiased selection:bg-primary/20 selection:text-primary">
        <Providers>
          <div className="relative min-h-screen flex flex-col">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
