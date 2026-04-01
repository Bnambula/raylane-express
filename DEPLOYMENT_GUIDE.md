# Raylane Express — Complete Deployment Guide
# From zero to live on the internet, step by step

---

## BEFORE YOU START — Install these 3 tools (one time only)

### Tool 1: Node.js
- Go to: https://nodejs.org
- Click the big green "LTS" button and download
- Install it like any normal program (Next → Next → Finish)
- To verify: open Terminal and type:  node --version
- You should see something like: v20.11.0

### Tool 2: VS Code (your code editor)
- Go to: https://code.visualstudio.com
- Download for your system (Windows or Mac)
- Install it
- Inside VS Code: press Ctrl+` to open the built-in terminal

### Tool 3: Git
- Go to: https://git-scm.com
- Download and install with all default settings
- To verify: type  git --version  in terminal

---

## STEP 1 — Set up the project on your computer

Open VS Code. Press Ctrl+` to open the terminal. Then:

```bash
# Go to your Desktop
cd Desktop

# Install the project dependencies
# (You received the project folder — move it to Desktop first)
cd raylane-express
npm install
```

Wait 2–3 minutes. npm install downloads all the packages your project needs.

---

## STEP 2 — Create your .env.local file (your secret keys)

In the raylane-express folder, you will see a file called:
  .env.local.example

Duplicate that file and rename the copy to:
  .env.local

Now open .env.local and fill in your real values.

### Get Firebase keys:
1. Go to: https://console.firebase.google.com
2. Sign in with a Google account
3. Click "Add project" → Name: raylane-express → Create
4. Click the web icon </>  →  Name: raylane-web  →  Register app
5. Firebase shows you a block of code — copy the values into .env.local

### Get Africa's Talking keys (SMS):
1. Go to: https://account.africastalking.com
2. Register → Go to Settings → API Key
3. Copy the API key into .env.local

### Admin password:
- ADMIN_SECRET can be anything you choose
- Example: raylane-mbale-admin-2024
- This is the password you type on the /admin-login page
- Write it down somewhere safe

### Test your site locally first:
```bash
npm run dev
```
Open browser → go to:  http://localhost:3000
You should see the Raylane Express homepage.

---

## STEP 3 — Create a GitHub account and repository

GitHub is where your code lives safely in the cloud.

1. Go to: https://github.com
2. Click "Sign up" → create a free account
3. After signing in, click the "+" icon (top right) → "New repository"
4. Repository name: raylane-express
5. Set to: Private  (important — keeps your code private)
6. Click "Create repository"
7. GitHub shows you a page with commands. Keep this page open.

---

## STEP 4 — Upload your code to GitHub

Back in your VS Code terminal (make sure you are inside the raylane-express folder):

```bash
# Tell Git your name and email (do this once ever)
git config --global user.email "your-email@gmail.com"
git config --global user.name "Your Name"

# Initialise Git in your project
git init

# Stage all your files for saving
git add .

# Save a snapshot with a message
git commit -m "First Raylane Express version - ready to deploy"

# Connect to GitHub (replace YOUR-USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR-USERNAME/raylane-express.git

# Push (upload) your code to GitHub
git branch -M main
git push -u origin main
```

When asked for a password, GitHub may ask you to create a Personal Access Token:
1. Go to github.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token → check "repo" → Generate
3. Copy the token and use it as your password when Git asks

After this: go to github.com → your repository. You should see all your files there. ✅

---

## STEP 5 — Deploy on Vercel (this makes your site live)

Vercel is where your website runs. It reads from GitHub and deploys automatically.

1. Go to: https://vercel.com
2. Click "Sign up" → choose "Continue with GitHub" → Authorize Vercel
3. You will see your dashboard. Click "Add New..." → "Project"
4. Find your raylane-express repository and click "Import"
5. Vercel detects Next.js automatically — you do not need to change any settings
6. Click "Deploy"
7. Wait 2–3 minutes. Vercel builds and deploys your site.
8. Vercel gives you a URL like: raylane-express.vercel.app
9. Click it — your Raylane Express site is LIVE on the internet! ✅

---

## STEP 6 — Add your secret keys to Vercel (CRITICAL)

Your .env.local file is on your computer but not on GitHub (that is correct — it's private).
You must add your secret keys to Vercel separately so the live site can use them.

1. In your Vercel project, click "Settings" (top menu)
2. Click "Environment Variables" (left sidebar)
3. Add each key from your .env.local file:
   - Click "Add"
   - Name: NEXT_PUBLIC_FIREBASE_API_KEY
   - Value: paste your actual key
   - Click "Save"
   - Repeat for every line in .env.local
4. After adding all keys, go back to "Deployments"
5. Click the three dots next to your latest deployment → "Redeploy"
6. Wait 2 minutes. Your live site now has access to Firebase and SMS.

---

## STEP 7 — Test your live site

Open your Vercel URL (e.g. raylane-express.vercel.app) and test:

✅ Homepage loads with the hero, departure cards, and sightseeing section
✅ "Book Seat Now" button takes you to the booking page
✅ Seat map loads for both Taxi and Bus
✅ You can complete a booking (it saves to Firebase)
✅ /admin-login shows the password screen
✅ Entering your ADMIN_SECRET logs you into the dashboard

---

## STEP 8 — Connect your own domain (raylane.ug)

1. In Vercel → Settings → Domains
2. Type: raylane.ug and click "Add"
3. Vercel shows you two DNS records (an A record and a CNAME record)
4. Log in to wherever you bought raylane.ug (your domain registrar)
5. Find the DNS settings and add both records exactly as Vercel shows
6. Wait up to 24 hours (usually happens within 1 hour)
7. Your site is now live at raylane.ug with a free SSL certificate (the padlock) ✅

---

## STEP 9 — How to update your site after changes

Every time you change code on your computer and want the live site to update:

```bash
# Make sure you are inside the raylane-express folder
git add .
git commit -m "describe what you changed here"
git push
```

That is it. Vercel detects the push automatically and redeploys in 60–90 seconds. ✅

---

## TROUBLESHOOTING

### "npm install" fails:
- Make sure Node.js is installed: type  node --version
- Delete the node_modules folder if it exists, then try npm install again

### Site loads but shows errors in the console:
- Open browser → right-click → Inspect → Console tab
- Copy the red error message and search Google, or ask for help

### Firebase not saving bookings:
- Check that all FIREBASE keys in Vercel Environment Variables are correct
- Go to Firebase console → Firestore Database → make sure it is created
- Set Firestore rules to allow read/write during testing:
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /{document=**} {
        allow read, write: if true;  // change this before going fully public
      }
    }
  }

### Admin login not working:
- Make sure ADMIN_SECRET in Vercel matches exactly what you type on the login page
- Re-deploy Vercel after adding environment variables

### SMS not sending:
- SMS will not work until you activate your Africa's Talking account
- During testing, SMS failures do not stop bookings — they just log an error
- Check the Vercel function logs: Vercel → your project → Functions tab

---

## NEED HELP?

When asking for help, always include:
1. Which step you are on
2. The exact error message (copy it — do not paraphrase)
3. What you expected to happen vs what actually happened

That gives everything needed to solve any problem in minutes.

---

Raylane Express — Built to move Uganda forward.
