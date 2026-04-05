# উদ্ভিদ গোয়েন্দা (Plant Detective) — Expo Mobile App

AI-চালিত CABI Plantwise ফসল রোগ নির্ণয় মোবাইল অ্যাপ। বাংলাদেশের কৃষকদের জন্য তৈরি।

## প্রকল্প স্ট্রাকচার

```
expo-mobile/
├── app.json              # Expo app configuration
├── eas.json              # EAS Build configuration (Play Store)
├── tsconfig.json         # TypeScript configuration
├── package.json          # Dependencies
├── index.tsx             # Expo Router entry point
├── app/
│   ├── _layout.tsx       # Root layout (splash screen, status bar)
│   └── index.tsx         # Main screen (WebView + native bridge)
├── assets/
│   ├── icon.png          # App icon (1024x1024)
│   ├── adaptive-icon.png # Android adaptive icon
│   ├── splash.png        # Splash screen image
│   └── favicon.png       # Web favicon
├── play-store-metadata/
│   └── en-US/
│       └── listing.json  # Play Store listing metadata
├── privacy-policy.html   # Hosted privacy policy (for Play Store)
└── privacy-policy.docx   # Privacy policy document
```

## আর্কিটেকচার

**WebView + Native Bridge** pattern:
- React Native shell wraps the existing web app (cabi-diagnosis.vercel.app)
- Native bridge provides: camera, gallery, sharing, external browser
- WebView handles: all UI, games, diagnosis, TTS, offline engine
- Preserves 100% of existing web app functionality

## ডেভেলপার তথ্য

- **নাম:** আবু মো. মনিরুজ্জামান
- **পদবি:** অতিরিক্ত উপপরিচালক (কৃষি)
- **সংস্থা:** কৃষি সম্প্রসারণ অধিদপ্তর (DAE), কুড়িগ্রাম
- **ইমেইল:** mithun.hstu@gmail.com
- **ফোন:** +8801712663740
- **GitHub:** github.com/moniruzjaman/cabi-diagnosis

## সেটআপ

```bash
cd expo-mobile
npm install
npx expo start
```

## বিল্ড ও ডিপ্লয়

```bash
# Preview APK (for testing)
eas build --platform android --profile preview

# Production AAB (for Play Store)
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android --profile production
```

## প্লে স্টোর প্রস্তুতি চেকলিস্ট

- [x] app.json with package name (gov.dae.cabi.plantdetective)
- [x] App icon (1024x1024, adaptive icon)
- [x] Splash screen
- [x] Privacy policy (HTML + DOCX)
- [x] Play Store listing metadata
- [x] Camera & storage permissions (Bengali descriptions)
- [x] Native share functionality
- [x] Offline error screen
- [x] Android back button handling
- [x] External link handling (browser)
- [ ] Google Play Console account setup
- [ ] Service account key for EAS Submit
- [ ] Content rating questionnaire
- [ ] Target API level 33+ (handled by Expo 52)
- [ ] Signed release build
