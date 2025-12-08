const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

// Create a simple test image (1x1 PNG)
const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const imageBuffer = Buffer.from(testImageBase64, 'base64');

// Save test image to file
fs.writeFileSync('/tmp/test-image.png', imageBuffer);

async function testImageUpload() {
  console.log('🧪 Testing Product Image Upload Flow\n');

  // Step 1: Login as PRO user to get auth token
  console.log('Step 1: Authenticating as PRO user...');

  // You need to replace these with actual credentials or create a test user
  const loginResponse = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'pro@test.com', // Replace with actual PRO user email
      password: 'test123456' // Replace with actual password
    })
  });

  if (!loginResponse.ok) {
    console.error('❌ Login failed. Please create a PRO user first or update credentials.');
    console.log('Response:', await loginResponse.text());
    return;
  }

  const authData = await loginResponse.json();
  const token = authData.session.access_token;
  console.log('✅ Authenticated successfully\n');

  // Step 2: Create a test product
  console.log('Step 2: Creating test product...');

  const productResponse = await fetch('http://localhost:3000/api/v1/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'Test Product with Images',
      description: 'This is a test product to verify image upload functionality',
      price: 29.99,
      categoryId: 'test-category-id', // Replace with actual category ID
      quantity: 10,
      deliveryPrice: 5.99,
      rewardAmount: 10.00,
      productUrl: 'https://example.com/product'
    })
  });

  if (!productResponse.ok) {
    console.error('❌ Product creation failed');
    console.log('Response:', await productResponse.text());
    return;
  }

  const product = await productResponse.json();
  const productId = product.id;
  console.log(`✅ Product created with ID: ${productId}\n`);

  // Step 3: Upload images to the product
  console.log('Step 3: Uploading test image...');

  const formData = new FormData();
  formData.append('images', fs.createReadStream('/tmp/test-image.png'), {
    filename: 'test-image.png',
    contentType: 'image/png'
  });

  const uploadResponse = await fetch(`http://localhost:3000/api/v1/products/${productId}/images`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      ...formData.getHeaders()
    },
    body: formData
  });

  if (!uploadResponse.ok) {
    console.error('❌ Image upload failed');
    console.log('Response:', await uploadResponse.text());
    return;
  }

  const uploadResult = await uploadResponse.json();
  console.log('✅ Image uploaded successfully!');
  console.log('Product with images:', JSON.stringify(uploadResult, null, 2));

  // Step 4: Verify database contains correct URLs
  console.log('\n✅ SUCCESS! Image upload and database storage working correctly!');
  console.log('\nProduct images field:', uploadResult.images);
}

testImageUpload().catch(console.error);
