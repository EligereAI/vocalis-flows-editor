"use client";

import { IconBook, IconBrandGithub, IconHome } from "@tabler/icons-react";
import {
  ChevronRight,
  Download,
  FilePlusCorner,
  FileText,
  MoreHorizontal,
  Redo2,
  Undo2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";

import PipecatLogo from "@/components/icons/PipecatLogo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { showToast } from "@/components/ui/Toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { generatePythonCode } from "@/lib/codegen/pythonGenerator";
import { flowJsonToReactFlow, reactFlowToFlowJson } from "@/lib/convert/flowAdapters";
import { useEditorStore } from "@/lib/store/editorStore";
import type { FlowEdge, FlowNode } from "@/lib/types/flowTypes";
import { customGraphChecks, validateFlowJson } from "@/lib/validation/validator";

const FLOWS_PROMPT_URL: string | undefined = process.env.NEXT_PUBLIC_BACKEND_URL;

type Props = {
  nodes: FlowNode[];
  edges: FlowEdge[];
  setNodes: (nodes: FlowNode[]) => void;
  setEdges: (edges: FlowEdge[] | ((edges: FlowEdge[]) => FlowEdge[])) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onNewFlow: () => void;
};

export default function Toolbar({
  nodes,
  edges,
  setNodes,
  setEdges,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onNewFlow,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const rfInstance = useEditorStore((state) => state.rfInstance);
  const showNodesPanel = useEditorStore((state) => state.showNodesPanel);
  const setShowNodesPanel = useEditorStore((state) => state.setShowNodesPanel);

  const pathname: string = usePathname();
  const pathSegments: string[] = pathname.split("/").filter((segment) => segment.length > 0);

  let agentIdFromUrl: string = "";
  let versionNumberFromUrl: string = "1";

  if (pathSegments.length >= 2) {
    agentIdFromUrl = pathSegments[0] ?? "";
    versionNumberFromUrl = pathSegments[1] ?? "1";
  } else if (pathSegments.length === 1) {
    agentIdFromUrl = pathSegments[0] ?? "";
  }

  async function onSaveTemplate(): Promise<void> {
    if (!FLOWS_PROMPT_URL) {
      console.error("Environment variable NEXT_PUBLIC_BACKEND_URL is not set.");
      showToast("Configuration error: flows endpoint is not configured", "error");
      return;
    }

    if (!agentIdFromUrl) {
      showToast("Agent ID is required. Please navigate to a valid agent page.", "error");
      return;
    }

    const json = reactFlowToFlowJson(nodes, edges);
    const validationResult = validateFlowJson(json);
    if (!validationResult.valid) {
      showToast("Flow must be valid before saving template", "error");
      return;
    }
    const custom = customGraphChecks(json);
    if (custom.length) {
      showToast("Custom validation failed. See console for details.", "error");
      console.error("Custom validation errors:", custom);
      return;
    }

    const url = `${FLOWS_PROMPT_URL}/api/v1/agent/save-flows-prompt`;
    const payload = {
      agent_id: agentIdFromUrl,
      version_number: versionNumberFromUrl,
      flows_prompt: {
        [json.meta?.name ?? "flow1"]: json,
      },
    };

    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.error("Failed to save template:", {
          status: response.status,
          statusText: response.statusText,
          body: responseText,
        });

        let errorMessage = "Failed to save template";
        try {
          const errorJson = JSON.parse(responseText);
          errorMessage = errorJson.detail || errorMessage;
        } catch {
          errorMessage = responseText || errorMessage;
        }

        showToast(errorMessage, "error");
        return;
      }

      showToast("Template saved successfully", "success");
    } catch (error) {
      console.error("Error saving template:", error);
      showToast("Error saving template", "error");
    }
  }

  function onExport(): void {
    const json = reactFlowToFlowJson(nodes, edges);
    const defaultFileName: string =
      json.meta?.name !== undefined && json.meta.name.trim().length > 0
        ? `${json.meta.name.toLowerCase().replace(/\s+/g, "_")}.json`
        : "flow.json";

    const inputName: string | null = window.prompt(
      "Enter a file name for the exported flow:",
      defaultFileName
    );

    if (inputName === null || inputName.trim().length === 0) {
      showToast("Export cancelled", "info");
      return;
    }

    const normalizedFileName: string = inputName.toLowerCase().endsWith(".json")
      ? inputName
      : `${inputName}.json`;

    const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = normalizedFileName;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function onExportPython(): void {
    const json = reactFlowToFlowJson(nodes, edges);
    const r = validateFlowJson(json);
    if (!r.valid) {
      showToast("Flow must be valid before exporting Python code", "error");
      return;
    }
    try {
      const pythonCode = generatePythonCode(json);

      const baseName: string =
        json.meta?.name !== undefined && json.meta.name.trim().length > 0
          ? `${json.meta.name.toLowerCase().replace(/\s+/g, "_")}_flow.py`
          : "flow_flow.py";

      const inputName: string | null = window.prompt(
        "Enter a file name for the exported Python flow:",
        baseName
      );

      if (inputName === null || inputName.trim().length === 0) {
        showToast("Python export cancelled", "info");
        return;
      }

      const normalizedFileName: string = inputName.toLowerCase().endsWith(".py")
        ? inputName
        : `${inputName}.py`;

      const blob = new Blob([pythonCode], { type: "text/x-python" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = normalizedFileName;
      a.click();
      URL.revokeObjectURL(a.href);
      showToast("Python code exported successfully", "success");
    } catch (error) {
      console.error("Failed to generate Python code:", error);
      showToast("Failed to generate Python code", "error");
    }
  }

  function onImport(file: File, input: HTMLInputElement) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result));
        const r = validateFlowJson(json);
        if (!r.valid) {
          showToast("Invalid JSON schema for flow", "error");
          return;
        }
        const custom = customGraphChecks(json);
        if (custom.length) {
          showToast("Custom validation failed. See console for details.", "error");
          console.error("Custom validation errors:", custom);
          return;
        }
        const rf = flowJsonToReactFlow(json);
        setNodes(rf.nodes as FlowNode[]);
        setEdges(rf.edges as FlowEdge[]);
        showToast("Flow imported successfully", "success");
        setTimeout(() => {
          rfInstance?.fitView?.({ padding: 0.2, duration: 300 });
        }, 100);
        input.value = "";
      } catch {
        showToast("Failed to import JSON", "error");
      }
    };
    reader.readAsText(file);
  }

  const moreLinks = (
    <>
      <DropdownMenuItem asChild>
        <Link href="/">
          <IconHome size={16} />
          Home
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <a
          href="https://github.com/pipecat-ai/pipecat-flows-editor"
          target="_blank"
          rel="noreferrer"
        >
          <IconBrandGithub size={16} />
          Repository
        </a>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <a
          href="https://docs.pipecat.ai/guides/features/pipecat-flows"
          target="_blank"
          rel="noreferrer"
        >
          <IconBook size={16} />
          Pipecat Flows
        </a>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <a href="https://pipecat.ai" target="_blank" rel="noreferrer">
          <PipecatLogo height={16} />
          Pipecat
        </a>
      </DropdownMenuItem>
    </>
  );

  return (
    <TooltipProvider>
      <div
        className={`absolute top-2 md:top-4 left-2 z-10 flex gap-2 rounded-md bg-white/80 p-2 text-sm shadow backdrop-blur dark:bg-black/40 transition-all duration-300 ${
          showNodesPanel ? "left-[232px]" : ""
        }`}
      >
        {!showNodesPanel && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setShowNodesPanel(true)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent align="start">Show nodes panel</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <Button variant="secondary" size="sm" onClick={onNewFlow} title="Create a new flow">
          <FilePlusCorner className="h-4 w-4" />
          <span className="sr-only lg:not-sr-only">New Flow</span>
        </Button>
        <div className="w-px bg-neutral-300 dark:bg-neutral-700" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              onClick={onUndo}
              disabled={!canUndo}
              className="px-2"
            >
              <Undo2 className="h-4 w-4" />
              <span className="sr-only lg:not-sr-only">Undo</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Undo (Cmd/Ctrl+Z)</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              onClick={onRedo}
              disabled={!canRedo}
              className="px-2"
            >
              <Redo2 className="h-4 w-4" />
              <span className="sr-only lg:not-sr-only">Redo</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Redo (Cmd/Ctrl+Shift+Z)</p>
          </TooltipContent>
        </Tooltip>
        <div className="w-px bg-neutral-300 dark:bg-neutral-700" />
        {/* Import button - hidden on mobile, shown on larger screens */}
        <Input
          ref={inputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => e.target.files && onImport(e.target.files[0], e.target)}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => inputRef.current?.click()}
          className="hidden md:flex"
        >
          <Upload className="h-4 w-4 md:mr-1.5" />
          <span className="sr-only lg:not-sr-only">Import</span>
        </Button>
        {/* Export dropdown - hidden on mobile, shown on larger screens */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="sm" className="hidden md:flex gap-1.5">
              <Download className="h-4 w-4" />
              <span className="sr-only lg:not-sr-only">Export</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onExport}>Export JSON</DropdownMenuItem>
            <DropdownMenuItem onClick={onExportPython}>Export Python</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* More menu - shown on mobile only, contains Import, Export, and Examples */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="sm" className="gap-1.5 md:hidden">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">More</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => inputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Import
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExport}>
              <Download className="mr-2 h-4 w-4" />
              Export JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportPython}>
              <Download className="mr-2 h-4 w-4" />
              Export Python
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onSaveTemplate}
              className="cursor-pointer bg-blue-500 text-white"
            >
              <FileText className="mr-2 h-4 w-4" />
              <span>Save Template</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="default"
          size="sm"
          className="cursor-pointer hidden md:flex gap-1.5"
          onClick={onSaveTemplate}
        >
          <FileText className="h-4 w-4" />
          <span className="hidden md:inline">Save Template</span>
        </Button>
      </div>
    </TooltipProvider>
  );
}
