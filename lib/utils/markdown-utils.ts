/**
 * Quick heuristic check to determine if text looks like Markdown.
 * Detects headers, lists, emphasis, code fences, blockquotes, and tables.
 */
export const looksLikeMarkdown = (t: string | null | undefined): boolean => {
  if (!t) return false;
  return (
    /^#{1,6}\s/m.test(t) || // headers
    /^(\*|-|\+)\s/m.test(t) || // unordered list
    /^\d+\.\s/m.test(t) || // ordered list
    /\*\*[^*\n]+\*\*/m.test(t) || // bold
    /`{1,3}[^`\n]+`{1,3}/m.test(t) || // inline code / fences
    /^>\s/m.test(t) || // blockquote
    /^\|.+\|/m.test(t) // tables
  );
};

export type Variable = {
  id: string;
  label?: string;
  name?: string;
  description?: string | null;
  isMutable?: boolean;
};

export type FunctionItem = {
  id: string;
  name: string;
  description?: string;
};

export type DefaultVariableItem = {
  id: string;
  name: string;
  description?: string;
};

/**
 * Convert Markdown-like text with @/$/#!/! mentions into TipTap-compatible HTML.
 */
export function parseContentWithMentions(
  content: string,
  variables: Variable[] = [],
  functions: FunctionItem[] = [],
  defaultVariables: DefaultVariableItem[] = []
): string {
  if (!content) return "<p></p>";

  // Normalize escaped newlines
  let processed = content.replace(/\\n/g, "\n");

  // --- Mentions ---
  // Regular variables (@)
  processed = processed.replace(/@(\w+)/g, (match, mentionId: string) => {
    const v = variables.find(
      (x) => x.id === mentionId || x.label === mentionId || x.name === mentionId
    );
    if (!v) return match;
    const label = v.label ?? v.name ?? v.id;
    return `<span data-type="mention" data-id="${v.id}" data-label="${label}" class="mention bg-blue-100 text-blue-600 px-1 py-0.5 rounded text-sm font-medium border border-blue-300">@${label}</span>`;
  });

  // Mutable variables ($)
  processed = processed.replace(/\$(\w+)/g, (match, mentionId: string) => {
    const v = variables.find(
      (x) =>
        (x.id === mentionId || x.label === mentionId || x.name === mentionId) &&
        x.isMutable
    );
    if (!v) return match;
    const label = v.label ?? v.name ?? v.id;
    return `<span data-type="mutableMention" data-id="${v.id}" data-label="${label}" class="mutable-mention bg-orange-100 text-orange-600 px-1 py-0.5 rounded text-sm font-medium border border-orange-300">$${label}</span>`;
  });

  // Default variables (#)
  processed = processed.replace(/#(\w+)/g, (match, varId: string) => {
    const dv = defaultVariables.find(
      (x) => x.id === varId || x.name === varId
    );
    if (!dv) return match;
    const label = dv.name ?? dv.id;
    return `<span data-type="defaultVariableMention" data-id="${dv.id}" data-label="${label}" class="default-variable-mention bg-purple-100 text-purple-600 px-1 py-0.5 rounded text-sm font-medium border border-purple-300">#${label}</span>`;
  });

  // Functions (!)
  processed = processed.replace(/!(\w+)/g, (match, functionId: string) => {
    const f = functions.find(
      (x) => x.id === functionId || x.name === functionId
    );
    if (!f) return match;
    const label = f.name ?? f.id;
    return `<span data-type="functionMention" data-id="${f.id}" data-label="${label}" class="function-mention bg-emerald-100 text-emerald-600 px-1 py-0.5 rounded text-sm font-medium border border-emerald-300">!${label}</span>`;
  });

  // --- Code fences ---
  processed = processed.replace(/```([\s\S]*?)```/g, (_m, code: string) => {
    const safe = String(code ?? "")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `<pre><code>${safe}</code></pre>`;
  });

  // --- Headings ---
  processed = processed
    .replace(/^###\s+(.*)$/gim, "<h3>$1</h3>")
    .replace(/^##\s+(.*)$/gim, "<h2>$1</h2>")
    .replace(/^#\s+(.*)$/gim, "<h1>$1</h1>");

  // --- Inline formatting ---
  processed = processed
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`\n]+)`/g, "<code>$1</code>");

  // --- Process blocks ---
  function processBlocks(text: string): string {
    const lines = text.split("\n");
    const result: string[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i] ?? "";

      const listMatch = /^(\s*)(?:[-*+]|\d+\.)\s+(.+)$/.exec(line);
      const blockquoteMatch = /^>\s*(.*)$/.exec(line);

      if (listMatch) {
        const [listHtml, nextIndex] = parseListBlock(lines, i);
        result.push(listHtml);
        i = nextIndex;
      } else if (blockquoteMatch) {
        const [blockquoteHtml, nextIndex] = parseBlockquoteBlock(lines, i);
        result.push(blockquoteHtml);
        i = nextIndex;
      } else {
        result.push(line);
        i++;
      }
    }
    return result.join("\n");
  }

  // --- Blockquote parsing ---
  function parseBlockquoteBlock(
    lines: string[],
    startIndex: number
  ): [string, number] {
    const blockquoteLines: string[] = [];
    let currentIndex = startIndex;

    while (currentIndex < lines.length) {
      const line = lines[currentIndex] ?? "";
      const blockquoteMatch = /^>\s*(.*)$/.exec(line);

      if (blockquoteMatch) {
        blockquoteLines.push(blockquoteMatch[1] ?? "");
        currentIndex++;
      } else if (line.trim() === "") {
        const nextLine = lines[currentIndex + 1];
        if (nextLine && /^>\s*/.test(nextLine)) {
          blockquoteLines.push("");
          currentIndex++;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    const blockquoteContent = blockquoteLines.join("\n").trim();
    return [
      `<blockquote><p>${blockquoteContent}</p></blockquote>`,
      currentIndex,
    ];
  }

  // --- Nested lists ---
  function parseListBlock(
    lines: string[],
    startIndex: number
  ): [string, number] {
    interface ListItem {
      content: string;
      depth: number;
      isOrdered: boolean;
      children: ListItem[];
    }

    const items: ListItem[] = [];
    let currentIndex = startIndex;

    while (currentIndex < lines.length) {
      const line = lines[currentIndex] ?? "";
      const listMatch = /^(\s*)(?:([-*+])|(\d+)\.)\s+(.+)$/.exec(line) ?? [];

      const indent = listMatch[1] ?? "";
      const numberMarker = listMatch[3] ?? "";
      const content = listMatch[4] ?? "";

      if (!content) break;

      const depth = Math.floor(indent.length / 2);
      const isOrdered = numberMarker.length > 0;

      items.push({ content: content.trim(), depth, isOrdered, children: [] });
      currentIndex++;
    }

    // recursive nesting
    const buildNestedStructure = (
      items: ListItem[],
      targetDepth = 0
    ): ListItem[] => {
      const result: ListItem[] = [];
      let i = 0;
      while (i < items.length) {
        const item = items[i]!;
        if (item.depth < targetDepth) break;
        if (item.depth === targetDepth) {
          const newItem = { ...item, children: [] as ListItem[] };
          let j = i + 1;
          const children: ListItem[] = [];
          while (j < items.length && items[j]!.depth > targetDepth) {
            children.push(items[j]!);
            j++;
          }
          if (children.length) {
            newItem.children = buildNestedStructure(children, targetDepth + 1);
          }
          result.push(newItem);
          i = j;
        } else {
          i++;
        }
      }
      return result;
    };

    const nestedItems = buildNestedStructure(items);

    const itemsToHtml = (items: ListItem[]): string => {
      if (!items.length) return "";
      const groups: { isOrdered: boolean; items: ListItem[] }[] = [];
      let currentGroup: { isOrdered: boolean; items: ListItem[] } | null = null;

      for (const item of items) {
        if (!currentGroup || currentGroup.isOrdered !== item.isOrdered) {
          currentGroup = { isOrdered: item.isOrdered, items: [] };
          groups.push(currentGroup);
        }
        currentGroup.items.push(item);
      }

      return groups
        .map((group) => {
          const tag = group.isOrdered ? "ol" : "ul";
          const className = group.isOrdered
            ? "nested-ordered-list"
            : "nested-bullet-list";
          const listItems = group.items
            .map((item) => {
              let itemHtml = `<li class="nested-list-item"><p>${item.content}</p>`;
              if (item.children.length) {
                itemHtml += itemsToHtml(item.children);
              }
              itemHtml += "</li>";
              return itemHtml;
            })
            .join("");
          return `<${tag} class="${className}">${listItems}</${tag}>`;
        })
        .join("");
    };

    return [itemsToHtml(nestedItems), currentIndex];
  }

  processed = processBlocks(processed);

  // --- Paragraphs & line breaks ---
  processed = processed
    .split(/\n{2,}/)
    .map((blk) => {
      const trimmed = blk.trim();
      if (!trimmed) return "";
      const startsWithHTML =
        /^(<h[1-6]\b|<ul\b|<ol\b|<pre\b|<blockquote\b|<li\b)/i.test(trimmed);
      if (startsWithHTML) return trimmed;
      return `<p>${trimmed.replace(/\n/g, "<br>")}</p>`;
    })
    .filter(Boolean)
    .join("");

  return processed || "<p></p>";
}

/**
 * Convert TipTap-compatible HTML back into Markdown.
 */
export function convertToMarkdown(htmlContent: string | null): string {
  if (!htmlContent) return "";

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = htmlContent;

  function nodeToMarkdown(node: Node, depth = 0): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    let result = "";

    switch (tag) {
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6":
        result = "#".repeat(Number(tag[1])) + " " + getText(el) + "\n\n";
        break;
      case "p": {
        const pContent = processChildren(el, depth);
        if (pContent.trim()) result = pContent + "\n\n";
        break;
      }
      case "strong":
      case "b":
        result = `**${getText(el)}**`;
        break;
      case "em":
      case "i":
        result = `*${getText(el)}*`;
        break;
      case "code":
        result = "`" + getText(el) + "`";
        break;
      case "pre": {
        const codeEl = el.querySelector("code");
        result = "```\n" + getText(codeEl ?? el) + "\n```\n\n";
        break;
      }
      case "blockquote": {
        const blockquoteText = getText(el);
        const quotedLines = blockquoteText
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .map((line) => `> ${line}`)
          .join("\n");
        result = quotedLines + "\n\n";
        break;
      }
      case "ul":
        result = processList(el, depth, false) + "\n";
        break;
      case "ol":
        result = processList(el, depth, true) + "\n";
        break;
      case "span": {
        const type = el.getAttribute("data-type");
        const label = el.getAttribute("data-label");
        if (type === "mention" && label) result = "@" + label;
        else if (type === "mutableMention" && label) result = "$" + label;
        else if (type === "defaultVariableMention" && label) result = "#" + label;
        else if (type === "functionMention" && label) result = "!" + label;
        else result = processChildren(el, depth);
        break;
      }
      case "br":
        result = "\n";
        break;
      default:
        result = processChildren(el, depth);
        break;
    }
    return result;
  }

  function processChildren(el: Element, depth: number): string {
    return Array.from(el.childNodes)
      .map((n) => nodeToMarkdown(n, depth))
      .join("");
  }

  function processList(
    listEl: Element,
    depth: number,
    ordered: boolean
  ): string {
    const items: string[] = [];
    let count = 1;
    for (const li of Array.from(listEl.children)) {
      if (li.tagName.toLowerCase() !== "li") continue;
      const marker = ordered ? `${count}. ` : "- ";
      let content = "";
      for (const child of Array.from(li.childNodes)) {
        if (child.nodeType === Node.ELEMENT_NODE) {
          const childEl = child as Element;
          const tag = childEl.tagName.toLowerCase();
          if (tag === "p") {
            content += getText(childEl);
          } else if (tag === "ul" || tag === "ol") {
            content += "\n" + nodeToMarkdown(child, depth + 1);
          } else {
            content += nodeToMarkdown(child, depth);
          }
        } else if (child.nodeType === Node.TEXT_NODE) {
          const text = child.textContent?.trim();
          if (text) content += text;
        }
      }
      items.push("  ".repeat(depth) + marker + content.trim());
      count++;
    }
    return items.join("\n");
  }

  const getText = (el: Element | null): string => el?.textContent ?? "";

  return processChildren(tempDiv, 0)
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\n+|\n+$/g, "")
    .trim();
}
