import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Select } from "@/components/ui/select";

// Opening a record for edit is the risky path for the themed select: the hidden
// <select> holds the value while a separate trigger draws the label, so the two
// can disagree and show a placeholder over a saved value. Rendering the real
// component covers the first paint, which is the one that has to be right.

function markup(node: React.ReactElement): string {
  return renderToStaticMarkup(node);
}

// The trigger's label sits in the first span of the button.
function triggerLabel(html: string): string {
  const match = html.match(/<button[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/);
  return match ? match[1].replace(/<[^>]*>/g, "") : "";
}

const CATEGORIES = ["Groceries", "Transport", "Rent"];

describe("preselection on edit", () => {
  it("shows the saved value, not the placeholder", () => {
    const html = markup(
      <Select defaultValue="Transport" placeholder="Pick a category">
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>,
    );
    expect(triggerLabel(html)).toBe("Transport");
  });

  it("falls back to the placeholder when nothing is selected", () => {
    const html = markup(
      <Select defaultValue="" placeholder="Pick a category">
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>,
    );
    expect(triggerLabel(html)).toBe("Pick a category");
  });

  it("resolves a value that lives inside an optgroup, like a plan line target", () => {
    const html = markup(
      <Select defaultValue="goal:g2" placeholder="Nothing in particular">
        <option value="">Nothing in particular</option>
        <optgroup label="Savings goals">
          <option value="goal:g1">Laptop</option>
          <option value="goal:g2">Deposit</option>
        </optgroup>
        <optgroup label="Loans">
          <option value="loan:l1">Car repair</option>
        </optgroup>
      </Select>,
    );
    expect(triggerLabel(html)).toBe("Deposit");
  });

  it("preselects a numeric value, so a weekday does not read as unset", () => {
    const html = markup(
      <Select defaultValue={0} placeholder="Pick a day">
        <option value={0}>Monday</option>
        <option value={1}>Tuesday</option>
      </Select>,
    );
    expect(triggerLabel(html)).toBe("Monday");
  });

  it("keeps the hidden select carrying the value for the form to read", () => {
    const html = markup(
      <Select name="category" defaultValue="Rent" placeholder="Pick a category">
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>,
    );
    expect(html).toContain('name="category"');
    expect(html).toContain('aria-hidden="true"');
  });

  it("renders group labels so a grouped dropdown is readable", () => {
    const html = markup(
      <Select defaultValue="" placeholder="Pick one">
        <optgroup label="Savings goals">
          <option value="goal:g1">Laptop</option>
        </optgroup>
      </Select>,
    );
    expect(html).toContain("Savings goals");
  });
});
