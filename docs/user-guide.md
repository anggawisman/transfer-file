# User Guide

This guide walks you through transferring files between your PC and phone over local Wi‑Fi.

## What you need

- A **PC** with Node.js 20+ installed
- A **phone** with a modern browser (Chrome on Android, Safari on iOS)
- Both devices on the **same Wi‑Fi network**
- No app install on the phone — only a browser

Transfer File does **not** use mobile data or the public internet. All traffic stays on your local network.

## Quick start

### 1. Start the server on your PC

Open a terminal in the project folder:

```bash
npm install
npm run dev:all
```

You should see output like:

```
Transfer File v0.1.0
─────────────────────────────────────
Host UI:     https://localhost:8787
LAN URL:     https://192.168.1.10:8787
Join URL:    https://192.168.1.10:8787/join
```

### 2. Open the host page on your PC

In your PC browser, go to:

```
https://localhost:8787
```

Accept the security warning if prompted (self-signed certificate — safe on your LAN).

### 3. Connect your phone

On your phone (connected to the same Wi‑Fi):

1. **Scan the QR code** shown on the PC screen, or manually open the **Join URL** (e.g. `https://192.168.1.10:8787/join`)
2. **Accept the certificate warning** — you only need to do this once per device
3. **Enter the 6-digit PIN** displayed on the PC host page
4. Tap **Join**

The PC host page will show "Phone connected" when pairing succeeds.

### 4. PC → phone

On the **PC host page**:

1. Drag files into the **Send files (PC → phone)** upload zone (or click to browse)
2. Wait for upload progress to complete

On the **phone join page**:

1. Find files labeled **From PC**
2. Tap **Download** on each ready file
3. Files save to your phone's Downloads folder (or iOS share/save sheet)

### 5. Phone → PC

On the **phone join page**:

1. Use **Send files (phone → PC)** to pick photos or other files
2. Wait for upload progress to complete

On the **PC host page**:

1. Find files labeled **From phone**
2. Click **Download** on each ready file
3. Files save via your browser's download folder

**Tip:** Keep your phone screen on during large transfers to prevent the browser from suspending the connection.

## UI walkthrough

### Host page (PC)

| Section | What it does |
|---------|--------------|
| Sessions panel | Active session count, disk folder list (active/orphan), delete-all action |
| Device pairing | QR code + PIN for phone to join; shows "Phone connected" when paired |
| Send files (PC → phone) | Drag-and-drop or file picker for uploads to phone |
| Files list | All session files with uploader labels; Download for phone uploads |
| End session | Deletes current session files and invalidates all tokens |

### Session panel (host sidebar)

The left panel on the host page shows:

- **Active in memory** — `1` while a session is running, `0` after it ends
- **Disk folders** — all session directories on disk, labeled **Active** or **Orphan**
- **Delete all session data** — wipes every folder under `data/sessions/`, ends the current session, and forces phones to re-enter the PIN

When the host ends a session, phones are disconnected automatically and returned to the PIN screen.

### Receiver page (phone)

| Section | What it does |
|---------|--------------|
| PIN entry | 6-digit numeric input; appears before joining |
| Connected banner | Green banner confirming successful pairing |
| Send files (phone → PC) | File picker for uploads to PC |
| File list | Download buttons for PC uploads; labels show origin |
| Progress | Per-file upload/download progress bars |

## What works and what does not

| Works | Does not work |
|-------|---------------|
| PC → phone transfer | Transfer over the internet |
| Phone → PC transfer | Phone running the server |
| Both directions in one session | Guest Wi‑Fi with AP isolation |
| Large files (up to 10 GB default) | Different Wi‑Fi networks |
| Same Wi‑Fi or PC hotspot | |
| Mobile data off (Wi‑Fi only) | |

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Phone cannot open the URL | Confirm both devices are on the same Wi‑Fi. Guest networks often block device-to-device traffic. |
| Certificate warning on phone | Tap "Advanced" → "Proceed" (wording varies by browser). This is expected for self-signed LAN certs. |
| Wrong PIN error | Check the PIN on the PC host page. PIN resets when you create a new session. |
| Upload fails on PC from phone URL | Use `/join` on the phone for phone uploads; use `localhost` on PC for PC uploads. |
| Windows firewall blocks connection | Run in PowerShell (as Administrator): `netsh advfirewall firewall add rule name="Transfer File" dir=in action=allow protocol=TCP localport=8787` |
| Files disappear | Files are ephemeral. They are deleted when you click "End session" or start a new session. |
| Slow transfer | Wi‑Fi speed depends on your router. 5 GHz Wi‑Fi is faster than 2.4 GHz. Stay close to the router. |
| Download stuck on iOS | Keep screen awake. Try downloading one file at a time for very large files. |

## Production use (without dev server)

For regular use without the Vite dev server:

```bash
npm run build
npm start
```

Then open `https://localhost:8787` on PC and `https://<your-lan-ip>:8787/join` on phone.

## Privacy

- No files are sent to the cloud
- No analytics or tracking
- Files are stored temporarily on your PC in `data/sessions/` and deleted when the session ends
- Only devices on your LAN that know the PIN can join and transfer files
