# Daktar Serial — Domain Change Guide (ভবিষ্যতে ডোমেন পরিবর্তনের নিয়মাবলী)

এই নির্দেশিকাটিতে ব্যাখ্যা করা হয়েছে কীভাবে আপনার **Daktar Serial** ওয়েব ও অ্যান্ড্রয়েড (Capacitor) অ্যাপে ভবিষ্যতের যেকোনো সময় ডোমেন পরিবর্তন করবেন।

---

## বর্তমান কনফিগারেশন (Current Configuration)
- **বর্তমান প্রোডাকশন ডোমেন (Current Domain):** `https://dakatarseial.bd`
- **অ্যান্ড্রয়েড অ্যাপ্লিকেশন আইডি (Package ID):** `bd.daktarserial.app`
- **অ্যাপের নাম (App Name):** `Daktar Serial`

---

## ১. কেন্দ্রীয় কনফিগারেশন ফাইল (Centralized Environment)

প্রজেক্টের মূল রুটে `.env` এবং `.env.example` ফাইলে সেন্ট্রালাইজড ভ্যারিয়েবল সংরক্ষিত আছে:

```env
# Centralized Frontend & Mobile App Configuration
VITE_API_URL=https://dakatarseial.bd
VITE_APP_URL=https://dakatarseial.bd

# Server-Side OpenGraph & SEO Callbacks
APP_URL=https://dakatarseial.bd
```

### এই ভ্যারিয়েবলগুলোর কাজ:
1. **`VITE_API_URL`**: অ্যান্ড্রয়েড অ্যাপ এবং ফ্রন্টএন্ড থেকে এক্সপ্রেস ব্যাকএন্ডে API রিকোয়েস্ট পাঠানোর জন্য ব্যবহৃত হয়।
2. **`VITE_APP_URL`**: ডক্টর প্রোফাইল শেয়ারিং লিংক, সোশ্যাল শেয়ার (Facebook, WhatsApp, Messenger), কিউআর কোড এবং পাবলিক লিংক জেনারেট করার জন্য ব্যবহৃত হয়।
3. **`APP_URL`**: এক্সপ্রেস সার্ভার থেকে ফেসবুক ও গুগল ক্রলারের জন্য সঠিক OpenGraph ও Twitter মেটাট্যাগ তৈরি করতে ব্যবহৃত হয়।

---

## ২. ডোমেন পরিবর্তন করলে যা **স্বয়ংক্রিয়ভাবে আপডেট হবে** (Automatically Updated)

যখন আপনি শুধু `.env` ফাইলে নতুন ডোমেন বসিয়ে অ্যাপটি বিল্ড করবেন, তখন নিচের সব ফাংশনালিটি স্বয়ংক্রিয়ভাবে নতুন ডোমেনে আপডেট হয়ে যাবে:

| কম্পোনেন্ট | কীভাবে কাজ করে |
| :--- | :--- |
| **API Requests (`window.fetch`)** | `src/config/api.ts`-এর মাধ্যমে সমস্ত `/api/*` কল স্বয়ংক্রিয়ভাবে নতুন `VITE_API_URL`-এ পাঠাবে। |
| **Doctor Profile Share Link** | `DoctorShareModal.tsx` এবং `DoctorProfilePage.tsx` সরাসরি `getDoctorProfileUrl()` ব্যবহার করে নতুন `VITE_APP_URL` দিয়ে শেয়ার লিংক তৈরি করবে। |
| **Copy Link & Social Share** | ফেসবুক, হোয়াটসঅ্যাপ, মেসেঞ্জার ও ক্লিপবোর্ড কপিতে স্বয়ংক্রিয়ভাবে নতুন ডোমেনের লিংক যাবে। |
| **Express CORS Whitelist** | `server.ts` সার্ভার স্টার্ট হওয়ার সময় `process.env.APP_URL` ও `process.env.VITE_APP_URL` থেকে হোস্টনেম বের করে স্বয়ংক্রিয়ভাবে CORS এলাউ করে দেয়। |
| **SEO & OpenGraph Tags** | `server/doctorMeta.ts` সার্ভার রেন্ডারিংয়ের সময় নতুন ডোমেনের ক্যানোনিকাল ও মেটাট্যাগ ইনজেক্ট করবে। |
| **In-App Deep Link Router** | `capacitorService.ts`-এ কোনো ডোমেন হার্ডকোড নেই; যেকোনো ডোমেন থেকে লিংকে ট্যাপ করলে তা স্বয়ংক্রিয়ভাবে পাথ (`/doctor/:slug`) অনুযায়ী সঠিক পেজ খুলে দেয়। |

---

## ৩. ডোমেন পরিবর্তন করলে যা **ম্যানুয়ালি আপডেট করতে হবে** (Must Be Updated Manually)

