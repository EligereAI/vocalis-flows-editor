"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { DefaultVariableItem, FunctionItem, Variable } from "@/lib/utils/markdown-utils";
import { sampleVariables, sampleDefaultVariables, sampleFunctions } from "@/lib/data/mentionData";

const BACKEND_URL: string | undefined = process.env.NEXT_PUBLIC_BACKEND_URL;

type VariableItem = {
  id: string;
  name?: string;
  label?: string;
  description?: string | null;
  isMutable?: boolean;
};

interface MentionDataResponse {
  status?: string;
  data?: VariableItem[];
  variables?: VariableItem[];
}

export function useMentionData() {
  const pathname = usePathname();
  const [variables, setVariables] = useState<VariableItem[]>([]);
  // Keep globalVariables and functions as static (from sample data)
  const globalVariables = sampleDefaultVariables;
  const functions = sampleFunctions;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMentionData = async () => {
      // Extract agentId and versionNumber from URL
      const pathSegments = pathname.split("/").filter((segment) => segment.length > 0);
      const editorIndex = pathSegments.indexOf("editor");

      // if (editorIndex === -1 || pathSegments.length <= editorIndex + 2) {
      //   // No agentId/versionNumber in URL, use sample data
      //   setIsLoading(false);
      //   return;
      // }

      const agentId = pathSegments[editorIndex + 1] ?? "";
      const versionNumber = pathSegments[editorIndex + 2] ?? "1";

      // Check if backend URL is configured
      if (!BACKEND_URL) {
        console.warn("NEXT_PUBLIC_BACKEND_URL is not set, using sample data");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const url = new URL(`${BACKEND_URL}/api/v1/agent/get-agent-variables`);
        url.searchParams.set("agent_id", "3c8bed54-1177-4520-8d60-c21005458488");
        url.searchParams.set("version_number", "2");

        const response = await fetch(url.toString(), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch variables: ${response.statusText}`);
        }

        const data: MentionDataResponse | VariableItem[] = await response.json();

        // Handle multiple response formats
        let variablesArray: VariableItem[] = [];

        if (Array.isArray(data)) {
          // Direct array response
          variablesArray = data;
        } else if (data && typeof data === "object") {
          // Check for { status: "success", data: [...] } format
          if ("data" in data && Array.isArray(data.data)) {
            variablesArray = data.data;
          }
          // Check for { variables: [...] } format (legacy)
          else if ("variables" in data && Array.isArray(data.variables)) {
            variablesArray = data.variables;
          }
        }

        // Update variables if we got valid data
        if (variablesArray && variablesArray.length > 0) {
          const mappedVariables = variablesArray.map((v) => ({
            id: v.id,
            name: v.name ?? v.id,
            label: v.label ?? v.name ?? v.id,
            description: v.description ?? "",
            isMutable: v.isMutable ?? false,
          }));
          setVariables(mappedVariables);
        } else {
          console.warn("No variables found in API response, keeping sample data");
        }
      } catch (err) {
        console.error("Error fetching mention data:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch variables");
        // Keep sample data as fallback
      } finally {
        setIsLoading(false);
      }
    };

    fetchMentionData();
  }, [pathname]);

  return {
    variables,
    globalVariables,
    functions,
    isLoading,
    error,
  };
}
