"use client";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ActionJson } from "@/lib/schema/flow.schema";

type Props = {
  label: string;
  actions: ActionJson[] | undefined;
  onChange: (actions: ActionJson[]) => void;
};

export default function ActionsForm({ label, actions, onChange }: Props) {
  const items = actions ?? [];

  const updateItem = (index: number, updates: Partial<ActionJson>) => {
    const next = [...items];
    next[index] = { ...next[index], ...updates };
    onChange(next);
  };

  const addItem = () => {
    onChange([...items, { type: "function" }]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs opacity-60">{label}</div>
        <Button variant="ghost" size="sm" className="h-6 gap-1" onClick={addItem}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>
      {items.map((action, i) => (
        <div key={i} className="flex items-center gap-2 rounded border p-3">
          <Select value={action.type} onValueChange={(v) => updateItem(i, { type: v })}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="function">Function</SelectItem>
              <SelectItem value="end_conversation">End Conversation</SelectItem>
              <SelectItem value="tts_say">TTS Say</SelectItem>
            </SelectContent>
          </Select>
          {action.type === "function" && (
            <Input
              className="h-8 text-xs w-32"
              value={action.handler ?? ""}
              onChange={(e) => updateItem(i, { handler: e.target.value })}
              placeholder="Handler"
            />
          )}
          {action.type === "tts_say" && (
            <Input
              className="h-8 text-xs flex-1"
              value={action.text ?? ""}
              onChange={(e) => updateItem(i, { text: e.target.value })}
              placeholder="Text to say"
            />
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8" onClick={() => removeItem(i)}>
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Remove action</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ))}
      {items.length === 0 && (
        <div className="text-xs opacity-40 italic py-2">No actions. Click "Add" to create one.</div>
      )}
    </div>
  );
}
