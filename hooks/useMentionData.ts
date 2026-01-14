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
      const pathSegments = pathname.split("/").filter((segment) => segment.length > 0);

      if (pathSegments.length < 1) {
        setIsLoading(false);
        return;
      }
      const agentId = pathSegments[0] ?? "";
      const versionNumber = pathSegments[1] ?? "1";

      if (!BACKEND_URL) {
        console.warn("NEXT_PUBLIC_BACKEND_URL is not set, using sample data");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const url = new URL(`${BACKEND_URL}/api/v1/agent/get-agent-variables`);
        url.searchParams.set("agent_id", agentId);
        url.searchParams.set("version_number", versionNumber);

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

        let variablesArray: VariableItem[] = [];
        if (Array.isArray(data)) {
          variablesArray = data;
        } else if (data && typeof data === "object") {
          if ("data" in data && Array.isArray(data.data)) {
            variablesArray = data.data;
          }
          else if ("variables" in data && Array.isArray(data.variables)) {
            variablesArray = data.variables;
          }
        }

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
