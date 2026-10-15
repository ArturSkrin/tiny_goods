import React from 'react';

/** `**bold**` → <strong>; everything else stays plain text (no HTML injection). */
function inline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
      <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
    ) : (
      part.replace(/\*\*/g, '')
    ),
  );
}

/**
 * Minimal Markdown for product descriptions typed in the admin:
 * lines starting with "- " / "• " / "* " become a bullet list, blank lines split paragraphs.
 */
export function RichText({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let para: string[] = [];
  let list: string[] = [];

  const flushPara = () => {
    if (para.length) {
      blocks.push(
        <p key={blocks.length}>
          {para.map((l, i) => (
            <React.Fragment key={i}>{i > 0 && <br />}{inline(l)}</React.Fragment>
          ))}
        </p>,
      );
      para = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      blocks.push(
        <ul key={blocks.length} className="space-y-1.5">
          {list.map((l, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="mt-[0.6em] w-1.5 h-1.5 rounded-full bg-primary/70 shrink-0" />
              <span>{inline(l)}</span>
            </li>
          ))}
        </ul>,
      );
      list = [];
    }
  };

  for (const raw of text.replace(/\r/g, '').split('\n')) {
    const line = raw.trim();
    const bullet = /^([-•*])\s+(.*)$/.exec(line);
    if (!line) {
      flushPara();
      flushList();
    } else if (bullet) {
      flushPara();
      list.push(bullet[2]!);
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();

  return <div className="space-y-4 leading-relaxed">{blocks}</div>;
}
