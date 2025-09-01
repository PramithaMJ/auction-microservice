#!/usr/bin/env node

// Sample script to create demo auction listings with emoji-friendly names
// Run this script after starting the services to populate with demo data

const axios = require('axios');

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';

// Sample auction items that will trigger different emoji icons
const sampleListings = [
  {
    title: "Vintage Rolex Watch Collection",
    description: "A rare collection of vintage Rolex watches from the 1960s-1980s. Excellent condition with original boxes and papers.",
    price: 150000, // $1,500.00
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
  },
  {
    title: "Classic Ferrari Sports Car",
    description: "1985 Ferrari Testarossa in pristine condition. Low mileage, recently serviced, and ready for a new owner.",
    price: 25000000, // $250,000.00
    expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 3 days from now
  },
  {
    title: "Abstract Modern Art Painting",
    description: "Original abstract painting by emerging artist. Oil on canvas, 48x36 inches. Perfect for contemporary spaces.",
    price: 500000, // $5,000.00
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 2 days from now
  },
  {
    title: "First Edition Harry Potter Book Set",
    description: "Complete first edition set of Harry Potter books, all signed by J.K. Rowling. Excellent collector's condition.",
    price: 1500000, // $15,000.00
    expiresAt: new Date(Date.now() + 36 * 60 * 60 * 1000), // 1.5 days from now
  },
  {
    title: "Professional Photography Camera Setup",
    description: "Canon EOS R5 with multiple lenses, tripods, and professional lighting equipment. Perfect for photographers.",
    price: 800000, // $8,000.00
    expiresAt: new Date(Date.now() + 60 * 60 * 60 * 1000), // 2.5 days from now
  },
  {
    title: "Diamond Engagement Ring Collection",
    description: "Stunning collection of diamond engagement rings, various cuts and sizes. GIA certified diamonds.",
    price: 2000000, // $20,000.00
    expiresAt: new Date(Date.now() + 84 * 60 * 60 * 1000), // 3.5 days from now
  },
  {
    title: "Latest iPhone Pro Max Bundle",
    description: "Brand new iPhone 15 Pro Max with accessories, wireless charger, and premium case. Factory sealed.",
    price: 150000, // $1,500.00
    expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
  },
  {
    title: "Gaming Laptop Computer Setup",
    description: "High-end gaming laptop with RTX 4080, 32GB RAM, and 2TB SSD. Includes gaming peripherals and monitor.",
    price: 400000, // $4,000.00
    expiresAt: new Date(Date.now() + 30 * 60 * 60 * 1000), // 30 hours from now
  },
  {
    title: "Antique Victorian Furniture Set",
    description: "Beautiful Victorian-era furniture set including dining table, chairs, and cabinet. Restored to original beauty.",
    price: 1200000, // $12,000.00
    expiresAt: new Date(Date.now() + 96 * 60 * 60 * 1000), // 4 days from now
  },
  {
    title: "Limited Edition Sports Memorabilia",
    description: "Rare collection of signed sports memorabilia including jerseys, balls, and photos from legendary athletes.",
    price: 750000, // $7,500.00
    expiresAt: new Date(Date.now() + 18 * 60 * 60 * 1000), // 18 hours from now
  },
  {
    title: "Designer Fashion Collection",
    description: "Curated collection of designer dresses and accessories from top fashion houses. Various sizes available.",
    price: 300000, // $3,000.00
    expiresAt: new Date(Date.now() + 54 * 60 * 60 * 1000), // 54 hours from now
  },
  {
    title: "Rare Collectible Comic Books",
    description: "Mint condition collectible comic books including first editions and rare variants. Marvel and DC collections.",
    price: 500000, // $5,000.00
    expiresAt: new Date(Date.now() + 42 * 60 * 60 * 1000), // 42 hours from now
  }
];

async function createSampleListings() {
  console.log(' Creating sample auction listings...');
  
  try {
    for (let i = 0; i < sampleListings.length; i++) {
      const listing = sampleListings[i];
      
      console.log(` Creating listing ${i + 1}/${sampleListings.length}: ${listing.title}`);
      
      // Create a simple form data (note: this won't actually upload images, but will use emoji icons)
      const formData = new FormData();
      formData.append('title', listing.title);
      formData.append('description', listing.description);
      formData.append('price', listing.price.toString());
      formData.append('expiresAt', listing.expiresAt.toISOString());
      
      // Create a dummy image file for the API (since image is required)
      const dummyImage = new Blob(['dummy'], { type: 'image/jpeg' });
      formData.append('image', dummyImage, 'dummy.jpg');
      
      try {
        const response = await axios.post(`${API_BASE_URL}/api/listings`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        console.log(` Created: ${listing.title}`);
      } catch (error) {
        console.log(` Failed to create: ${listing.title} - ${error.message}`);
      }
      
      // Add small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(' Sample listings creation completed!');
    console.log('💡 Visit http://localhost:3000/listings to see the new auction items with emoji icons!');
    
  } catch (error) {
    console.error(' Error creating sample listings:', error.message);
  }
}

// Run the script
if (require.main === module) {
  createSampleListings();
}

module.exports = { createSampleListings, sampleListings };
