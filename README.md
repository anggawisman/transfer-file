# Transfer File

PC-to-phone LAN file transfer over Wi‑Fi. No cloud, no mobile data usage.

## Quick start

```bash
npm install
npm run dev:all
```

Then:
1. Open **https://localhost:8787** on your PC (host UI)
2. Upload files on the PC
3. On your phone (same Wi‑Fi), scan the QR code or open the join URL
4. Enter the 6-digit PIN
5. Tap **Download** on each file

## Documentation

Full system docs: **[docs/README.md](docs/README.md)**

| Doc | Description |
|-----|-------------|
| [User guide](docs/user-guide.md) | How to transfer files (PC + phone) |
| [Architecture](docs/architecture.md) | How the system works under the hood |
| [API reference](docs/api.md) | REST + WebSocket endpoints |
| [Security](docs/security.md) | Threat model, auth, TLS |
| [Development](docs/development.md) | Local dev setup and testing |
| [ADRs](docs/decisions/) | Architecture decision records |

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev:all` | Start server + web dev UI (two processes) |
| `npm run dev` | Server only (serves built web from `apps/web/dist`) |
| `npm run dev:web` | Vite dev server with API proxy |
| `npm run build` | Build shared + web + server |
| `npm test` | Run unit tests |
| `npm start` | Production server |

## Production use

```bash
npm run build
npm start
```

Open `https://<your-lan-ip>:8787` on PC, `https://<your-lan-ip>:8787/join` on phone.

## Requirements

- Node.js 20+
- PC and phone on the **same Wi‑Fi network**
- Windows: allow port 8787 through firewall if prompted

```powershell
netsh advfirewall firewall add rule name="Transfer File" dir=in action=allow protocol=TCP localport=8787
```

## Security

- Self-signed TLS certificate (generated on first run in `data/certs/`)
- 6-digit PIN required for phone to join
- Receiver tokens cannot upload files
- No internet/cloud relay — all traffic stays on LAN

See [docs/security.md](docs/security.md) for the full security model.

## Environment

Copy `.env.example` to `.env`:

```
JWT_SECRET=your-secret-min-32-characters-long
PORT=8787
STRICT_LAN=true
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Phone can't connect | Same Wi‑Fi? Guest network AP isolation blocks LAN |
| Certificate warning | Accept once — LAN-only self-signed cert |
| Firewall blocks | Run the `netsh` rule above on Windows |
| Upload fails on phone | Expected — only PC can upload (PC → phone only) |

More troubleshooting: [docs/user-guide.md](docs/user-guide.md)
