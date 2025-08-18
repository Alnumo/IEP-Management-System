# مركز أركان النمو - دليل النشر (Deployment Guide)

## نظرة عامة (Overview)

هذا الدليل يوضح كيفية نشر تطبيق إدارة البرامج العلاجية على منصة Netlify.

This guide explains how to deploy the Therapy Plans Management application to Netlify.

## المتطلبات المسبقة (Prerequisites)

- Node.js 18 أو أحدث (Node.js 18 or newer)
- حساب Netlify (Netlify account)
- حساب Supabase مع قاعدة البيانات المُجهزة (Supabase account with configured database)

## خطوات النشر (Deployment Steps)

### 1. إعداد المتغيرات البيئية (Environment Variables)

في لوحة تحكم Netlify، قم بإضافة المتغيرات التالية:

In your Netlify dashboard, add the following environment variables:

```bash
VITE_SUPABASE_URL=your_production_supabase_url
VITE_SUPABASE_ANON_KEY=your_production_supabase_anon_key
VITE_APP_NAME=مركز أركان النمو
VITE_APP_VERSION=1.0.0
VITE_ENVIRONMENT=production
VITE_APP_DOMAIN=your-domain.com
```

### 2. إعداد قاعدة البيانات (Database Setup)

قم بتشغيل ملفات SQL في مجلد `database/` على قاعدة بيانات Supabase الإنتاجية:

Run the SQL files in the `database/` folder on your production Supabase database:

1. `001_create_tables.sql` - إنشاء الجداول (Create tables)
2. `002_create_policies.sql` - إنشاء سياسات الأمان (Create security policies)
3. `003_create_functions.sql` - إنشاء الدوال (Create functions)
4. `004_insert_sample_data.sql` - بيانات تجريبية (Sample data - optional)

### 3. إعدادات البناء (Build Settings)

```toml
# netlify.toml
[build]
  base = "."
  command = "npm run build:netlify"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"
```

### 4. النشر التلقائي (Automatic Deployment)

1. ادفع الكود إلى GitHub (Push code to GitHub)
2. اربط المستودع بـ Netlify (Connect repository to Netlify)
3. Netlify سيقوم بالنشر تلقائياً (Netlify will deploy automatically)

### 5. النشر اليدوي (Manual Deployment)

```bash
# بناء التطبيق للإنتاج (Build for production)
npm run build

# نشر على Netlify (Deploy to Netlify)
npm run deploy
```

### 6. نشر معاينة (Preview Deployment)

```bash
# نشر معاينة (Deploy preview)
npm run deploy:preview
```

## التحقق من النشر (Deployment Verification)

بعد النشر، تأكد من:

After deployment, verify:

- ✅ يتم تحميل التطبيق بشكل صحيح (Application loads correctly)
- ✅ تعمل الترجمة العربية/الإنجليزية (Arabic/English translation works)
- ✅ تعمل وظائف إدارة البرامج (Plan management functions work)
- ✅ تعمل وظائف إدارة الفئات (Category management functions work)
- ✅ التصميم متجاوب على الهواتف (Responsive design on mobile)

## حل المشاكل (Troubleshooting)

### خطأ في المتغيرات البيئية (Environment Variables Error)
```
Error: Missing Supabase environment variables
```
**الحل (Solution)**: تأكد من إضافة جميع المتغيرات البيئية المطلوبة في إعدادات Netlify

### خطأ في قاعدة البيانات (Database Error)
```
Error: relation "therapy_plans" does not exist
```
**الحل (Solution)**: تأكد من تشغيل ملفات SQL في قاعدة البيانات

### خطأ في البناء (Build Error)
```
TypeScript compilation failed
```
**الحل (Solution)**: قم بتشغيل `npm run type-check` للتحقق من الأخطاء

## الأمان (Security)

- 🔒 تأكد من تفعيل Row Level Security في Supabase
- 🔒 لا تشارك مفاتيح API الحساسة
- 🔒 استخدم HTTPS في الإنتاج
- 🔒 قم بمراجعة سياسات الوصول بانتظام

## المراقبة (Monitoring)

- 📊 راقب أداء التطبيق عبر Netlify Analytics
- 📊 راقب قاعدة البيانات عبر Supabase Dashboard
- 📊 فعّل تقارير الأخطاء (اختياري)

## الدعم (Support)

للمساعدة في النشر، راجع:
- [وثائق Netlify](https://docs.netlify.com/)
- [وثائق Supabase](https://supabase.com/docs)
- [دليل React + Vite](https://vitejs.dev/guide/)

---

**آخر تحديث**: يناير 2025  
**النسخة**: 1.0.0