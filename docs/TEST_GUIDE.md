# GAnime — Feature Test Guide

End-to-end **manual** test scenarios for every feature, across **Web**, **iOS** (Cordova / TestFlight), and **Android**. Use as a pre-release regression checklist. Run the cases tagged for the platform you're testing; note the env/settings state; log actual vs expected.

**Legend** — Platforms: `Web` · `iOS` · `And` (Android). Priority: `P0` critical path · `P1` important · `P2` secondary.

> Bundle `io.ganime.app` · site `ganime.io`. A rendered/printable version is also available as an artifact.

---

## 0. Setup & environment

Prepare before a full pass. Several behaviors are gated by env vars / admin settings — note their state at test time.

| Item | What you need / why |
|---|---|
| **Test accounts** | A fresh email, a Google account, an **admin** account (`isAdmin`), and a **creator** account (upload permission via Creator Program). At least one funded wallet. |
| **`MODERATION_ENABLED`** | Netlify env. `false` = uploads auto-approve (subtitles still run); unset/true = full moderation. Test both. |
| **`VITE_GUSD_TEST_MODE`** | Adds small 0.1 / 0.2 / 0.5 / 1 top-up & withdraw amounts for cheap testing. |
| **Admin model settings** | Account → System Settings: chat / image / Seedance model. Defaults `gpt-5-mini` / `gpt-image-1-mini` / `doubao-seedance-2-0-mini`. Changes take ~30s. |
| **`VITE_COMING_SOON`** | `1` shows the Coming-Soon splash on ganime.io (privacy.html still reachable). Confirm off for functional testing. |
| **Payment matrix** | **Card + GUSD = Web only.** **IAP (Apple/Google) = native only.** **Withdraw = Web only** (hidden on native). |

## 1. Authentication

| ID | Pri | Plat | Scenario | Steps | Expected |
|---|---|---|---|---|---|
| AUTH-01 | P0 | Web/iOS/And | Email sign-up (new) | Login → Sign up → new email + password | Account created (default name "Guest" + avatar); logged in; welcome credit added |
| AUTH-02 | P1 | Web | Sign-up (existing email) | Sign up with an already-registered email | Error "Email already exists"; no duplicate |
| AUTH-03 | P0 | Web/iOS/And | Email login | Log in with correct, then incorrect password | Correct → in; incorrect → clear error, not logged in |
| AUTH-04 | P0 | Web/iOS/And | Google sign-in | Tap Google icon. Native: Safari/Chrome opens → sign in → returns via `gcashmall://` | New verified email → account created; existing email → merged & logged in. **Native: icon MUST open the system browser** (known regression: no-op) |
| AUTH-05 | P1 | Web | Password reset | Forgot password → email → reset link → new password | Reset email received; new password works; old doesn't |
| AUTH-06 | P2 | Web | Set / change password | OAuth-only user sets password; password user changes (needs old) | Set works when none exists; change requires correct old password |
| AUTH-07 | P2 | Web/iOS/And | Logout | Account → Logout | Session cleared; protected actions prompt login |

## 2. Profile & account

| ID | Pri | Plat | Scenario | Steps | Expected |
|---|---|---|---|---|---|
| PROF-01 | P1 | Web/iOS/And | Edit profile | Edit nickname, phone, gender, birthday → save | Persist after reload |
| PROF-02 | P2 | Web | Change email | Update email → save | Updated; login works with new email |
| PROF-03 | P2 | Web/iOS/And | Profile picture | Upload new avatar | Updates across the app |

## 3. Home & discovery

All discovery surfaces exclude **shelved** series. The genre sidebar only lists genres backed by a non-shelved series that has episodes (clicking a genre must never show an empty list).

| ID | Pri | Plat | Scenario | Steps | Expected |
|---|---|---|---|---|---|
| HOME-01 | P1 | Web | Featured hero | Load home | A featured series shows (random, non-shelved) |
| HOME-02 | P0 | iOS/And/Web | Video feed / swipe | Swipe up/down through the vertical feed; scroll to end | TikTok-style; each item a playable series; loads more on scroll; no shelved / no video-less |
| HOME-03 | P1 | Web | You might like | View recommendations row | ~10 series (popular by likes + random backfill); no shelved |
| HOME-04 | P1 | Web | New releases | View new-releases row | Series list; no shelved |
| GENRE-01 | P0 | Web/iOS/And | Genre browse | Open Genre; click "All"; click each sidebar genre | Sidebar lists only used genres; every click returns ≥1 series; "All" shows all non-shelved |
| GENRE-02 | P1 | Web/iOS | Search | Search by name and by description keyword | Matching non-shelved series; no shelved |
| SHELF-01 | P0 | Web | Shelve hides everywhere | Edit a visible series → Shelved on → save; recheck feed, recs, new releases, genre, search | Disappears from ALL listings; direct `/player/:id` still opens it; un-shelve → reappears |

