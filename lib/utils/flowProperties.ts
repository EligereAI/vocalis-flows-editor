import type { Node } from "@xyflow/react";

import type { FlowFunctionJson } from "@/lib/schema/flow.schema";

export type SuggestedProperty = {
  name: string;
  property: {
    type: "string" | "integer" | "number" | "boolean";
    description?: string;
    enum?: string[];
    minimum?: number;
    maximum?: number;
    pattern?: string;
  };
};

/**
 * Collect all unique properties (name + full definition) from every function in the flow.
 * Excludes decision nodes. First occurrence wins for duplicate names.
 */
export function getAllPropertiesFromNodes(nodes: Node[]): SuggestedProperty[] {
  const byName = new Map<string, SuggestedProperty["property"]>();

  for (const node of nodes) {
    if (node.type === "decision") continue;

    const functions = (node.data?.functions as FlowFunctionJson[] | undefined) ?? [];
    for (const fn of functions) {
      const props = fn.properties ?? {};
      for (const [key, val] of Object.entries(props)) {
        if (!key.trim() || byName.has(key)) continue;
        const p = val as SuggestedProperty["property"];
        const enumArr = Array.isArray(p.enum)
          ? (p.enum as (string | number)[]).map((x) => String(x))
          : undefined;
        byName.set(key, {
          type: p.type as SuggestedProperty["property"]["type"],
          ...(p.description != null && { description: p.description }),
          ...(enumArr != null && { enum: enumArr }),
          ...(p.minimum != null && { minimum: p.minimum }),
          ...(p.maximum != null && { maximum: p.maximum }),
          ...(p.pattern != null && { pattern: p.pattern }),
        });
      }
    }
  }

  return Array.from(byName.entries())
    .map(([name, property]) => ({ name, property }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
