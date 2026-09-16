import { Fragment, type ReactNode } from "react";

// Renderiza o pouco de markdown que o suporte usa: paragrafos, listas com
// "-"/"*" ou "1.", e **negrito**. Sem HTML cru, sem dependencia nova.

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-foreground">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

type Block =
  | { kind: "p"; lines: string[] }
  | { kind: "ul" | "ol"; items: string[] };

function parse(text: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    const last = blocks[blocks.length - 1];
    const ul = /^\s*[-*•]\s+(.*)$/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);

    if (ul) {
      if (last?.kind === "ul") last.items.push(ul[1]);
      else blocks.push({ kind: "ul", items: [ul[1]] });
    } else if (ol) {
      if (last?.kind === "ol") last.items.push(ol[1]);
      else blocks.push({ kind: "ol", items: [ol[1]] });
    } else if (!line.trim()) {
      // linha em branco fecha o bloco atual
      if (last && last.kind === "p" && last.lines.length) blocks.push({ kind: "p", lines: [] });
    } else if (last?.kind === "p") {
      last.lines.push(line.trim());
    } else {
      blocks.push({ kind: "p", lines: [line.trim()] });
    }
  }
  return blocks.filter((b) => (b.kind === "p" ? b.lines.length > 0 : b.items.length > 0));
}

export function SimpleMarkdown({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className}>
      {parse(text).map((block, i) => {
        if (block.kind === "p") {
          return (
            <p key={i} className="mb-2 last:mb-0 leading-relaxed">
              {block.lines.map((l, j) => (
                <Fragment key={j}>
                  {j > 0 && <br />}
                  {inline(l)}
                </Fragment>
              ))}
            </p>
          );
        }
        const Tag = block.kind === "ul" ? "ul" : "ol";
        return (
          <Tag
            key={i}
            className={`mb-2 last:mb-0 space-y-1 pl-5 ${block.kind === "ul" ? "list-disc" : "list-decimal"}`}
          >
            {block.items.map((item, j) => (
              <li key={j} className="leading-relaxed">
                {inline(item)}
              </li>
            ))}
          </Tag>
        );
      })}
    </div>
  );
}
