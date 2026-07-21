import { describe, it, expect } from "vitest";
import { collect, flatten } from "@/components/ui/select";

describe("collect", () => {
  it("reads plain options in order", () => {
    const entries = collect([
      <option key="a" value="a">
        Apples
      </option>,
      <option key="b" value="b">
        Bananas
      </option>,
    ]);
    expect(entries).toEqual([
      { value: "a", label: "Apples", disabled: undefined },
      { value: "b", label: "Bananas", disabled: undefined },
    ]);
  });

  it("flattens a mapped array nested inside an optgroup", () => {
    const goals = [
      { id: "g1", name: "Laptop" },
      { id: "g2", name: "Deposit" },
    ];
    const entries = collect(
      <optgroup label="Savings goals">
        {goals.map((g) => (
          <option key={g.id} value={`goal:${g.id}`}>
            {g.name}
          </option>
        ))}
      </optgroup>,
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ label: "Savings goals" });
    expect(flatten(entries).map((c) => c.value)).toEqual(["goal:g1", "goal:g2"]);
  });

  it("drops a hidden option, so the native placeholder never doubles up", () => {
    const entries = collect([
      <option key="p" value="" hidden>
        Pick one
      </option>,
      <option key="a" value="a">
        Apples
      </option>,
    ]);
    expect(entries).toEqual([{ value: "a", label: "Apples", disabled: undefined }]);
  });

  it("skips null children, so a conditional optgroup is safe", () => {
    const entries = collect([
      <option key="none" value="">
        Nothing in particular
      </option>,
      null,
      false,
    ]);
    expect(flatten(entries).map((c) => c.value)).toEqual([""]);
  });

  it("keeps a numeric zero value instead of blanking it", () => {
    const entries = collect(
      <option value={0} key="0">
        Monday
      </option>,
    );
    expect(flatten(entries)[0].value).toBe("0");
  });

  it("carries a disabled option through", () => {
    const entries = collect(
      <option value="g1" disabled key="g1">
        Empty goal
      </option>,
    );
    expect(flatten(entries)[0].disabled).toBe(true);
  });

  it("drops an empty optgroup", () => {
    const entries = collect(<optgroup label="Loans">{[]}</optgroup>);
    expect(entries).toEqual([]);
  });
});

describe("flatten", () => {
  it("finds a choice nested in a group so the trigger label resolves", () => {
    const entries = collect([
      <option key="none" value="">
        Nothing in particular
      </option>,
      <optgroup label="Loans" key="loans">
        <option value="loan:l1">Car repair</option>
      </optgroup>,
    ]);
    const selected = flatten(entries).find((c) => c.value === "loan:l1");
    expect(selected?.label).toBe("Car repair");
  });
});
