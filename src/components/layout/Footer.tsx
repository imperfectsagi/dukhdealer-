import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-primary)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-accent)] mb-3">
              Dukh Dealer
            </h3>
            <p className="text-sm text-[var(--color-muted)] leading-relaxed">
              A private space to be heard. Chat, voice, or mystery video — real listening, no labels.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-[var(--color-foreground)] mb-3">Explore</h4>
            <ul className="space-y-2 text-sm text-[var(--color-muted)]">
              <li><Link href="/about" className="hover:text-[var(--color-accent)]">About</Link></li>
              <li><Link href="/services" className="hover:text-[var(--color-accent)]">Sessions</Link></li>
              <li><Link href="/packages" className="hover:text-[var(--color-accent)]">Packages</Link></li>
              <li><Link href="/blog" className="hover:text-[var(--color-accent)]">Blog</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-[var(--color-foreground)] mb-3">Connect</h4>
            <ul className="space-y-2 text-sm text-[var(--color-muted)]">
              <li>
                <a
                  href="https://instagram.com/dukhdealer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--color-accent)]"
                >
                  Instagram
                </a>
              </li>
              <li>
                <a href="mailto:hello@dukhdealer.com" className="hover:text-[var(--color-accent)]">
                  hello@dukhdealer.com
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-[var(--color-border)] text-center text-xs text-[var(--color-muted)]">
          <p>© 2026 Dukh Dealer. A private conversation service.</p>
          <p className="mt-1">
            Not therapy, psychotherapy, psychiatric treatment, medical treatment, diagnosis, or an emergency service.
          </p>
        </div>
      </div>
    </footer>
  );
}