## 4. Player & watch

Preview length, unlock cost, and creator revenue share come from admin System Settings. Subtitles are external caption tracks (en / 简体中文) on the Bunny player.

| ID | Pri | Plat | Scenario | Steps | Expected |
|---|---|---|---|---|---|
| PLAY-01 | P0 | Web/iOS/And | Play episode | Open a series → play an episode | Video plays with audio |
| PLAY-02 | P0 | Web/iOS/And | Preview / trial limit | Play a locked episode past the preview length | Stops at the preview limit; unlock prompt appears |
| PLAY-03 | P0 | Web | Unlock episode | With balance, unlock a locked episode | Balance − episode cost; full episode plays; purchase txn; creator revenue-share credited |
| PLAY-04 | P1 | Web/iOS/And | Insufficient balance | Attempt unlock with too little balance | Blocked; prompt to top up |
| PLAY-05 | P0 | Web/iOS/And | Subtitles | Player Settings → captions; test an uploaded video and a generated episode | en + 简体中文 tracks toggle. Generated episodes: dialogue spoken, captions transcribed |
| PLAY-06 | P2 | Web | Quality / speed | Settings → change quality and speed | Both apply without breaking playback |
| PLAY-07 | P1 | Web | Public watch page | Open a shared `/watch/:jobId` link (logged out) | Full episode, no trial limit |

## 5. Quick Create (generate)

v1 flow (`VITE_QUICK_CREATE_VERSION=v1`): idea → proposal → produce. Video renders on the admin-selected Seedance model; 2.0 renders native audio (spoken dialogue). Character-reference images generated once per series and reused.

| ID | Pri | Plat | Scenario | Steps | Expected |
|---|---|---|---|---|---|
| QC-01 | P0 | Web/iOS | Idea → proposal | Enter idea (or "Surprise Me" / import PDF/DOCX) → generate | Proposal (title, premise, roadmap) in ~15–30s |
| QC-02 | P0 | Web/iOS | Produce episode 1 | Approve proposal → Produce | Progress advances through stages (calls, video gen, composition, subtitles) to a finished episode |
| QC-03 | P0 | Web | Video quality | Watch the produced episode | ~4 shots stitched; consistent characters; **dialogue spoken**; captions; cover from opening shot |
| QC-04 | P1 | Web | Async render (flag) | With `SEEDANCE_ASYNC=true`, produce; watch progress; close tab mid-render & reopen | Shots complete incrementally; no stall; compose + subtitles finish (closed-tab relies on scheduled reconciler — verify resume) |
| QC-05 | P0 | Web | Publish episode | Ready page → Publish | Published as a series (Published tab & discovery); watchable by others |
| QC-06 | P1 | Web | Follow-up episode | Generate episode 2 of an existing series | Charged next-episode cost; reuses character bible; produces & publishes as EP 2 |
| QC-07 | P2 | Web | Resume production | Leave a producing job; reopen from My Series | Resumes on correct page with current progress |

## 6. Creator upload (Add Series)

Requires upload permission (Creator Program). Uploaded videos go to Bunny, then a content check runs. New series default to **unshelved**.

| ID | Pri | Plat | Scenario | Steps | Expected |
|---|---|---|---|---|---|
| UP-01 | P1 | Web | Join Creator Program | Creator Program → join | Upload/publish permission granted; Add Series available |
| UP-02 | P0 | Web | Add series + upload | Add Series → name, description, genres, cover → add episode → upload video → save | Saved with episode; default **Shelved = off**; appears in listings |
| UP-03 | P0 | Web | Moderation ON — clean | Moderation on; upload a clean video | "Checking content…" then approved; episode saved; subtitles generated |
| UP-04 | P0 | Web | Moderation ON — harmful | Upload a video with harmful content | Rejected dialog (not toast); video removed from episode (episode kept); deleted from Bunny |
| UP-05 | P1 | Web | Moderation OFF | `MODERATION_ENABLED=false`; upload | Approves in ~1s (brief "Checking content…" flash only); episode saves; **subtitles still generate** and appear within ~1–2 min |
| UP-06 | P1 | Web | Shelve toggle | Edit series → toggle Shelved → save | On → hidden from listings; off → visible (see SHELF-01) |
| UP-07 | P2 | Web | Edit existing series | Edit name/description/genres/cover/episodes | Changes persist; genre picker autocompletes |

## 7. Wallet & payments

**IAP credits 30% less** than face value (Apple/Google fee): pay $10 → +7.00 GUSD; a surcharge note is shown. Card & GUSD credit the full amount. GUSD top-up is async (redirect → processing → finalize on wallet load). Withdraw is GUSD, web only.

