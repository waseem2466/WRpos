<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1xwmZjwtPwdWAdLpNhVwLR-Ce8KnlPMF7

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Build Android APK

**Prerequisites:**
- Java Development Kit (JDK)
- Android SDK

**Automated Build (Windows):**
Double-click `build_apk.bat` or run it from the command line:
`.\build_apk.bat`

**Manual Build:**
1. Build the web assets:
   `npm run build`
2. Sync with Capacitor:
   `npx cap sync`
3. Open in Android Studio:
   `npx cap open android`
   Then build from the "Build" menu > "Build Bundle(s) / APK(s)" > "Build APK(s)".
   OR run from command line:
   `cd android && gradlew assembleDebug`

The APK will be located at: `android/app/build/outputs/apk/debug/app-debug.apk`
