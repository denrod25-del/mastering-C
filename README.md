
### Voice Input + Q&A (AssemblyAI)

Every lecture has a **🎤 Ask** button in the control bar.

- Click it → browser mic opens, live transcript appears
- Speak a question ending with **?** → AI answer appears automatically
- Powered by AssemblyAI `universal-3-5-pro` realtime STT + LLM Gateway

**Backend setup required** (Vercel Edge Functions in `api/`):
1. Connect this repo to Vercel at vercel.com
2. Add `ASSEMBLYAI_API_KEY` in Project Settings → Environment Variables
3. Deploy — Vercel auto-detects `api/token.js` and `api/qa.js`
4. Copy your Vercel URL and find-replace `REPLACE_WITH_VERCEL_URL` in all lectures
5. Push — voice Q&A is live

Until step 4 is done, the panel shows "Backend not configured" and the control
bar also offers a typed-question fallback that doesn't need a microphone.

### Tests

A small Playwright suite covers the Volume IX player (playback state, keyboard
shortcuts, progress-bar accessibility, the Ask panel's safe-error path, and
mobile overflow):

```
npm install
npm test
```
