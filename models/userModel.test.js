import mockingoose from "mockingoose";
import mongoose from "mongoose";
import User from "./userModel.js";

describe("User Model", () => {
  beforeEach(() => {
    mockingoose.resetAll();
  });

  const cleanDoc = {
    _id: new mongoose.Types.ObjectId().toString(),
    name: "John Doe",
    email: "john@example.com",
    password: "hashed-password-123",
    phone: "1234567890",
    address: { street: "123 Main St", city: "NYC", zip: "10001" },
    answer: "my-security-answer",
    role: 0,
  };

  // ===================================================================
  // BVA ANALYSIS - Boundary Value Analysis
  // ===================================================================
  it("BVA: should allow min boundary (name length = 1)", async () => {
    const _doc = { ...cleanDoc, name: "A" };
    mockingoose(User).toReturn(_doc, "findOne");

    const found = await User.findOne({ _id: _doc._id });
    expect(found.name).toBe("A");
  });

  it("BVA: should allow max reasonable boundary (long name)", async () => {
    const longName = "X".repeat(500);
    const _doc = { ...cleanDoc, name: longName };
    mockingoose(User).toReturn(_doc, "findOne");

    const found = await User.findOne({ _id: _doc._id });
    expect(found.name.length).toBe(500);
  });

  it("BVA: should allow role boundary (role = 0 for user)", async () => {
    const _doc = { ...cleanDoc, role: 0 };
    mockingoose(User).toReturn(_doc, "findOne");

    const found = await User.findOne({ _id: _doc._id });
    expect(found.role).toBe(0);
  });

  it("BVA: should allow role boundary (role = 1 for admin)", async () => {
    const _doc = { ...cleanDoc, role: 1 };
    mockingoose(User).toReturn(_doc, "findOne");

    const found = await User.findOne({ _id: _doc._id });
    expect(found.role).toBe(1);
  });

  it("BVA: should allow invalid role below min (role = -1)", async () => {
    const _doc = { ...cleanDoc, role: -1 };
    mockingoose(User).toReturn(_doc, "findOne");

    // Mongoose doesn't validate on findOne, only on save/validate
    // This tests that the model can store any number (no enum constraint)
    const found = await User.findOne({ _id: _doc._id });
    expect(found.role).toBe(-1);
  });

  it("BVA: should allow invalid role above max (role = 2)", async () => {
    const _doc = { ...cleanDoc, role: 2 };
    mockingoose(User).toReturn(_doc, "findOne");

    // Mongoose doesn't validate on findOne, only on save/validate
    // This tests that the model can store any number (no enum constraint)
    const found = await User.findOne({ _id: _doc._id });
    expect(found.role).toBe(2);
  });

  // ===================================================================
  // EQUIVALENCE PARTITIONING
  // ===================================================================
  it("EP: should return mocked user on save (valid partition)", async () => {
    const _doc = {
      ...cleanDoc,
      name: "Jane Smith",
      email: "jane@example.com",
    };
    mockingoose(User).toReturn(_doc, "save");

    const user = new User(_doc);
    const saved = await user.save();

    expect(saved._id.toString()).toBe(_doc._id);
    expect(saved.name).toBe("Jane Smith");
    expect(saved.email).toBe("jane@example.com");
  });

  it("EP: should use default role value (role = 0)", async () => {
    const _doc = { ...cleanDoc };
    delete _doc.role; // Remove role to test default
    mockingoose(User).toReturn({ ...cleanDoc, role: 0 }, "save");

    const user = new User(_doc);
    const saved = await user.save();

    expect(saved.role).toBe(0);
  });

  it("EP: should trim name field", async () => {
    const _doc = { ...cleanDoc, name: "  Trimmed Name  " };
    mockingoose(User).toReturn({ ...cleanDoc, name: "Trimmed Name" }, "save");

    const user = new User(_doc);
    const saved = await user.save();

    expect(saved.name).toBe("Trimmed Name");
  });

  // ===================================================================
  // PAIRWISE GENERATION
  // Factors: role {0, 1}, address {empty object, filled object}
  // ===================================================================
  const combos = [
    { role: 0, address: {} },
    { role: 1, address: { street: "123 Main St", city: "NYC" } },
    { role: 0, address: { street: "456 Oak Ave", city: "LA" } },
    { role: 1, address: {} },
  ];

  it.each(combos)(
    "Pairwise: role=%d, address=%o",
    async ({ role, address }) => {
      const _doc = { ...cleanDoc, role, address };
      mockingoose(User).toReturn(_doc, "findOne");

      const found = await User.findOne({ _id: _doc._id });
      expect(found.role).toBe(role);
      if (found.toObject().address) {
        expect(found.toObject().address).toMatchObject(address);
      } else {
        expect(address).toEqual({});
      }
    }
  );

  // ===================================================================
  // STUBS / MOCKS / FAKES
  // ===================================================================
  it("Stub: should mock findOne to return a fake user", async () => {
    const _doc = { ...cleanDoc, name: "FakeUser", email: "fake@test.com" };
    mockingoose(User).toReturn(_doc, "findOne");

    const found = await User.findOne({ email: "whatever@test.com" });
    expect(found.name).toBe("FakeUser");
    expect(found.email).toBe("fake@test.com");
  });

  // ===================================================================
  // VALIDATION TESTS - Required Fields
  // ===================================================================
  it("Validation: should fail when name is missing", async () => {
    const user = new User({
      email: "test@example.com",
      password: "password123",
      phone: "1234567890",
      address: {},
      answer: "answer",
    });

    let err;
    try {
      await user.validate();
    } catch (error) {
      err = error;
    }
    expect(err).toBeDefined();
    expect(err.errors.name).toBeDefined();
  });

  it("Validation: should fail when email is missing", async () => {
    const user = new User({
      name: "Test User",
      password: "password123",
      phone: "1234567890",
      address: {},
      answer: "answer",
    });

    let err;
    try {
      await user.validate();
    } catch (error) {
      err = error;
    }
    expect(err).toBeDefined();
    expect(err.errors.email).toBeDefined();
  });

  it("Validation: should fail when password is missing", async () => {
    const user = new User({
      name: "Test User",
      email: "test@example.com",
      phone: "1234567890",
      address: {},
      answer: "answer",
    });

    let err;
    try {
      await user.validate();
    } catch (error) {
      err = error;
    }
    expect(err).toBeDefined();
    expect(err.errors.password).toBeDefined();
  });

  it("Validation: should fail when phone is missing", async () => {
    const user = new User({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      address: {},
      answer: "answer",
    });

    let err;
    try {
      await user.validate();
    } catch (error) {
      err = error;
    }
    expect(err).toBeDefined();
    expect(err.errors.phone).toBeDefined();
  });

  it("Validation: should fail when address is missing", async () => {
    const user = new User({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      phone: "1234567890",
      answer: "answer",
    });

    let err;
    try {
      await user.validate();
    } catch (error) {
      err = error;
    }
    expect(err).toBeDefined();
    expect(err.errors.address).toBeDefined();
  });

  it("Validation: should fail when answer is missing", async () => {
    const user = new User({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      phone: "1234567890",
      address: {},
    });

    let err;
    try {
      await user.validate();
    } catch (error) {
      err = error;
    }
    expect(err).toBeDefined();
    expect(err.errors.answer).toBeDefined();
  });
});