| ID | Pri | Plat | Scenario | Steps | Expected |
|---|---|---|---|---|---|
| PAY-01 | P0 | Web | Card top-up (Stripe) | Wallet → Top Up → Card → pay (test card) | Redirect back; full amount credited; success txn; no error toast |
| PAY-02 | P0 | Web | GUSD top-up | Top Up → GUSD → pay → return | "Processing" dialog; pending txn; finalizes on wallet load → credited + email. Failure → refunded/failed |
| PAY-03 | P0 | iOS | Apple Pay IAP | Wallet (Apple Pay default) → amount → confirm | Products load; purchase succeeds; credited **30% less** ($5 → +3.50); no "Amount must be positive" error |
| PAY-04 | P0 | And | Google Play IAP | Wallet → Google Play → confirm | Products load; purchase succeeds; credited 30% less |
| PAY-05 | P1 | Web | Withdraw | Wallet → Withdraw → amount (≤ max) → confirm | Balance reserved; order created; on completion → settled + "Withdrawal Complete" email. Recent credits (hold window) not withdrawable |
| PAY-06 | P0 | iOS/And | Native wallet layout | Open Wallet on native | Top Up / Withdraw **tab bar hidden**; only top-up (IAP); no Withdraw, no GUSD |
| PAY-07 | P1 | Web/iOS/And | Transaction history | Review history & filters | Top-up / withdraw / purchase / earning entries with correct amounts, signs, statuses |
| PAY-08 | P1 | Web/iOS | Welcome credit | Register a brand-new account | Wallet starts with admin-set welcome credit (default 100); a welcome txn shows |

## 8. Sharing

| ID | Pri | Plat | Scenario | Steps | Expected |
|---|---|---|---|---|---|
| SHR-01 | P1 | Web/iOS | Social share | Share via Twitter, Pinterest, WhatsApp, Reddit | Native: opens system browser to share URL; link → public watch page |
| SHR-02 | P2 | iOS/And | Native share sheet | Use the generic Share (Facebook has no web→app path) | OS share sheet opens with the link |
| SHR-03 | P2 | Web | Open Graph preview | Paste a share link into a social/chat app | Title/description/site name render (OG tags) |

## 9. Admin settings

Admin account only. System Settings card in Account. Model-setting changes propagate within ~30s.

| ID | Pri | Plat | Scenario | Steps | Expected |
|---|---|---|---|---|---|
| ADM-01 | P1 | Web | Access control | View System Settings as non-admin vs admin | Only admins see/save; non-admin save rejected server-side |
| ADM-02 | P1 | Web | Economic settings | Change preview length, creator share %, episode cost, next-episode cost, welcome credit → save | Each persists & takes effect (episode cost → unlock price; welcome credit → new-user grant) |
| ADM-03 | P1 | Web | Model settings | Change Chat / Image / Video (Seedance) model → save → generate | New generations use selected models; env vars ignored in favor of these |

## 10. Multi-language

| ID | Pri | Plat | Scenario | Steps | Expected |
|---|---|---|---|---|---|
| I18N-01 | P1 | Web/iOS/And | Language switch | Switch English ↔ 简体中文 | All UI strings translate (no raw keys); layout intact |
| I18N-02 | P2 | Web | Localized content | With ZH selected, play videos | Chinese captions available where present |

## 11. Cross-platform / regression

Platform-specific behaviors most likely to regress between builds.

| ID | Pri | Plat | Scenario | Steps | Expected |
|---|---|---|---|---|---|
| XP-01 | P0 | iOS | iOS store & plugins | Fresh TestFlight install: IAP products load, Google sign-in opens Safari, social share opens browser, native share works | All work (these broke historically when Cordova plugins dropped: purchase, inappbrowser, customurlscheme, socialsharing) |
| XP-02 | P0 | And | Android build | Install: sign-in, Google Play IAP, playback, share | Core flows work; no GUSD/withdraw shown |
| XP-03 | P1 | Web | Coming-soon mode | Set `VITE_COMING_SOON=1` on ganime.io | Splash shown; `/privacy.html` still loads directly |
| XP-04 | P2 | Web | Privacy policy | Open `ganime.io/privacy.html` | Full policy renders (not the SPA shell) |
| XP-05 | P1 | Web | Analytics | Load ganime.io; check Network / GA4 Realtime | gtag loads & session registers (`G-YFW2XSQK03`); native/localhost do NOT send |

## 12. Email & misc

| ID | Pri | Plat | Scenario | Steps | Expected |
|---|---|---|---|---|---|
| EM-01 | P1 | Web | Transactional emails | Trigger password reset, a completed top-up, a completed withdrawal | Each email arrives (no admin-notify email on withdrawal request anymore) |
| FAV-01 | P2 | Web/iOS | Favorites & watch list | Add/remove a favorite; play to build watch history | Favorites toggle & persist; watch history records last episode |
