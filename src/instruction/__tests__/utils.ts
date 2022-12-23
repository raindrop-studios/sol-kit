import { convertTypeToType } from "../utils";
import {describe, expect, it} from "@jest/globals";

describe("Type conversion with convertTypeToType", () => {
  it("does nothing with no keys", () => {
      expect(
        convertTypeToType({a: 1}, [], "number", String)
      ).toEqual({a: 1});
  });
  it("only converts specified keys", () => {
      expect(
        convertTypeToType({a: 1, b: 2}, ["a"], "number", String)
      ).toEqual({a: "1", b: 2});
  });
  it("converts deeply nested variables", () => {
      expect(
        convertTypeToType({a: 1, b: {c: {d: 2}}}, ["b.c.d"], "number", String)
      ).toEqual({a: 1, b: {c: {d: "2"}}});
  });
  it("ignores variables of the wrong type", () => {
      expect(
        convertTypeToType({a: 1, b: "2"}, ["b"], "number", Boolean)
      ).toEqual({a: 1, b: "2"});
  });
  it("handles objects in top level array", () => {
    expect(
      convertTypeToType([{a: 1}, {a: 2}], ["[].a"], "number", String)
    ).toEqual([{a: "1"}, {a: "2"}])
  })
  it("handles objects nested in arrays", () => {
    expect(
      convertTypeToType({list: [{a: 1}, {a: 2}]}, ["list.[].a"], "number", String)
    ).toEqual({list: [{a: "1"}, {a: "2"}]})
  })
  it("handles nested arrays", () => {
    expect(
      convertTypeToType({list: [1, 2]}, ["list.[]"], "number", String)
    ).toEqual({list: ["1", "2"]})
  })
  it("handles top level arrays", () => {
    expect(
      convertTypeToType( [1, 2], ["[]"], "number", String)
    ).toEqual( ["1", "2"])
  })
  it("converts class instances", () => {
    class Something {
      returnMe : string;

      constructor(returnMe: string) {
        this.returnMe = returnMe
      }
    }
    expect(
      convertTypeToType(
        {instance: new Something("check")},
        ["instance"],
        Something,
        (arg: Something) => arg.returnMe)
    ).toEqual({instance: "check"})
  })
});