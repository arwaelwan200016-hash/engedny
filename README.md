# انجدني — نسخة Node / Electron

تطبيق محلي مبني بـ Node.js وSQLite. لا يحتاج Python أو Tkinter.

## التشغيل

Double-click `run-engedny-node.cmd`, then open `http://localhost:3000`.

Demo customer login: `ahmed@engedny.local` / `Demo1234`.

For development:

```powershell
cd "EngednyNode"
pnpm start
```

## الوظائف المنفذة

- واجهة عربية RTL بأسلوب Claymorphism.
- اختيار الدور: عميل أو مقدم خدمة، ثم تسجيل دخول أو إنشاء حساب.
- نموذج موسع لمقدم الخدمة: الخدمة، المدينة، الخبرة، السعر، والنبذة.
- بحث عن مقدمي الخدمات والخدمات.
- عرض الملف الشخصي لمقدم الخدمة وإضافته للمفضلة.
- نموذج طلب خدمة وحفظه في SQLite محليًا.
- شاشة طلباتي مع حالات الطلب.
