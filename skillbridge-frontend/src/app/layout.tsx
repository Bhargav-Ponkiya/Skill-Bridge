import type { Metadata } from 'next';
import Script from 'next/script';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { ApolloWrapper } from '@/components/providers/ApolloWrapper';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'SkillBridge — Swap skills, grow together',
  description:
    'A community platform for skill-for-skill exchange. Teach what you know, learn what you need. Powered by AI matchmaking.',
  keywords: ['skill exchange', 'learning', 'mentorship', 'community', 'AI matching'],
};

const themeBootstrap = `
(function () {
  try {
    var raw = localStorage.getItem('skillbridge-theme');
    var mode = 'system';
    if (raw) {
      try { mode = (JSON.parse(raw).state || {}).mode || 'system'; } catch (e) {}
    }
    var resolved = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    if (resolved === 'dark') document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = resolved;
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <Script id="theme-bootstrap" strategy="beforeInteractive">
          {themeBootstrap}
        </Script>
      </head>
      <body className={cn(inter.className, 'min-h-screen bg-bg text-fg')}>
        <Toaster position="top-center" richColors closeButton />
        <ThemeProvider>
          <ApolloWrapper>
            <div className="relative min-h-screen">
              <div className="fixed inset-0 -z-10 pointer-events-none bg-[radial-gradient(60%_60%_at_50%_0%,rgb(var(--accent-soft)/0.5),transparent)]" />
              {children}
            </div>
          </ApolloWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
