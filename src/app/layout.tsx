import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OncoCorr | Translational Oncology Lab',
  description: 'AI-Augmented Multi-Omics Research & Gene Correlation Dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
