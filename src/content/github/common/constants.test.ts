import {
  animationName,
  animationDefinitionId,
  animationAttachmentId,
  seenClassName,
  colors,
} from "./constants";

describe("Constants", () => {
  describe("animationName", () => {
    it("should be a string with the correct value", () => {
      expect(animationName).toBe("codecov-gh-observer");
      expect(typeof animationName).toBe("string");
    });
  });

  describe("animationDefinitionId", () => {
    it("should be constructed from animationName with suffix", () => {
      expect(animationDefinitionId).toBe("codecov-gh-observer-keyframe");
      expect(typeof animationDefinitionId).toBe("string");
      expect(animationDefinitionId).toContain(animationName);
      expect(animationDefinitionId).toContain("-keyframe");
    });
  });

  describe("animationAttachmentId", () => {
    it("should be constructed from animationName with attachment suffix", () => {
      expect(animationAttachmentId).toBe("codecov-gh-observer-attachment");
      expect(typeof animationAttachmentId).toBe("string");
      expect(animationAttachmentId).toContain(animationName);
      expect(animationAttachmentId).toContain("-attachment");
    });
  });

  describe("seenClassName", () => {
    it("should be a string with the correct value", () => {
      expect(seenClassName).toBe("codecov-seen-mark");
      expect(typeof seenClassName).toBe("string");
    });
  });

  describe("colors", () => {
    it("should have all color properties defined with correct values", () => {
      expect(colors.redAlpha).toBe("rgba(245,32,32,0.25)");
      expect(colors.greenAlpha).toBe("rgba(33,181,119,0.25)");
      expect(colors.yellowAlpha).toBe("rgba(244,176,27,0.25)");
      expect(colors.red).toBe("rgb(245,32,32)");
      expect(colors.green).toBe("rgb(33,181,119)");
      expect(colors.yellow).toBe("rgb(244,176,27)");
    });

    it("should have all color properties as strings", () => {
      expect(typeof colors.redAlpha).toBe("string");
      expect(typeof colors.greenAlpha).toBe("string");
      expect(typeof colors.yellowAlpha).toBe("string");
      expect(typeof colors.red).toBe("string");
      expect(typeof colors.green).toBe("string");
      expect(typeof colors.yellow).toBe("string");
    });

    it("should have rgba colors with proper format", () => {
      expect(colors.redAlpha).toMatch(/^rgba\(\d+,\d+,\d+,[0-9.]+\)$/);
      expect(colors.greenAlpha).toMatch(/^rgba\(\d+,\d+,\d+,[0-9.]+\)$/);
      expect(colors.yellowAlpha).toMatch(/^rgba\(\d+,\d+,\d+,[0-9.]+\)$/);
    });

    it("should have rgb colors with proper format", () => {
      expect(colors.red).toMatch(/^rgb\(\d+,\d+,\d+\)$/);
      expect(colors.green).toMatch(/^rgb\(\d+,\d+,\d+\)$/);
      expect(colors.yellow).toMatch(/^rgb\(\d+,\d+,\d+\)$/);
    });
  });

  describe("Relationships between constants", () => {
    it("animationDefinitionId should be based on animationName", () => {
      expect(animationDefinitionId).toBe(`${animationName}-keyframe`);
    });

    it("animationAttachmentId should be based on animationName", () => {
      expect(animationAttachmentId).toBe(`${animationName}-attachment`);
    });
  });
});