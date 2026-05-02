import Link from 'next/link';
import {
  ArrowRight,
  Sparkles,
  Code,
  Music,
  Languages,
  Palette,
  Zap,
  CheckCircle2,
  MessageSquare,
  Award,
} from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-bg text-fg">
      <nav className="sticky top-0 z-50 bg-bg/80 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between h-14 items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <Zap className="text-white w-4 h-4" />
            </div>
            <span className="text-lg font-bold">SkillBridge</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="#how" className="hidden sm:inline text-muted hover:text-fg transition-colors">
              How it works
            </Link>
            <Link href="/login" className="btn-ghost">
              Sign in
            </Link>
            <Link href="/register" className="btn-primary !py-2 !px-4">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-24 pb-16 text-center">
          <span className="chip mb-6 inline-flex">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            AI-powered skill matching
          </span>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
            Teach what you love.
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent to-brand-700">
              Learn what you need.
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-muted mb-8 leading-relaxed">
            Join a community of experts swapping skills directly. No money — just value for value,
            matched by AI based on what you teach and what you want to learn.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register" className="btn-primary flex items-center gap-2 text-base">
              Start swapping <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="#how" className="btn-secondary text-base">
              How it works
            </Link>
          </div>

          <div className="mt-16 flex flex-wrap justify-center gap-x-10 gap-y-3 text-sm text-muted">
            <span className="flex items-center gap-2"><Code className="w-4 h-4" /> Development</span>
            <span className="flex items-center gap-2"><Palette className="w-4 h-4" /> Design</span>
            <span className="flex items-center gap-2"><Languages className="w-4 h-4" /> Languages</span>
            <span className="flex items-center gap-2"><Music className="w-4 h-4" /> Music</span>
          </div>
        </section>

        <section id="how" className="bg-surface-2 border-y border-border">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">A smarter way to grow</h2>
              <p className="text-muted max-w-xl mx-auto">
                SkillBridge handles the matchmaking, scheduling, and review so you can focus on the craft.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  title: 'AI matchmaking',
                  desc: 'Gemini embeddings score every offer against your goals — only meaningful matches reach you.',
                  icon: Sparkles,
                },
                {
                  title: 'Real-time sessions',
                  desc: 'Built-in chat, scheduling, and meeting links keep your exchange moving across time zones.',
                  icon: MessageSquare,
                },
                {
                  title: 'AI-summarized takeaways',
                  desc: 'Each session ends with a streamed AI summary you can revisit and share.',
                  icon: Award,
                },
              ].map((f) => (
                <div key={f.title} className="surface border rounded-2xl p-6 hover:shadow-md transition-all">
                  <div className="w-10 h-10 bg-accent-soft text-accent rounded-lg flex items-center justify-center mb-4">
                    <f.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="surface border rounded-2xl p-8 md:p-12 text-center space-y-4">
            <CheckCircle2 className="w-10 h-10 text-accent mx-auto" />
            <h2 className="text-2xl md:text-3xl font-bold">Ready to swap your first skill?</h2>
            <p className="text-muted max-w-xl mx-auto">
              List one thing you teach, one thing you want to learn — we'll find your match.
            </p>
            <Link href="/register" className="btn-primary inline-flex items-center gap-2">
              Create your free account <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-muted text-sm">
            <Zap className="w-4 h-4 text-accent" />
            <span className="font-bold text-fg">SkillBridge</span>
            <span>© 2026</span>
          </div>
          <div className="flex gap-6 text-sm text-muted">
            <Link href="#">Terms</Link>
            <Link href="#">Privacy</Link>
            <Link href="#">GitHub</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
