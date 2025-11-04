import mongoose from "mongoose";
import dotenv from "dotenv";
import categoryModel from "../../models/categoryModel.js";
import productModel from "../../models/productModel.js";
import slugify from "slugify";

// load env vars
dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URL);
    console.log(`> Connected to MongoDB: ${conn.connection.host}`);
  } catch (error) {
    console.error(`ERROR: MongoDB connection failed: ${error}`);
    process.exit(1);
  }
};

// create tiny placeholder image for products
const createPlaceholderImage = () => {
  const base64PNG =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  return Buffer.from(base64PNG, "base64");
};

const categories = [
  { name: "Electronics", slug: "electronics" },
  { name: "Clothing", slug: "clothing" },
  { name: "Books", slug: "books" },
  { name: "Home & Kitchen", slug: "home-kitchen" },
  { name: "Sports", slug: "sports" },
];

const productTemplates = {
  Electronics: [
    "Laptop",
    "Smartphone",
    "Headphones",
    "Tablet",
    "Smart Watch",
    "Camera",
    "Keyboard",
    "Mouse",
    "Monitor",
    "Speaker",
  ],
  Clothing: [
    "T-Shirt",
    "Jeans",
    "Dress",
    "Jacket",
    "Sneakers",
    "Hoodie",
    "Shorts",
    "Sweater",
    "Socks",
    "Hat",
  ],
  Books: [
    "Fiction Novel",
    "Science Book",
    "History Book",
    "Biography",
    "Cookbook",
    "Self-Help",
    "Travel Guide",
    "Children's Book",
    "Dictionary",
    "Art Book",
  ],
  "Home & Kitchen": [
    "Coffee Maker",
    "Blender",
    "Microwave",
    "Toaster",
    "Cookware Set",
    "Vacuum Cleaner",
    "Air Purifier",
    "Lamp",
    "Pillow",
    "Blanket",
  ],
  Sports: [
    "Yoga Mat",
    "Dumbbell Set",
    "Running Shoes",
    "Basketball",
    "Tennis Racket",
    "Swimming Goggles",
    "Bicycle",
    "Fitness Tracker",
    "Jump Rope",
    "Water Bottle",
  ],
};

// seed database with test data
const seedData = async () => {
  try {
    console.log("\n> Starting database seeding for stress testing\n");

    console.log("> Clearing existing products and categories");
    await productModel.deleteMany({});
    await categoryModel.deleteMany({});
    console.log("DONE: Cleared existing data\n");

    console.log("> Creating categories");
    const createdCategories = [];
    for (const cat of categories) {
      const category = await categoryModel.create(cat);
      createdCategories.push(category);
      console.log(`ADD: ${category.name}`);
    }
    console.log("");

    console.log("> Creating products");
    const placeholderImage = createPlaceholderImage();
    let productCount = 0;

    for (let i = 0; i < createdCategories.length; i++) {
      const category = createdCategories[i];
      const categoryName = category.name;
      const templates = productTemplates[categoryName];

      for (let j = 0; j < templates.length; j++) {
        const productName = templates[j];
        const product = await productModel.create({
          name: productName,
          slug: slugify(productName, { lower: true }),
          description: `High quality ${productName.toLowerCase()} for stress testing purposes`,
          price: Math.floor(Math.random() * 900) + 100,
          category: category._id,
          quantity: Math.floor(Math.random() * 50) + 10,
          photo: {
            data: placeholderImage,
            contentType: "image/png",
          },
          shipping: true,
        });
        productCount++;
        console.log(
          `ADD: ${productName} (${categoryName}) - $${product.price}`
        );
      }
    }

    console.log("\nDONE: Seeding complete\n");
    console.log("INFO: Summary");
    console.log(`  Categories: ${createdCategories.length}`);
    console.log(`  Products: ${productCount}`);
    console.log("\n> Ready for stress testing");
    console.log(
      `> Run: ./performance-testing/scenarios/homepage-browsing/run-stress-test.sh\n`
    );

    process.exit(0);
  } catch (error) {
    console.error(`\nERROR: Failed to seed data: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
};

connectDB().then(() => seedData());
