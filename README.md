# Nitro Starter 🚀

Create your API and deploy it anywhere with this Nitro starter.

---

## 📦 Getting Started

```bash
npm install
npm run dev
```

---

## 🏗️ Build for Production

```bash
npm run build
```

---

## 🗄️ Supabase (Local / Cloud) Basic Commands

### ▶️ Start Supabase locally

```bash
npx supabase start
```

### ⏹️ Stop Supabase

```bash
npx supabase stop
```

### 🔄 Reset Database (⚠️ deletes ALL data + reapplies migrations)

```bash
npx supabase db reset
```

### 📊 Check Supabase Status

```bash
npx supabase status
```

### 🔗 Get Local Database URL

```bash
npx supabase status
```

Look for:

```
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
```

---

## 🧩 Running Drizzle (Migrations & Schema)

### 📝 Generate Migration from Schema Changes

```bash
npx drizzle-kit generate
```

### 🚀 Push Schema Directly to Database (No Migration File)

> Useful for fresh setups or rapid development

```bash
npx drizzle-kit push
```

### 📦 Apply Existing Migrations

```bash
npx drizzle-kit migrate
```

### 🔎 Open Drizzle Studio (Visual DB Browser)

```bash
npx drizzle-kit studio
```

### ❌ Drop All Tables (Fresh Start)

> Be careful — this removes all schema + data.

```bash
npx drizzle-kit drop
```

---

## 🌐 Deployment

Then checkout the Nitro documentation to learn more about the different deployment presets.

https://v3.nitro.build/deploy
