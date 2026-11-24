<div align="center">

# 👜 Elixir Pocket

**An expense tracker I built because none of the ones I tried felt like mine.**

[![Live App](https://img.shields.io/badge/Live_App-Try_it-66101F?style=for-the-badge)](https://elixir-pocket.vercel.app)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=black)
![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white)


</div>

---

## 💸 The short version

I kept losing track of where my money went. I tried a bunch of expense apps. Some were too rigid, some were cluttered, and a few just had a vibe I couldn't get along with. I'd use one for a week, forget about it, and end the month confused.

So I built my own, shaped around how *I* actually think about spending. It's live, I use it myself, and that's the only test I really trust.

👉 **Try it here:** [elixir-pocket.vercel.app](https://elixir-pocket.vercel.app) (sign in with Google)

---

## ✨ What it does

| | |
|---|---|
| 📊 **Dashboard** | Balance, income, expenses, and recent activity at a glance |
| 🧾 **History** | Every transaction in one place: add, edit, delete |
| 📈 **Trends** | See where your money is actually going over time |
| 🎯 **Budgets** | Set a monthly budget and per-category limits |
| 🌗 **Light and dark mode** | Because of course |
| 🔐 **Google sign-in** | Your data is tied to your account and private to you |

---

## 🛠️ Built with

| Part | Tech |
|---|---|
| Front end | React, TypeScript, Vite |
| Sign-in and database | Firebase (Google Auth + Firestore) |
| Hosting | Vercel |
| First prototype | Google AI Studio |

---

## 🚀 Run it yourself

<details>
<summary><b>Click to expand the setup steps</b></summary>

<br>

You'll need Node.js and your own free Firebase project.

1. Clone the repo and install everything:
   ```
   npm install
   ```
2. In the Firebase console, create a project, turn on **Google** under Authentication, and create a Firestore database.
3. Register a web app in your Firebase project and paste its config into `src/firebase-applet-config.json`, replacing the existing values.
4. In Firebase, go to Authentication, Settings, Authorized domains, and make sure `localhost` is on the list.
5. Start it:
   ```
   npm run dev
   ```
   Then open the address it prints, usually `http://localhost:3000`.

Want the AI features? Copy `.env.example` to `.env.local` and add your own Gemini API key. Never commit that file. 🙏

</details>

---

## ⚠️ The honest bits

- **Use "Continue with Google" on the live site.** Email and password sign-in depends on a small backend that only existed in the AI Studio preview, so it isn't wired up in this deployment yet.
- If you fork this, lock down your Firestore rules so people can only read and write *their own* data. Mine do, and yours should too.

---

## 🧠 What I actually learned

Building the app was the easy part. Getting it from "works in preview" to "actually live" taught me way more: OAuth origins, how Firebase keeps you signed in, Firestore security rules, and a lot of staring at console errors until they finally made sense. (Several hours. One very dramatic afternoon.)

---

## 🔮 Maybe someday

I'm job hunting and have other things to build, so no promises. But these are on the wishlist:

- [ ] 🔔 Duolingo-style reminder notifications that sound like a person, not a robot
- [ ] 📱 An installable Android version
- [ ] ⚡ Importing transactions automatically instead of typing them in

---

## 👋 About me

Hi, I'm **Ishida**, a data science student who learns best by building real things instead of following tutorials. This one's real, because I use it every day.

If you've got feedback, ideas, or just want to say hi, I'd genuinely love to hear it. ⭐ a star on the repo wouldn't hurt either.
