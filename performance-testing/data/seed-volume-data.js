import mongoose from "mongoose";
import dotenv from "dotenv"; 
import productModel from "../../models/productModel.js";
import categoryModel from "../../models/categoryModel.js";
import connectDB from "../../config/db.js";

// Load environment variables
dotenv.config();
// Helper function to generate realistic prices across all filter ranges
const generatePrice = () => {
  const priceRanges = [
    { min: 0, max: 19, weight: 0.15 },     
    { min: 20, max: 39, weight: 0.20 },   
    { min: 40, max: 59, weight: 0.25 },    
    { min: 60, max: 79, weight: 0.20 },   
    { min: 80, max: 99, weight: 0.10 },     
    { min: 100, max: 999, weight: 0.10 }  
  ];
  
  // Randomly select a price range based on weights
  const rand = Math.random();
  let cumulative = 0;
  
  for (const range of priceRanges) {
    cumulative += range.weight;
    if (rand <= cumulative) {
      // Generate price within selected range
      return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
    }
  }
  
  // Fallback
  return Math.floor(Math.random() * 100) + 1;
};

const seedVolumeData = async (productCount, categoryCount = 10) => {
  try {
    console.log(`\n> Seeding Volume Test Data`);
    console.log(`  Products: ${productCount}`);
    console.log(`  Categories: ${categoryCount}\n`);

    // Clear existing
    await productModel.deleteMany({});
    await categoryModel.deleteMany({});
    console.log("✓ Cleared existing data");

    // Create categories
    const categories = [];
    for (let i = 0; i < categoryCount; i++) {
      const cat = await categoryModel.create({
        name: `Category ${i + 1}`,
        slug: `category-${i + 1}`,
      });
      categories.push(cat);
    }
    console.log(`✓ Created ${categoryCount} categories`);

    // Create products in batches (faster)
    const BATCH_SIZE = 1000;
    let created = 0;
    const priceDistribution = { 
      '$0-19': 0, 
      '$20-39': 0, 
      '$40-59': 0, 
      '$60-79': 0, 
      '$80-99': 0, 
      '$100+': 0 
    };
    
    for (let i = 0; i < productCount; i += BATCH_SIZE) {
      const batch = [];
      const batchSize = Math.min(BATCH_SIZE, productCount - i);
      
      for (let j = 0; j < batchSize; j++) {
        const idx = i + j;
        const price = generatePrice();
        
        // Track price distribution
        if (price <= 19) priceDistribution['$0-19']++;
        else if (price <= 39) priceDistribution['$20-39']++;
        else if (price <= 59) priceDistribution['$40-59']++;
        else if (price <= 79) priceDistribution['$60-79']++;
        else if (price <= 99) priceDistribution['$80-99']++;
        else priceDistribution['$100+']++;
        
        batch.push({
          name: `Product ${idx + 1}`,
          slug: `product-${idx + 1}`,
          description: `Description for product ${idx + 1}`,
          price: price,
          category: categories[idx % categories.length]._id,
          quantity: Math.floor(Math.random() * 100) + 1,
          shipping: Math.random() > 0.5,
        });
      }
      
      await productModel.insertMany(batch);
      created += batch.length;
      console.log(`  Progress: ${created}/${productCount} products`);
    }

    console.log(`\n✓ Volume seeding complete!`);
    console.log(`  Total products: ${created}`);
    console.log(`  Total categories: ${categoryCount}`);
    console.log(`\n  Price Distribution:`);
    console.log(`    $0-19:    ${priceDistribution['$0-19']} (${(priceDistribution['$0-19']/created*100).toFixed(1)}%)`);
    console.log(`    $20-39:   ${priceDistribution['$20-39']} (${(priceDistribution['$20-39']/created*100).toFixed(1)}%)`);
    console.log(`    $40-59:   ${priceDistribution['$40-59']} (${(priceDistribution['$40-59']/created*100).toFixed(1)}%)`);
    console.log(`    $60-79:   ${priceDistribution['$60-79']} (${(priceDistribution['$60-79']/created*100).toFixed(1)}%)`);
    console.log(`    $80-99:   ${priceDistribution['$80-99']} (${(priceDistribution['$80-99']/created*100).toFixed(1)}%)`);
    console.log(`    $100+:    ${priceDistribution['$100+']} (${(priceDistribution['$100+']/created*100).toFixed(1)}%)`);
    console.log();
    
    process.exit(0);
  } catch (error) {
    console.error(`\n✗ Failed to seed volume data: ${error.message}`);
    process.exit(1);
  }
};

// Get volume level from command line argument
const volumeLevel = process.argv[2] || "small";
const volumeLevels = {
  small: 100,
  medium: 1000,
  large: 5000,
  xlarge: 10000,
};

const productCount = volumeLevels[volumeLevel] || parseInt(volumeLevel);
connectDB().then(() => seedVolumeData(productCount));