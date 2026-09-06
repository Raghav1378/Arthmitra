"use client";
import React from "react";

// Minimal markdown renderer for LLM output: bold, italic, code, headings,
// bullet/numbered lists, links. No dependencies — good enough for chat answers.
// ponytail: swap for react-markdown if tables/complex MD ever matter.

function inline(text: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|₹[\d,]+(?:\.\d+)?)/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const key = `${keyPrefix}-${i++}`;
    if (tok.startsWith("**")) out.push(<strong key={key} className="font-bold text-ink-950">{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`")) out.push(<code key={key} className="font-mono text-[0.85em] bg-ink-900/[0.07] text-ink-900 px-1.5 py-0.5 rounded-md">{tok.slice(1, -1)}</code>);
    else if (tok.startsWith("[")) {
      const mm = tok.match(/\[([^\]]+)\]\(([^)]+)\)/)!;
      out.push(<a key={key} href={mm[2]} target="_blank" rel="noreferrer" className="text-ink-700 underline decoration-gold-500/60 hover:decoration-gold-500">{mm[1]}</a>);
    }
    else if (tok.startsWith("₹")) out.push(<span key={key} className="font-semibold text-ink-950 tabular-nums">{tok}</span>);
    else out.push(<em key={key} className="italic">{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushList = (key: string) => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={key} className={`ml-5 space-y-1.5 my-2 ${list.ordered ? "list-decimal" : "list-disc"} marker:text-gold-600`}>
        {list.items.map((it, i) => <li key={i} className="leading-relaxed">{inline(it, `${key}-${i}`)}</li>)}
      </Tag>
    );
    list = null;
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    const key = `l${idx}`;
    const bullet = line.match(/^\s*[-•*]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const heading = line.match(/^(#{1,4})\s+(.*)$/);

    if (bullet) {
      if (!list || list.ordered) { flushList(`f${idx}`); list = { ordered: false, items: [] }; }
      list.items.push(bullet[1]);
      return;
    }
    if (numbered) {
      if (!list || !list.ordered) { flushList(`f${idx}`); list = { ordered: true, items: [] }; }
      list.items.push(numbered[1]);
      return;
    }
    flushList(`f${idx}`);

    if (!line.trim()) return;
    if (heading) {
      const size = ["text-lg", "text-base", "text-sm", "text-sm"][heading[1].length - 1];
      blocks.push(<p key={key} className={`${size} font-bold font-display text-ink-950 mt-3 mb-1 tracking-tight`}>{inline(heading[2], key)}</p>);
      return;
    }
    if (/^(-{3,}|={3,})$/.test(line.trim())) { blocks.push(<hr key={key} className="my-3 border-ink-900/10" />); return; }
    blocks.push(<p key={key} className="leading-relaxed">{inline(line, key)}</p>);
  });
  flushList("f-end");

  return <div className="space-y-1.5">{blocks}</div>;
}
