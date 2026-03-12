#!/bin/bash

echo "🌌 Cosmic Destiny - Mobile App Build"
echo "======================================"

echo ""
echo "Step 1: Building web assets..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Web build failed!"
  exit 1
fi

echo ""
echo "Step 2: Syncing to native platforms..."
npx cap sync

echo ""
echo "======================================"
echo "✅ Build complete!"
echo ""
echo "Next steps:"
echo ""
echo "📱 ANDROID:"
echo "  1. Download this project to your computer"
echo "  2. Open the 'android' folder in Android Studio"
echo "  3. Build > Generate Signed Bundle / APK"
echo "  4. Choose APK, sign with your keystore"
echo ""
echo "🍎 iOS:"
echo "  1. Download this project to a Mac"
echo "  2. cd ios/App && pod install"
echo "  3. Open ios/App/App.xcworkspace in Xcode"
echo "  4. Set your signing team and bundle ID"
echo "  5. Product > Archive > Distribute App"
echo ""
