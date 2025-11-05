"use client";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import type { MessageJson } from "@/lib/schema/flow.schema";

type Props = {
  label: string;
  messages: MessageJson[] | undefined;
  onChange: (messages: MessageJson[]) => void;
};

export default function MessagesForm({ label, messages, onChange }: Props) {
  const items = messages ?? [];

  const updateItem = (index: number, updates: Partial<MessageJson>) => {
    const next = [...items];
    next[index] = { ...next[index], ...updates };
    onChange(next);
  };

  const addItem = () => {
    onChange([...items, { role: "system", content: "" }]);
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
      {items.map((msg, i) => (
        <div key={i} className="space-y-2 rounded border p-3">
          <div className="flex items-center gap-2">
            <Select
              value={msg.role}
              onValueChange={(v: "system" | "user" | "assistant") => updateItem(i, { role: v })}
            >
              <SelectTrigger className="h-8 text-xs w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="assistant">Assistant</SelectItem>
              </SelectContent>
            </Select>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8"
                    onClick={() => removeItem(i)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Remove message</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Textarea
            className="min-h-20 text-xs"
            value={msg.content}
            onChange={(e) => updateItem(i, { content: e.target.value })}
            placeholder="Message content"
          />
        </div>
      ))}
      {items.length === 0 && (
        <div className="text-xs opacity-40 italic py-2">
          No messages. Click "Add" to create one.
        </div>
      )}
    </div>
  );
}
