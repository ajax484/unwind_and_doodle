import React from 'react';

interface NewsletterSectionProps {
  email: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  message: string;
  onEmailChange: (email: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function NewsletterSection({
  email,
  status,
  message,
  onEmailChange,
  onSubmit,
}: NewsletterSectionProps) {
  return (
    <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
          Stay Connected
        </span>
        <h2 className="text-3xl sm:text-4xl font-bold font-heading tracking-tight">
          Join the Mindful Creative Community
        </h2>
        <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          Subscribe for gentle creative prompts, exclusive discounts on new releases, and free printable coloring pages delivered monthly.
        </p>

        <form onSubmit={onSubmit} className="max-w-md mx-auto flex flex-col sm:flex-row gap-3 pt-2">
          <input
            type="email"
            placeholder="Enter your email address..."
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            required
            className="flex-1 px-4 py-3.5 rounded-full bg-slate-800/80 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 transition"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="px-6 py-3.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold shadow-md transition-all hover:shadow-lg disabled:opacity-50"
          >
            {status === 'loading' ? 'Joining...' : 'Subscribe'}
          </button>
        </form>

        {message && (
          <p
            className={`text-sm ${
              status === 'success' ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
