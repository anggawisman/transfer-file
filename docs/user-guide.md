# User Guide

This guide walks you through transferring files from your PC to your phone over local Wi‑Fi.

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

### 3. Upload files on the PC

On the host page you will see:

- **Phone pairing** — QR code and 6-digit PIN
- **Upload zone** — drag files here or click to browse
- **Files list** — shows upload progress and "Ready for phone download" status

Drag videos, documents, photos, or any other files into the upload zone. Large files (GB+) are supported.

### 4. Connect your phone

On your phone (connected to the same Wi‑Fi):

1. **Scan the QR code** shown on the PC screen, or manually open the **Join URL** (e.g. `https://192.168.1.10:8787/join`)
2. **Accept the certificate warning** — you only need to do this once per device
3. **Enter the 6-digit PIN** displayed on the PC host page
4. Tap **Join**

The PC host page will show "Phone connected" when pairing succeeds.

### 5. Download files on your phone

After joining, you will see the file list. For each file with status ready:

1. Tap the **Download** button
2. Wait for the progress bar to complete
3. The file saves to your phone's Downloads folder (or iOS share/save sheet)

**Tip:** Keep your phone screen on during large downloads to prevent the browser from suspending the transfer.

## UI walkthrough

### Host page (PC)

| Section | What it does |
|---------|--------------|
| Phone pairing | QR code + PIN for phone to join; shows "Phone connected" when paired |
| Upload zone | Drag-and-drop or file picker; supports multiple files |
| Upload progress | Per-file percentage while uploading to server |
| Files list | All session files with status; "End session" button at top |

### Receiver page (phone)

| Section | What it does |
|---------|--------------|
| PIN entry | 6-digit numeric input; appears before joining |
| Connected banner | Green banner confirming successful pairing |
| File list | Read-only list with large Download buttons |
| Download progress | Per-file progress bar during download |

## What works and what does not

| Works | Does not work (v1) |
|-------|---------------------|
| PC → phone file transfer | Phone → PC upload |
| Large files (up to 10 GB default) | Transfer over the internet |
| Multiple files per session | Phone running the server |
| Same Wi‑Fi or PC hotspot | Guest Wi‑Fi with AP isolation |
| Mobile data off (Wi‑Fi only) | Different Wi‑Fi networks |

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Phone cannot open the URL | Confirm both devices are on the same Wi‑Fi. Guest networks often block device-to-device traffic. |
| Certificate warning on phone | Tap "Advanced" → "Proceed" (wording varies by browser). This is expected for self-signed LAN certs. |
| Wrong PIN error | Check the PIN on the PC host page. PIN resets when you create a new session. |
| Upload fails on phone | Expected — only the PC can upload files. Use the PC host page to add files. |
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
- Only devices on your LAN that know the PIN can download files
