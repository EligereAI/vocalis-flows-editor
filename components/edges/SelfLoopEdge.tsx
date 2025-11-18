"use client";

import { BaseEdge, EdgeProps, useNodes } from "@xyflow/react";

export default function SelfLoopEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  source,
  style = {},
  markerEnd,
  label,
}: EdgeProps) {
  // Get the source node to determine its actual dimensions for label spacing
  const nodes = useNodes();
  const sourceNode = nodes.find((n) => n.id === source);
  const nodeWidth = sourceNode?.width ?? 150;

  // For self-loops, source and target are the same node
  // Start from the bottom handle (source) and loop around to the top handle (target)
  const startX = sourceX;
  const startY = sourceY;
  const endX = targetX;
  const endY = targetY;

  // Calculate spacing for the loop
  const verticalSpacing = 10; // Distance down from bottom handle and up from top handle

  // Calculate horizontal spacing based on label length
  // Estimate ~6px per character + padding, with minimum spacing
  const labelText = label ? String(label) : "";
  const labelWidth = labelText.length * 6 + 4; // ~6px per char + padding
  const minSpacing = nodeWidth / 2 + 10; // Minimum space (node half-width + small padding)
  const horizontalSpacing = Math.max(minSpacing, labelWidth); // Use larger of min or label-based spacing

  // Calculate key points for the simple path:
  // 1. From bottom handle, move down
  // 2. Then straight left until there's enough space for centered text
  // 3. Then up (with label here)
  // 4. Then back right
  // 5. Finally slightly down towards top handle

  const bottomY = startY + verticalSpacing;
  const leftX = startX - horizontalSpacing;
  const topY = endY - verticalSpacing;

  // Corner radius for rounded corners
  const cornerRadius = 25;

  // Create a path with rounded corners using cubic bezier curves for smooth corners
  // C command: C x1 y1, x2 y2, x y (control points and end point)
  // Note: In SVG, Y increases downward
  const loopPath = [
    `M ${startX} ${startY}`, // Start at bottom handle
    `L ${startX} ${bottomY - cornerRadius}`, // Move down (before corner)
    // Bottom corner: curve from down to left
    // Control points create a smooth 90-degree turn
    `C ${startX} ${bottomY - cornerRadius * 0.5}, ${startX - cornerRadius * 0.5} ${bottomY}, ${startX - cornerRadius} ${bottomY}`,
    `L ${leftX + cornerRadius} ${bottomY}`, // Straight left (before corner)
    // Bottom-left corner: curve from left to up
    `C ${leftX + cornerRadius * 0.5} ${bottomY}, ${leftX} ${bottomY - cornerRadius * 0.5}, ${leftX} ${bottomY - cornerRadius}`,
    `L ${leftX} ${topY + cornerRadius}`, // Up (before corner, label will be here)
    // Top-left corner: curve from up to right
    `C ${leftX} ${topY + cornerRadius * 0.5}, ${leftX + cornerRadius * 0.5} ${topY}, ${leftX + cornerRadius} ${topY}`,
    `L ${endX - cornerRadius} ${topY}`, // Back right (before corner)
    // Top-right corner: curve from right to down
    `C ${endX - cornerRadius * 0.5} ${topY}, ${endX} ${topY + cornerRadius * 0.5}, ${endX} ${topY + cornerRadius}`,
    `L ${endX} ${endY}`, // Slightly down to top handle
  ].join(" ");

  // Label position: on the left side, vertically centered
  const labelX = leftX;
  const labelY = (bottomY + topY) / 2;

  return (
    <>
      <BaseEdge
        id={id}
        path={loopPath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: 1,
        }}
      />
      {label && (
        <g transform={`translate(${labelX} ${labelY})`}>
          <rect
            width={labelWidth}
            x={-labelWidth / 2}
            y={-8}
            height={16}
            className="react-flow__edge-textbg"
            rx="2"
            ry="2"
          />
          <text
            x={0}
            y={0}
            textAnchor="middle"
            dominantBaseline="middle"
            className="react-flow__edge-text"
          >
            {label}
          </text>
        </g>
      )}
    </>
  );
}
