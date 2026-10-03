import ListenerAvatar from "@/components/public/ListenerAvatar";
import { LANGUAGE_LABELS, SERVICE_TYPE_LABELS, type Listener } from "@/types";

/** Public listener card: photo, nickname, style, bio, languages and session types. */
export default function ListenerCard({ listener }: { listener: Listener }) {
  const languages = listener.languages.map((l) => LANGUAGE_LABELS[l]).filter(Boolean).join(", ");
  const sessions = listener.modes.map((m) => SERVICE_TYPE_LABELS[m]).filter(Boolean).join(" · ");

  return (
    <article className="flex flex-col items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-center">
      <ListenerAvatar src={listener.avatar} name={listener.nickname} className="h-24 w-24" />
      <h3 className="mt-4 text-lg font-medium">{listener.nickname}</h3>
      {listener.style && (
        <p className="mt-1 text-sm text-[var(--color-accent)]">{listener.style}</p>
      )}
      {listener.bio && (
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">{listener.bio}</p>
      )}
      {languages && (
        <p className="mt-4 text-xs text-[var(--color-muted)]">
          <span className="font-medium text-[var(--color-foreground)]">Languages:</span> {languages}
        </p>
      )}
      {sessions && (
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          <span className="font-medium text-[var(--color-foreground)]">Sessions:</span> {sessions}
        </p>
      )}
    </article>
  );
}
