import mockingoose from "mockingoose";
import mongoose from "mongoose";
import Product from "./productModel.js";

describe("Product Model", () => {
  beforeEach(() => {
    mockingoose.resetAll();
  });

  const cleanDoc = {
    _id: new mongoose.Types.ObjectId().toString(),
    name: "Laptop",
    slug: "laptop",
    description: "High performance laptop",
    price: 720,
    category: new mongoose.Types.ObjectId().toString(),
    quantity: 10,
    photo: {
      data: Buffer.from("fake-image-data"),
      contentType: "image/jpeg",
    },
    shipping: true,
  };

  // ===================================================================
  // BVA ANALYSIS - Boundary Value Analysis
  // ===================================================================
  it("BVA: should allow min boundary (price = 0)", async () => {
    const _doc = { ...cleanDoc, price: 0 };
    mockingoose(Product).toReturn(_doc, "findOne");

    const found = await Product.findOne({ _id: _doc._id });
    expect(found.price).toBe(0);
  });

  it("BVA: should allow min boundary (quantity = 0)", async () => {
    const _doc = { ...cleanDoc, quantity: 0 };
    mockingoose(Product).toReturn(_doc, "findOne");

    const found = await Product.findOne({ _id: _doc._id });
    expect(found.quantity).toBe(0);
  });

  it("BVA: should allow invalid boundary below min (price = -1)", async () => {
    const _doc = { ...cleanDoc, price: -1 };
    mockingoose(Product).toReturn(_doc, "findOne");

    // Mongoose doesn't validate on findOne, only on save/validate
    // This tests that negative prices can be stored (model has no min constraint)
    const found = await Product.findOne({ _id: _doc._id });
    expect(found.price).toBe(-1);
  });

  it("BVA: should allow invalid boundary below min (quantity = -1)", async () => {
    const _doc = { ...cleanDoc, quantity: -1 };
    mockingoose(Product).toReturn(_doc, "findOne");

    // Mongoose doesn't validate on findOne, only on save/validate
    // This tests that negative quantities can be stored (model has no min constraint)
    const found = await Product.findOne({ _id: _doc._id });
    expect(found.quantity).toBe(-1);
  });

  it("BVA: should allow min boundary (name length = 1)", async () => {
    const _doc = { ...cleanDoc, name: "X", slug: "x" };
    mockingoose(Product).toReturn(_doc, "findOne");

    const found = await Product.findOne({ _id: _doc._id });
    expect(found.name).toBe("X");
    expect(found.slug).toBe("x");
  });

  it("BVA: should allow max reasonable boundary (long description)", async () => {
    const longDesc = "X".repeat(1000);
    const _doc = { ...cleanDoc, description: longDesc };
    mockingoose(Product).toReturn(_doc, "findOne");

    const found = await Product.findOne({ _id: _doc._id });
    expect(found.description.length).toBe(1000);
  });

  // ===================================================================
  // EQUIVALENCE PARTITIONING
  // ===================================================================
  it("EP: should return mocked product on save (valid partition)", async () => {
    const _doc = { ...cleanDoc, name: "Phone", slug: "phone", price: 599 };
    mockingoose(Product).toReturn(_doc, "save");

    const product = new Product(_doc);
    const saved = await product.save();

    expect(saved._id.toString()).toBe(_doc._id);
    expect(saved.name).toBe("Phone");
    expect(saved.slug).toBe("phone");
    expect(saved.price).toBe(599);
  });

  it("EP: should save product with photo data (valid partition)", async () => {
    const _doc = {
      ...cleanDoc,
      photo: {
        data: Buffer.from("test-photo-data"),
        contentType: "image/png",
      },
    };
    mockingoose(Product).toReturn(_doc, "save");

    const product = new Product(_doc);
    const saved = await product.save();

    expect(saved.name).toBe("Laptop");
    expect(saved.toObject().photo.contentType).toBe("image/png");
  });

  it("EP: should allow missing shipping (valid partition)", async () => {
    const _doc = { ...cleanDoc, shipping: undefined };
    mockingoose(Product).toReturn(_doc, "save");

    const product = new Product(_doc);
    const saved = await product.save();

    expect(saved.shipping).toBeUndefined();
  });

  // ===================================================================
  // PAIRWISE GENERATION
  // Factors: shipping {true, false, undefined}, quantity {0, positive}
  // ===================================================================
  const combos = [
    { shipping: true, quantity: 0 },
    { shipping: false, quantity: 10 },
    { shipping: undefined, quantity: 0 },
    { shipping: true, quantity: 100 },
  ];

  it.each(combos)(
    "Pairwise: shipping=%s, quantity=%d",
    async ({ shipping, quantity }) => {
      const _doc = { ...cleanDoc, shipping, quantity };
      mockingoose(Product).toReturn(_doc, "findOne");

      const found = await Product.findOne({ _id: _doc._id });
      expect(found.shipping).toBe(shipping);
      expect(found.quantity).toBe(quantity);
    }
  );

  // ===================================================================
  // STUBS / MOCKS / FAKES
  // ===================================================================
  it("Stub: should mock findOne to return a fake product", async () => {
    const _doc = { ...cleanDoc, name: "FakeProduct", slug: "fakeproduct" };
    mockingoose(Product).toReturn(_doc, "findOne");

    const found = await Product.findOne({ name: "whatever" });
    expect(found.name).toBe("FakeProduct");
    expect(found.slug).toBe("fakeproduct");
  });

  // ===================================================================
  // VALIDATION TESTS - Required Fields
  // ===================================================================
  it("Validation: should fail when name is missing", async () => {
    const product = new Product({
      slug: "test",
      description: "test",
      price: 100,
      category: new mongoose.Types.ObjectId().toString(),
      quantity: 5,
    });

    let err;
    try {
      await product.validate();
    } catch (error) {
      err = error;
    }
    expect(err).toBeDefined();
    expect(err.errors.name).toBeDefined();
  });

  it("Validation: should fail when slug is missing", async () => {
    const product = new Product({
      name: "Test Product",
      description: "test",
      price: 100,
      category: new mongoose.Types.ObjectId().toString(),
      quantity: 5,
    });

    let err;
    try {
      await product.validate();
    } catch (error) {
      err = error;
    }
    expect(err).toBeDefined();
    expect(err.errors.slug).toBeDefined();
  });

  it("Validation: should fail when description is missing", async () => {
    const product = new Product({
      name: "Test Product",
      slug: "test-product",
      price: 100,
      category: new mongoose.Types.ObjectId().toString(),
      quantity: 5,
    });

    let err;
    try {
      await product.validate();
    } catch (error) {
      err = error;
    }
    expect(err).toBeDefined();
    expect(err.errors.description).toBeDefined();
  });

  it("Validation: should fail when price is missing", async () => {
    const product = new Product({
      name: "Test Product",
      slug: "test-product",
      description: "test",
      category: new mongoose.Types.ObjectId().toString(),
      quantity: 5,
    });

    let err;
    try {
      await product.validate();
    } catch (error) {
      err = error;
    }
    expect(err).toBeDefined();
    expect(err.errors.price).toBeDefined();
  });

  it("Validation: should fail when category is missing", async () => {
    const product = new Product({
      name: "Test Product",
      slug: "test-product",
      description: "test",
      price: 100,
      quantity: 5,
    });

    let err;
    try {
      await product.validate();
    } catch (error) {
      err = error;
    }
    expect(err).toBeDefined();
    expect(err.errors.category).toBeDefined();
  });

  it("Validation: should fail when quantity is missing", async () => {
    const product = new Product({
      name: "Test Product",
      slug: "test-product",
      description: "test",
      price: 100,
      category: new mongoose.Types.ObjectId().toString(),
    });

    let err;
    try {
      await product.validate();
    } catch (error) {
      err = error;
    }
    expect(err).toBeDefined();
    expect(err.errors.quantity).toBeDefined();
  });
});
