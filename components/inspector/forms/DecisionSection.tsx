"use client";

import { ChevronDown, ChevronRight, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { DecisionConditionJson, FlowFunctionJson } from "@/lib/schema/flow.schema";
import { useEditorStore } from "@/lib/store/editorStore";

interface DecisionSectionProps {
  func: FlowFunctionJson;
  onChange: (updates: Partial<FlowFunctionJson>) => void;
  availableNodeIds: string[];
  currentNodeId?: string;
  functionIndex: number;
  isSelected: boolean;
  selectedConditionIndex: number | null;
  onFocus: () => void;
}

export function DecisionSection({
  func,
  onChange,
  availableNodeIds,
  currentNodeId,
  functionIndex,
  isSelected,
  selectedConditionIndex,
  onFocus,
}: DecisionSectionProps) {
  const [showDecision, setShowDecision] = useState(func.decision !== undefined);
  const conditionRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const defaultNextNodeRef = useRef<HTMLElement | null>(null);
  const scrollTarget = useEditorStore((state) => state.scrollTarget);
  const setScrollTarget = useEditorStore((state) => state.setScrollTarget);

  // Ensure decision section is expanded when a condition is selected or scroll target requires it
  // Only expand if this is the selected function or if scrollTarget matches this function
  const needsDecisionExpansion =
    func.decision &&
    !showDecision &&
    ((isSelected && selectedConditionIndex !== null) ||
      (scrollTarget &&
        scrollTarget.nodeId === currentNodeId &&
        scrollTarget.functionIndex === functionIndex &&
        scrollTarget.conditionIndex !== null));

  useEffect(() => {
    if (needsDecisionExpansion) {
      // Use setTimeout to avoid setState in effect warning
      const timeoutId = setTimeout(() => {
        setShowDecision(true);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [
    needsDecisionExpansion,
    isSelected,
    selectedConditionIndex,
    scrollTarget,
    currentNodeId,
    functionIndex,
  ]);

  // Check if we should scroll to a condition based on scroll target
  useEffect(() => {
    if (
      scrollTarget &&
      currentNodeId &&
      scrollTarget.nodeId === currentNodeId &&
      scrollTarget.functionIndex === functionIndex &&
      scrollTarget.conditionIndex !== null
    ) {
      // Wait for decision section to expand if needed
      const delay = showDecision ? 50 : 150;
      const timeoutId = setTimeout(() => {
        const conditionIndex = scrollTarget.conditionIndex;
        if (conditionIndex === -1) {
          // Scroll to default next node
          if (defaultNextNodeRef.current) {
            defaultNextNodeRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
            setScrollTarget(null);
          }
        } else if (conditionIndex !== null && conditionIndex >= 0) {
          // Scroll to specific condition
          const element = conditionRefs.current.get(conditionIndex);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "nearest" });
            setScrollTarget(null);
          } else {
            // Element not found yet, try again
            const retryTimeoutId = setTimeout(() => {
              const retryElement = conditionRefs.current.get(conditionIndex);
              if (retryElement) {
                retryElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
                setScrollTarget(null);
              }
            }, 100);
            return () => clearTimeout(retryTimeoutId);
          }
        }
      }, delay);

      return () => clearTimeout(timeoutId);
    }
  }, [scrollTarget, currentNodeId, functionIndex, showDecision, func.decision, setScrollTarget]);

  if (!func.decision && !showDecision) {
    return (
      <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              // Create decision with current next_node_id as default
              onChange({
                decision: {
                  action: "",
                  conditions: [],
                  default_next_node_id: func.next_node_id || "",
                },
              });
              setShowDecision(true);
            }}
            className="flex items-center gap-1.5 text-xs font-medium opacity-80 hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="h-4 w-4" />
            Decision
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            setShowDecision(!showDecision);
          }}
          className="flex items-center gap-1.5 text-xs font-medium opacity-80 hover:opacity-100 transition-opacity"
        >
          {showDecision ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Decision
        </button>
        {func.decision && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={() => {
              onChange({ decision: undefined });
              setShowDecision(false);
            }}
          >
            Remove
          </Button>
        )}
      </div>
      {func.decision && showDecision && (
        <div className="space-y-3">
          {/* Action Input */}
          <div className="space-y-2">
            <div className="text-xs opacity-60">Action (Python code)</div>
            <Textarea
              className="min-h-20 text-xs font-mono"
              value={func.decision.action}
              onChange={(e) => {
                onChange({
                  decision: {
                    ...func.decision!,
                    action: e.target.value,
                  },
                });
              }}
              onFocus={onFocus}
              placeholder="some_action()"
            />
            <div className="text-xs opacity-40 italic">
              Enter Python expression (e.g., <code className="font-mono">some_action()</code>).
              Result will be stored in <code className="font-mono">result</code>.
            </div>
          </div>

          {/* Conditions */}
          <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs font-medium opacity-80">Conditions</div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1"
                onClick={() => {
                  onChange({
                    decision: {
                      ...func.decision!,
                      conditions: [
                        ...func.decision!.conditions,
                        {
                          operator: "==" as const,
                          value: "",
                          next_node_id: "",
                        },
                      ],
                    },
                  });
                }}
              >
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
            {func.decision.conditions.length === 0 ? (
              <div className="text-xs opacity-40 italic py-2">
                No conditions. Default next node will always be used.
              </div>
            ) : (
              <div className="space-y-2">
                {func.decision.conditions.map((condition, condIndex) => {
                  const hasInvalidConditionNode =
                    condition.next_node_id && !availableNodeIds.includes(condition.next_node_id);
                  return (
                    <div
                      key={condIndex}
                      ref={(el) => {
                        if (el) {
                          conditionRefs.current.set(condIndex, el);
                        } else {
                          conditionRefs.current.delete(condIndex);
                        }
                      }}
                      className="rounded-md border border-neutral-200 dark:border-neutral-700 p-3 space-y-3 bg-neutral-50/50 dark:bg-neutral-800/30"
                    >
                      <div className="flex items-center gap-2">
                        <div className="space-y-2 flex-1">
                          <div className="text-xs opacity-60">Operator</div>
                          <Select
                            value={condition.operator}
                            onValueChange={(v) => {
                              const newConditions = [...func.decision!.conditions];
                              newConditions[condIndex] = {
                                ...condition,
                                operator: v as DecisionConditionJson["operator"],
                              };
                              onChange({
                                decision: {
                                  ...func.decision!,
                                  conditions: newConditions,
                                },
                              });
                            }}
                            onOpenChange={(open) => {
                              if (open) onFocus();
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs" onFocus={onFocus}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="<">&lt;</SelectItem>
                              <SelectItem value="<=">&lt;=</SelectItem>
                              <SelectItem value="==">==</SelectItem>
                              <SelectItem value=">=">&gt;=</SelectItem>
                              <SelectItem value=">">&gt;</SelectItem>
                              <SelectItem value="!=">!=</SelectItem>
                              <SelectItem value="not">not</SelectItem>
                              <SelectItem value="in">in</SelectItem>
                              <SelectItem value="not in">not in</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 flex-1">
                          <div className="text-xs opacity-60">Value</div>
                          <Input
                            className="h-8 text-xs"
                            value={condition.value}
                            onChange={(e) => {
                              const newConditions = [...func.decision!.conditions];
                              newConditions[condIndex] = {
                                ...condition,
                                value: e.target.value,
                              };
                              onChange({
                                decision: {
                                  ...func.decision!,
                                  conditions: newConditions,
                                },
                              });
                            }}
                            onFocus={onFocus}
                            placeholder="Value to compare"
                          />
                        </div>
                        <div className="flex items-end">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    const newConditions = func.decision!.conditions.filter(
                                      (_, i) => i !== condIndex
                                    );
                                    onChange({
                                      decision: {
                                        ...func.decision!,
                                        conditions: newConditions,
                                      },
                                    });
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Remove condition</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs opacity-60">Next Node</div>
                        {hasInvalidConditionNode && (
                          <div className="text-xs text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/40 px-2 py-1 rounded">
                            Invalid: Target node "{condition.next_node_id}" was deleted
                          </div>
                        )}
                        {availableNodeIds.length > 0 ? (
                          <Select
                            value={condition.next_node_id || undefined}
                            onValueChange={(v) => {
                              const newConditions = [...func.decision!.conditions];
                              newConditions[condIndex] = {
                                ...condition,
                                next_node_id: v,
                              };
                              onChange({
                                decision: {
                                  ...func.decision!,
                                  conditions: newConditions,
                                },
                              });
                            }}
                            onOpenChange={(open) => {
                              if (open) onFocus();
                            }}
                          >
                            <SelectTrigger
                              className={`h-8 text-xs ${hasInvalidConditionNode ? "border-orange-400 dark:border-orange-500" : ""}`}
                              onFocus={onFocus}
                            >
                              <SelectValue placeholder="Select next node..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableNodeIds.map((nodeId) => (
                                <SelectItem key={nodeId} value={nodeId}>
                                  {nodeId}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="text-xs opacity-40 italic py-1">
                            No other nodes available
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
