import type { FlowNode } from "@/lib/types/flowTypes";

import { generateNodeIdFromLabel } from "./nodeId";

/**
 * Generate a label with "copy" suffix, handling multiple copies
 * Examples: "Node" -> "Node copy", "Node copy" -> "Node copy 2", "Node copy 2" -> "Node copy 3"
 */
function generateCopyLabel(originalLabel: string, existingLabels: string[]): string {
  const baseLabel = originalLabel.trim() || "Node";

  // Check if label already ends with "copy" or "copy N"
  const copyMatch = baseLabel.match(/^(.+?)(\s+copy(?:\s+\d+)?)?$/i);
  const baseName = copyMatch ? copyMatch[1].trim() : baseLabel;

  // Find the highest copy number for this base name
  let maxCopyNumber = 0;
  const copyPattern = new RegExp(
    `^${baseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+copy(?:\\s+(\\d+))?$`,
    "i"
  );

  existingLabels.forEach((label) => {
    const match = label.match(copyPattern);
    if (match) {
      const num = match[1] ? parseInt(match[1], 10) : 1;
      maxCopyNumber = Math.max(maxCopyNumber, num);
    }
  });

  if (maxCopyNumber === 0) {
    return `${baseName} copy`;
  }

  return `${baseName} copy ${maxCopyNumber + 1}`;
}

/**
 * Deep clone a node with all its data, creating a new node with "copy" suffix
 * Preserves all function references (next_node_id) so duplicated nodes maintain connections
 */
export function duplicateNode(node: FlowNode, allNodes: FlowNode[]): FlowNode {
  // Deep clone the node data using JSON parse/stringify
  const clonedData = JSON.parse(JSON.stringify(node.data));

  // Generate new label with copy suffix
  const existingLabels = allNodes.map((n) => n.data?.label || "").filter(Boolean);
  const originalLabel = node.data?.label || "Node";
  const newLabel = generateCopyLabel(originalLabel, existingLabels);

  // Generate new node ID
  const existingIds = allNodes.map((n) => n.id);
  const newId = generateNodeIdFromLabel(newLabel, existingIds);

  // Update label in cloned data
  clonedData.label = newLabel;

  // Offset position
  const newPosition = {
    x: node.position.x + 100,
    y: node.position.y + 20,
  };

  // Create new node with cloned data
  // Note: next_node_id references are preserved in the deep clone
  return {
    ...node,
    id: newId,
    position: newPosition,
    data: clonedData,
  };
}
