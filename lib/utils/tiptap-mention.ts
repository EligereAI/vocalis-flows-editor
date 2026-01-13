import Mention from "@tiptap/extension-mention";

export type MentionItem = {
  id: string;
  label?: string;
  name?: string;
  description?: string | null;
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

export function buildMentionExtension(
  getVariables: () => MentionItem[],
  getMutableVariables: () => MentionItem[],
  getFunctions: () => FunctionItem[],
  getDefaultVariables: () => DefaultVariableItem[]
) {
  let menuEl: HTMLDivElement | null = null;
  let items: (MentionItem | FunctionItem | DefaultVariableItem)[] = [];
  let selected = 0;
  let command: ((args: { id: string; label?: string }) => void) | null = null;
  let currentChar = "@";

  // cache caret rect
  let getClientRect: (() => DOMRect | null) | null = null;

  const destroy = () => {
    if (menuEl?.parentNode) menuEl.parentNode.removeChild(menuEl);
    menuEl = null;
    items = [];
    selected = 0;
    command = null;
    getClientRect = null;
  };

  const ensureMenu = () => {
    if (menuEl) return;
    menuEl = document.createElement("div");
    menuEl.className =
      "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg p-1 max-w-xs max-h-48 overflow-y-auto z-50";
    menuEl.style.position = "fixed";
    document.body.appendChild(menuEl);
  };

  const renderMenu = (rect: DOMRect | null) => {
    if (!rect || !menuEl) return;

    menuEl.style.top = `${rect.bottom + 5}px`;
    menuEl.style.left = `${rect.left}px`;

    if (items.length === 0) {
      const itemType =
        currentChar === "@"
          ? "variables"
          : currentChar === "$"
            ? "mutable variables"
            : currentChar === "#"
              ? "default variables"
              : "functions";
      menuEl.innerHTML = `<div class="text-gray-500 dark:text-gray-400 text-sm p-2">No ${itemType} found</div>`;
      return;
    }

    menuEl.innerHTML = items
      .map((it, i) => {
        const label = "label" in it ? (it.label ?? it.name ?? it.id) : it.name;
        const active =
          i === selected
            ? "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100"
            : "hover:bg-gray-100 dark:hover:bg-gray-700";
        return `
          <div data-idx="${i}" class="p-2 rounded cursor-pointer ${active}">
            <div class="font-medium text-sm">${currentChar}${label}</div>
            ${it.description ? `<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">${it.description}</div>` : ""}
          </div>`;
      })
      .join("");

    Array.from(menuEl.querySelectorAll<HTMLElement>("[data-idx]")).forEach(
      (el) => {
        el.onclick = () => {
          const i = Number(el.dataset.idx);
          const it = items[i];
          if (it && command) {
            const label =
              "label" in it ? (it.label ?? it.name ?? it.id) : it.name;
            command({ id: it.id, label });
          }
          destroy();
        };
      }
    );
  };

  const rerenderAtCaret = () => {
    const rect = getClientRect ? getClientRect() : null;
    renderMenu(rect);
  };

  // helper to wrap command so it replaces full query (removes "@na")
  const wrapCommand =
    (
      rawCommand: (opts: { id: string; label?: string }) => void,
      _range: { from: number; to: number }
    ) =>
    (opts: { id: string; label?: string }) => {
      // @tiptap/extension-mention will replace range.from..range.to
      rawCommand({ id: opts.id, label: opts.label });
    };

  const baseMention = Mention.configure({
    HTMLAttributes: {
      class:
        "mention bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1 py-0.5 rounded text-sm font-medium border border-blue-300 dark:border-blue-700",
    },
    renderLabel: ({ node }) => `@${node.attrs.label ?? node.attrs.id}`,
    suggestion: {
      char: "@",
      items: ({ query }) => {
        const all = getVariables();
        const q = (query || "").toLowerCase();
        return all
          .filter((v) => {
            const label = (v.label ?? v.name ?? v.id).toLowerCase();
            return label.includes(q) || v.id.toLowerCase().includes(q);
          })
          .slice(0, 10);
      },
      render: () => ({
        onStart: (props) => {
          items = props.items as MentionItem[];
          command = wrapCommand(props.command, props.range);
          selected = 0;
          currentChar = "@";
          getClientRect = props.clientRect ?? null;
          ensureMenu();
          rerenderAtCaret();
        },
        onUpdate: (props) => {
          items = props.items as MentionItem[];
          command = wrapCommand(props.command, props.range);
          getClientRect = props.clientRect ?? getClientRect;
          selected = Math.min(selected, Math.max(items.length - 1, 0));
          rerenderAtCaret();
        },
        onKeyDown: (props) => {
          if (!menuEl) return false;
          if (props.event.key === "ArrowDown") {
            props.event.preventDefault();
            if (items.length) selected = (selected + 1) % items.length;
            rerenderAtCaret();
            return true;
          }
          if (props.event.key === "ArrowUp") {
            props.event.preventDefault();
            if (items.length)
              selected = (selected - 1 + items.length) % items.length;
            rerenderAtCaret();
            return true;
          }
          if (props.event.key === "Enter") {
            props.event.preventDefault();
            const it = items[selected];
            if (it && command) {
              const label =
                "label" in it ? (it.label ?? it.name ?? it.id) : it.name;
              command({ id: it.id, label });
            }
            destroy();
            return true;
          }
          if (props.event.key === "Escape") {
            props.event.preventDefault();
            destroy();
            return true;
          }
          return false;
        },
        onExit: () => {
          destroy();
        },
      }),
    },
  });

  const mutableMention = Mention.extend({ name: "mutableMention" }).configure({
    HTMLAttributes: {
      class:
        "mutable-mention bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-1 py-0.5 rounded text-sm font-medium border border-orange-300 dark:border-orange-700",
    },
    renderLabel: ({ node }) => `$${node.attrs.label ?? node.attrs.id}`,
    suggestion: {
      char: "$",
      items: ({ query }) => {
        const all = getMutableVariables();
        const q = (query || "").toLowerCase();
        return all
          .filter((v) => {
            const label = (v.label ?? v.name ?? v.id).toLowerCase();
            return label.includes(q) || v.id.toLowerCase().includes(q);
          })
          .slice(0, 10);
      },
      render: () => ({
        onStart: (props) => {
          items = props.items as MentionItem[];
          command = wrapCommand(props.command, props.range);
          selected = 0;
          currentChar = "$";
          getClientRect = props.clientRect ?? null;
          ensureMenu();
          rerenderAtCaret();
        },
        onUpdate: (props) => {
          items = props.items as MentionItem[];
          command = wrapCommand(props.command, props.range);
          getClientRect = props.clientRect ?? getClientRect;
          selected = Math.min(selected, Math.max(items.length - 1, 0));
          rerenderAtCaret();
        },
        onKeyDown: (props) => {
          if (!menuEl) return false;
          if (props.event.key === "ArrowDown") {
            props.event.preventDefault();
            if (items.length) selected = (selected + 1) % items.length;
            rerenderAtCaret();
            return true;
          }
          if (props.event.key === "ArrowUp") {
            props.event.preventDefault();
            if (items.length)
              selected = (selected - 1 + items.length) % items.length;
            rerenderAtCaret();
            return true;
          }
          if (props.event.key === "Enter") {
            props.event.preventDefault();
            const it = items[selected];
            if (it && command) {
              const label =
                "label" in it ? (it.label ?? it.name ?? it.id) : it.name;
              command({ id: it.id, label });
            }
            destroy();
            return true;
          }
          if (props.event.key === "Escape") {
            props.event.preventDefault();
            destroy();
            return true;
          }
          return false;
        },
        onExit: () => destroy(),
      }),
    },
  });

  const defaultVariableMention = Mention.extend({
    name: "defaultVariableMention",
  }).configure({
    HTMLAttributes: {
      class:
        "default-variable-mention bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-1 py-0.5 rounded text-sm font-medium border border-purple-300 dark:border-purple-700",
    },
    renderLabel: ({ node }) => `#${node.attrs.label ?? node.attrs.id}`,
    suggestion: {
      char: "#",
      items: ({ query }) => {
        const all = getDefaultVariables();
        const q = (query || "").toLowerCase();
        return all
          .filter((v) => {
            const label = v.name.toLowerCase();
            return label.includes(q) || v.id.toLowerCase().includes(q);
          })
          .slice(0, 10);
      },
      render: () => ({
        onStart: (props) => {
          items = props.items as DefaultVariableItem[];
          command = wrapCommand(props.command, props.range);
          selected = 0;
          currentChar = "#";
          getClientRect = props.clientRect ?? null;
          ensureMenu();
          rerenderAtCaret();
        },
        onUpdate: (props) => {
          items = props.items as DefaultVariableItem[];
          command = wrapCommand(props.command, props.range);
          getClientRect = props.clientRect ?? getClientRect;
          selected = Math.min(selected, Math.max(items.length - 1, 0));
          rerenderAtCaret();
        },
        onKeyDown: (props) => {
          if (!menuEl) return false;
          if (props.event.key === "ArrowDown") {
            props.event.preventDefault();
            if (items.length) selected = (selected + 1) % items.length;
            rerenderAtCaret();
            return true;
          }
          if (props.event.key === "ArrowUp") {
            props.event.preventDefault();
            if (items.length)
              selected = (selected - 1 + items.length) % items.length;
            rerenderAtCaret();
            return true;
          }
          if (props.event.key === "Enter") {
            props.event.preventDefault();
            const it = items[selected];
            if (it && command) {
              const label = it.name;
              command({ id: it.id, label });
            }
            destroy();
            return true;
          }
          if (props.event.key === "Escape") {
            props.event.preventDefault();
            destroy();
            return true;
          }
          return false;
        },
        onExit: () => destroy(),
      }),
    },
  });

  const functionMention = Mention.extend({ name: "functionMention" }).configure(
    {
      HTMLAttributes: {
        class:
          "function-mention bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-600 px-1 py-0.5 rounded text-sm font-medium border border-emerald-300 dark:border-emerald-700",
      },
      renderLabel: ({ node }) => `!${node.attrs.label ?? node.attrs.id}`,
      suggestion: {
        char: "!",
        items: ({ query }) => {
          const all = getFunctions();
          const q = (query || "").toLowerCase();
          return all
            .filter((f) => {
              const label = f.name.toLowerCase();
              return label.includes(q) || f.id.toLowerCase().includes(q);
            })
            .slice(0, 10);
        },
        render: () => ({
          onStart: (props) => {
            items = props.items as FunctionItem[];
            command = wrapCommand(props.command, props.range);
            selected = 0;
            currentChar = "!";
            getClientRect = props.clientRect ?? null;
            ensureMenu();
            rerenderAtCaret();
          },
          onUpdate: (props) => {
            items = props.items as FunctionItem[];
            command = wrapCommand(props.command, props.range);
            getClientRect = props.clientRect ?? getClientRect;
            selected = Math.min(selected, Math.max(items.length - 1, 0));
            rerenderAtCaret();
          },
          onKeyDown: (props) => {
            if (!menuEl) return false;
            if (props.event.key === "ArrowDown") {
              props.event.preventDefault();
              if (items.length) selected = (selected + 1) % items.length;
              rerenderAtCaret();
              return true;
            }
            if (props.event.key === "ArrowUp") {
              props.event.preventDefault();
              if (items.length)
                selected = (selected - 1 + items.length) % items.length;
              rerenderAtCaret();
              return true;
            }
            if (props.event.key === "Enter") {
              props.event.preventDefault();
              const it = items[selected];
              if (it && command) {
                const label = "name" in it ? it.name : (it.label ?? it.id);
                command({ id: it.id, label });
              }
              destroy();
              return true;
            }
            if (props.event.key === "Escape") {
              props.event.preventDefault();
              destroy();
              return true;
            }
            return false;
          },
          onExit: () => destroy(),
        }),
      },
    }
  );

  return [baseMention, mutableMention, defaultVariableMention, functionMention];
}