অ্যান্ড্রয়েড অপারেটিং সিস্টেমের কিছু নেটিভ ফাইলের নিয়মের কারণে মাত্র **১টি ফাইলে** ম্যানুয়ালি নতুন ডোমেনের নাম বসাতে হবে:

### ক) `android/app/src/main/AndroidManifest.xml`
অ্যান্ড্রয়েড ওএস-এর **App Links (Deep Linking)** ফিচারের জন্য ডোমেনের হোস্টনেম স্ট্যাটিক্যালি উল্লেখ থাকতে হয়:

```xml
<!-- Deep Link for Doctor Profiles -->
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <!-- এখানে আপনার নতুন ডোমেন বসান (যেমন: newdomain.com) -->
    <data android:scheme="https" android:host="dakatarseial.bd" android:pathPrefix="/doctor" />
</intent-filter>
```
*ভবিষ্যতে যদি নতুন ডোমেন `newdomain.com` হয়, তবে এখানে `android:host="newdomain.com"` লিখবেন।*

### খ) নতুন ডোমেনের সার্ভারে Digital Asset Links (`assetlinks.json`)
যদি আপনি চান যে ব্যবহারকারী ব্রাউজারে লিংক ক্লিক করার সাথে সাথে সরাসরি অ্যাপ ওপেন হোক, তবে নতুন ডোমেনের রুটে এই ফাইলটি আপলোড করতে হবে:
`https://newdomain.com/.well-known/assetlinks.json`

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "bd.daktarserial.app",
    "sha256_cert_fingerprints": ["YOUR_KEYSTORE_SHA256_FINGERPRINT"]
  }
}]
```

---

## ৪. ভবিষ্যৎ ডোমেন পরিবর্তনের ধাপসমূহ (Step-by-Step Example)

ধরি, ভবিষ্যতে আপনার নতুন ডোমেন হলো: `https://newdomain.com`

### ধাপ ১: `.env` ফাইল আপডেট করুন
```env
VITE_API_URL=https://newdomain.com
VITE_APP_URL=https://newdomain.com
APP_URL=https://newdomain.com
```

### ধাপ ২: `AndroidManifest.xml` আপডেট করুন
`android/app/src/main/AndroidManifest.xml` ফাইলে লাইন ৩১-এ যান:
```xml
<data android:scheme="https" android:host="newdomain.com" android:pathPrefix="/doctor" />
```

### ধাপ ৩: অ্যাপ বিল্ড ও সিঙ্ক করুন
নিচের কমান্ডগুলো ক্রমান্বয়ে টার্মিনালে রান করুন:

```bash
# ১. ফ্রন্টএন্ড ওয়েব অ্যাসেট বিল্ড করুন (এটি নতুন .env নিয়ে বান্ডেল তৈরি করবে)
npm run build

# ২. ক্যাপাসিটর অ্যান্ড্রয়েড প্রজেক্টের সাথে অ্যাসেট ও প্লাগইন সিঙ্ক করুন
npx cap sync android
```

### ধাপ ৪: নতুন অ্যান্ড্রয়েড APK / AAB বিল্ড করুন

#### Debug APK তৈরির জন্য:
```bash
cd android
./gradlew assembleDebug
```
*তৈরি হওয়া APK ফাইল লোকেশন:*
`android/app/build/outputs/apk/debug/app-debug.apk`

#### Production Signed Release APK তৈরির জন্য:
```bash
cd android
./gradlew assembleRelease
```
*তৈরি হওয়া APK ফাইল লোকেশন:*
`android/app/build/outputs/apk/release/app-release-unsigned.apk`

#### Google Play Store-এর জন্য Signed AAB (Android App Bundle) তৈরির জন্য:
```bash
cd android
./gradlew bundleRelease
```
*তৈরি হওয়া AAB ফাইল লোকেশন:*
`android/app/build/outputs/bundle/release/app-release.aab`

---

## ৫. সারাংশ (Summary Checklist)

| ধাপ | ফাইল | করণীয় |
| :--- | :--- | :--- |
| **১** | `.env` | `VITE_API_URL` ও `VITE_APP_URL`-এ নতুন ডোমেন দিন |
| **২** | `android/app/src/main/AndroidManifest.xml` | `android:host="..."`-এ নতুন ডোমেন দিন |
| **৩** | টার্মিনাল | `npm run build && npx cap sync android` |
| **৪** | টার্মিনাল | `cd android && ./gradlew assembleDebug` |

ব্যাস! আপনার পুরো Daktar Serial অ্যাপ্লিকেশন ও অ্যান্ড্রয়েড অ্যাপ নতুন ডোমেনে সম্পূর্ণ প্রস্তুত হয়ে যাবে।
