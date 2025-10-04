import mockingoose from "mockingoose";
import mongoose from "mongoose";
import Category from "./categoryModel.js";

describe("Category Model", () => {
  beforeEach(() => {
    mockingoose.resetAll();
  });

  const cleanDoc = {
    _id: new mongoose.Types.ObjectId().toString(),
    name: "Electronics",
    slug: "electronics",
  };

  // ===================================================================
  // BVA ANALYSIS
  // ===================================================================
  it("BVA: should allow min boundary (name length = 1)", async () => {
    const _doc = { ...cleanDoc, name: "A", slug: "a" };
    mockingoose(Category).toReturn(_doc, "findOne");

    const found = await Category.findOne({ _id: _doc._id });
    expect(found.name).toBe("A");
    expect(found.slug).toBe("a");
  });

  it("BVA: should allow max reasonable boundary (long name)", async () => {
    const longName = "X".repeat(500);
    const _doc = { ...cleanDoc, name: longName, slug: longName.toLowerCase() };
    mockingoose(Category).toReturn(_doc, "findOne");

    const found = await Category.findOne({ _id: _doc._id });
    expect(found.name.length).toBe(500);
  });

  // ===================================================================
  // EQUIVALENCE PARTITIONING
  // ===================================================================
  it("EP: should return mocked category on save", async () => {
    const _doc = { ...cleanDoc, name: "Books", slug: "books" };
    mockingoose(Category).toReturn(_doc, "save");

    const cat = new Category(_doc);
    const saved = await cat.save();

    expect(saved._id.toString()).toBe(_doc._id);
    expect(saved.name).toBe("Books");
    expect(saved.slug).toBe("books");
  });

  it("EP: should allow missing slug (valid partition)", async () => {
    const _doc = { ...cleanDoc, slug: undefined };
    mockingoose(Category).toReturn(_doc, "save");

    const cat = new Category(_doc);
    const saved = await cat.save();

    expect(saved.name).toBe("Electronics");
    expect(saved.slug).toBeUndefined();
  });

  // ===================================================================
  // PAIRWISE GENERATION
  // Factors: name {empty, non-empty}, slug {empty, uppercase, lowercase}
  // ===================================================================
  const combos = [
    { name: "", slug: "" },
    { name: "", slug: "ABC" },
    { name: "Phones", slug: "" },
    { name: "Phones", slug: "ABC" },
    { name: "Phones", slug: "phones" },
  ];

  it.each(combos)("Pairwise: name='%s', slug='%s'", async ({ name, slug }) => {
    const _doc = { ...cleanDoc, name, slug };
    mockingoose(Category).toReturn(_doc, "findOne");

    const found = await Category.findOne({ _id: _doc._id });
    expect(found.name).toBe(name);
    expect(found.slug).toBe(slug.toLowerCase());
  });

  // ===================================================================
  // STUBS / MOCKS / FAKES
  // ===================================================================
  it("Stub: should mock findOne to return a fake category", async () => {
    const _doc = { ...cleanDoc, name: "FakeCat", slug: "fakecat" };
    mockingoose(Category).toReturn(_doc, "findOne");

    const found = await Category.findOne({ name: "whatever" });
    expect(found.name).toBe("FakeCat");
    expect(found.slug).toBe("fakecat");
  });

  it("Validation: should fail when name is empty string", async () => {
    const cat = new Category({ name: "", slug: "empty" });

    let err;
    try {
      await cat.validate();
    } catch (error) {
      err = error;
    }
    expect(err).toBeDefined();
    expect(err.errors.name).toBeDefined();
  });
});
