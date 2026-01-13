import type {
  DefaultVariableItem,
  FunctionItem,
  Variable,
} from "@/lib/utils/markdown-utils";

/**
 * Sample data for testing mentions in the messages editor.
 * In a real application, this would come from the flow context or API.
 */

export const sampleVariables: Variable[] = [
  {
    id: "user_name",
    name: "user_name",
    label: "User Name",
    description: "The name of the current user",
    isMutable: false,
  },
  {
    id: "conversation_id",
    name: "conversation_id",
    label: "Conversation ID",
    description: "Unique identifier for the conversation",
    isMutable: false,
  },
  {
    id: "session_data",
    name: "session_data",
    label: "Session Data",
    description: "Data stored in the current session",
    isMutable: true,
  },
  {
    id: "user_preference",
    name: "user_preference",
    label: "User Preference",
    description: "User's preference setting",
    isMutable: true,
  },
  {
    id: "message_count",
    name: "message_count",
    label: "Message Count",
    description: "Number of messages in the conversation",
    isMutable: false,
  },
];

export const sampleDefaultVariables: DefaultVariableItem[] = [
  {
    id: "GLOBAL_TIME",
    name: "GLOBAL_TIME",
    description: "Current time (HH:MM:SS format)",
  },
  {
    id: "GLOBAL_DATE",
    name: "GLOBAL_DATE",
    description: "Current date (YYYY-MM-DD format)",
  },
  {
    id: "GLOBAL_MONTH",
    name: "GLOBAL_MONTH",
    description: "Current month name",
  },
  {
    id: "GLOBAL_TIMEZONE",
    name: "GLOBAL_TIMEZONE",
    description: "Current timezone",
  },
  {
    id: "GLOBAL_YEAR",
    name: "GLOBAL_YEAR",
    description: "Current year",
  },
  {
    id: "GLOBAL_DAY",
    name: "GLOBAL_DAY",
    description: "Current day of month",
  },
  {
    id: "GLOBAL_WEEKDAY",
    name: "GLOBAL_WEEKDAY",
    description: "Current day of week",
  },
];

export const sampleFunctions: FunctionItem[] = [
  {
    id: "update_variable",
    name: "update_variable",
    description: "Captures events of variable change",
  },
  {
    id: "disconnect_call",
    name: "disconnect_call",
    description: "Speaks a disconnection notice and disconnects",
  }
];
