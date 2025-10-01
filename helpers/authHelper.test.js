import { jest } from "@jest/globals";

await jest.unstable_mockModule("bcrypt", () => {
  const hash = jest.fn(() => "hashed-password");
  const compare = jest.fn(() => true);
  return { default: { hash, compare }, hash, compare };
});

const { default: bcyrpt } = await import("bcrypt");
const { hashPassword, comparePassword } = await import("./authHelper.js");

describe("Auth Helper", () => {
  describe("hashPassword", () => {
    it("should return hashed password", async () => {
      const password = "test123";
      const hashedPassword = await hashPassword(password);
      expect(hashedPassword).toBe("hashed-password");
      expect(bcyrpt.hash).toHaveBeenCalledWith(password, 10);
    });

    it("should return null if an error occurs", async () => {
      const password = "test123";
      bcyrpt.hash.mockImplementationOnce(() => {
        throw new Error("Hash error occurred");
      });
      const hashedPassword = await hashPassword(password);
      expect(hashedPassword).toBeNull();
      expect(bcyrpt.hash).toHaveBeenCalledWith(password, 10);
    });
  });

  describe("comparePassword", () => {
    it("should return true if the correct password and hashed password are provided", async () => {
      bcyrpt.compare.mockResolvedValueOnce(true);
      const password = "test123";
      const hashedPassword = "hashed-password";
      const match = await comparePassword(password, hashedPassword);
      expect(match).toBe(true);
      expect(bcyrpt.compare).toHaveBeenCalledWith(password, hashedPassword);
    });

    it("should return false if the incorrect password and hashed password are provided", async () => {
      bcyrpt.compare.mockResolvedValueOnce(false);
      const password = "wrongpassword123";
      const hashedPassword = "hashed-password";
      const match = await comparePassword(password, hashedPassword);
      expect(match).toBe(false);
      expect(bcyrpt.compare).toHaveBeenCalledWith(password, hashedPassword);
    });
  });
});
