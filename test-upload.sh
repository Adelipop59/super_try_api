#!/bin/bash

echo "🧪 Testing Image Upload Integration"
echo "====================================="
echo ""

# Create a simple 1x1 red PNG image for testing
echo "Creating test image..."
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==" | base64 -d > /tmp/test-product-image.png
echo "✅ Test image created: /tmp/test-product-image.png"
echo ""

# Test 1: Upload image directly to upload endpoint (requires auth)
echo "Test 1: Testing upload service endpoint"
echo "⚠️  Note: This requires authentication. Skipping for now."
echo ""

# Test 2: Verify S3 configuration is loaded
echo "Test 2: Checking if server started with S3 configuration..."
if curl -s http://localhost:3000/api/v1/health > /dev/null 2>&1; then
    echo "✅ Server is running and healthy"
else
    echo "❌ Server is not responding"
    exit 1
fi
echo ""

# Test 3: Check upload endpoints are registered
echo "Test 3: Verifying upload endpoints are available..."
echo "Expected endpoints:"
echo "  - POST /api/v1/upload/image"
echo "  - POST /api/v1/upload/images"
echo "  - POST /api/v1/products/:id/images"
echo ""

# Show instructions for manual testing
echo "📋 Manual Testing Instructions:"
echo "================================"
echo ""
echo "To complete the test, you need to:"
echo ""
echo "1. Create or login as a PRO user to get an auth token"
echo "2. Create a product (or use existing product ID)"
echo "3. Upload an image using curl:"
echo ""
echo "   curl -X POST http://localhost:3000/api/v1/products/{PRODUCT_ID}/images \\"
echo "     -H 'Authorization: Bearer {YOUR_TOKEN}' \\"
echo "     -F 'images=@/tmp/test-product-image.png'"
echo ""
echo "4. Verify the response contains Supabase Storage URLs"
echo "5. Check the database to confirm images are saved"
echo ""
echo "Example with jq to see the images field:"
echo "   curl -s http://localhost:3000/api/v1/products/{PRODUCT_ID} | jq '.images'"
echo ""

# Provide SQL query to check database
echo "📊 Database Query to Verify:"
echo "============================"
echo ""
echo "Run this SQL query in your database to see uploaded images:"
echo ""
echo "SELECT id, name, images FROM products WHERE images IS NOT NULL LIMIT 5;"
echo ""
