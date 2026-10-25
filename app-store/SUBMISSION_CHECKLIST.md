# iOS submission checklist

## 1. Apple and Expo accounts

- [x] Join the paid Apple Developer Program.
- [x] Create or sign in to an Expo account for EAS Build.
- [ ] Confirm the legal seller/developer name that should appear on the store.

## 2. Permanent identifiers

- [x] Choose the iOS bundle identifier `com.danielryan.snailhouse`.
- [x] Add it as `expo.ios.bundleIdentifier` in `app.json`.
- [ ] Do not choose casually: it identifies the app in Apple systems and should remain stable.
- [ ] Choose an internal App Store Connect SKU.

## 3. App assets and build configuration

- [x] Replace the Expo placeholder with an opaque 1024×1024 sRGB app icon.
- [x] Disable microphone, audio-recording, and background-audio capabilities; the game only plays short foreground sound effects.
- [ ] Replace the placeholder splash image before the production build.
- [ ] Add and configure `expo-splash-screen` if a custom launch screen is desired.
- [x] Set an iOS build number for the first build.
- [x] Create `eas.json` with a production build profile.
- [ ] Build and test a standalone iPhone preview build; Expo Go is not the submitted app.
- [ ] Verify local save restoration and the one-hour local notification on a physical iPhone.
- [x] Remove or ensure users cannot discover any debug-only controls.

## 4. Public pages and contact information

- [x] Publish the privacy policy at `https://hi-dad.github.io/snail-house-support/privacy.html`.
- [x] Publish the support page at `https://hi-dad.github.io/snail-house-support/support.html`.
- [x] Add privacy-policy and support links inside the app.
- [ ] Replace all bracketed placeholders in `APP_STORE_METADATA.md`.

## 5. App Store Connect record

- [ ] Create the app record using the exact bundle identifier.
- [ ] Enter the name, subtitle, description, keywords, categories, copyright, Support URL, and Privacy Policy URL.
- [ ] Complete the age-rating questionnaire.
- [ ] Complete export-compliance questions.
- [ ] Complete content-rights questions.
- [ ] Complete regional availability, pricing, and business/trader-status fields.
- [ ] Declare app privacy as “No data collected” only if the final binary still has no analytics, ads, accounts, cloud services, or tracking SDKs.

## 6. Screenshots and review

- [ ] Capture at least one real 6.9-inch iPhone screenshot; five are planned in `SCREENSHOT_PLAN.md`.
- [ ] Confirm every screenshot matches the submitted build.
- [ ] Provide App Review contact name, email, and phone.
- [ ] Add review notes explaining the local save and optional local notification.
- [ ] Upload the production build with EAS Submit.
- [ ] Test the uploaded build in TestFlight before sending it to App Review.

## Useful official documentation

- Apple app icons: https://developer.apple.com/design/human-interface-guidelines/app-icons
- Apple screenshot specifications: https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/
- Apple app privacy: https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy
- Expo app icons: https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/
- Expo iOS submission: https://docs.expo.dev/submit/ios/
