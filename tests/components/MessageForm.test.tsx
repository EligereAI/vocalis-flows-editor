import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import MessageForm from "@/components/inspector/forms/MessageForm";

describe("MessageForm", () => {
  it("renders and allows editing message text", () => {
    const onChange = vi.fn();
    render(<MessageForm data={{ text: "Hello" }} onChange={onChange} />);

    const textarea = screen.getByPlaceholderText(/Message text/i);
    expect(textarea).toBeDefined();
    expect((textarea as HTMLTextAreaElement).value).toBe("Hello");
  });
});
