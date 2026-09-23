# portal-lite

Northwind Customer Portal — Lite (demo build). Angular 22 SPA + .NET 10
minimal API + a local SQL Server copy of Northwind. See
`docs/plans/roadmap.md` for what's built and what's next, and
`docs/plans/portal-lite-spec.md` / `-design.md` for the full spec and
design decisions.

This guide gets the app running locally so you can click through it.
First-time setup takes a while (it installs SQL Server, the .NET SDK, Node
and a test browser) — budget 10-15 minutes depending on your connection.

## Windows 11: install WSL2 first

The setup script targets Ubuntu, so on Windows you run it inside WSL2
(Windows Subsystem for Linux) rather than natively. This isn't a
workaround — it's the normal way to do backend/full-stack dev on Windows,
and WSL2 forwards `localhost` automatically, so a browser running directly
on Windows can reach an app served from inside WSL with no extra setup.

1. Open **PowerShell as Administrator** and run:
   ```powershell
   wsl --install
   ```
   This enables WSL2 and installs Ubuntu. Restart when prompted.
2. Launch **Ubuntu** from the Start menu. First run asks you to create a
   Linux username and password (separate from your Windows login) —
   pick anything, you'll use it for `sudo`.
3. From here on, every command in this guide runs **inside that Ubuntu
   window**, not PowerShell or Command Prompt.

Already on native Linux (Ubuntu/Debian) or WSL2? Skip straight to
[Clone the repo](#1-clone-the-repo). macOS and other Linux distros aren't
supported by the automated setup script yet (it installs Microsoft's
Ubuntu/Debian `mssql-server` package directly) — you'd need Docker or a VM
for SQL Server, which this guide doesn't cover.

**Tip:** if you use VS Code, install the "WSL" extension, then run `code .`
from inside your cloned repo in the Ubuntu terminal — it opens a
Windows VS Code window connected straight to the Linux files.

## 1. Clone the repo

Clone into WSL's own filesystem, not `/mnt/c/...` — Windows-drive paths are
noticeably slower for projects with lots of small files (like
`node_modules`).

```bash
cd ~
git clone https://github.com/wlgitdev/portal.git
cd portal
git checkout claude/festive-goodall-htnruv   # or main, once this is merged
```

If prompted for credentials, sign in with the GitHub account that has
access to this repo.

## 2. One-time environment setup

Pick a password for the local SQL Server instance — 8+ characters with at
least 3 of: uppercase, lowercase, digit, symbol — and run the setup
script:

```bash
export MSSQL_SA_PASSWORD='Ch4nge-Me-Please!'
bash scripts/dev-setup/setup.sh
```

This installs the .NET 10 SDK, Node 24 + Angular CLI 22, SQL Server 2025
(Developer edition) + `sqlcmd`, restores a stock copy of Northwind, and
installs Playwright's browser for the automated tests. It's safe to
re-run — steps it's already done print `SKIP` instead of repeating.

Open a **new Ubuntu terminal** (or run `source ~/.portal-lite-env`) so the
new tools land on your `PATH`.

The last step prints a connection-string template with your password
redacted — keep that terminal output handy for the next step.

**Every new terminal session after today:** just re-run
`bash scripts/dev-setup/setup.sh` with the same password — it starts SQL
Server if it isn't running and confirms everything's in place, in a few
seconds once already installed.

## 3. Connect the API to the database

The connection string is kept out of the repo via .NET's user-secrets
(never committed, never logged):

```bash
cd src/PortalLite.Api
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:Northwind" "Server=localhost,1433;Database=Northwind;User Id=sa;Password=Ch4nge-Me-Please!;Encrypt=True;TrustServerCertificate=True"
cd ../..
```

Use the same password you exported as `MSSQL_SA_PASSWORD` above. You only
need to do this once — it's saved outside the repo.

## 4. Install frontend dependencies

```bash
npm install
```

## 5. Run it

Two terminals, both inside WSL, both from the repo root (`~/portal`):

```bash
# Terminal A — the API, on :5080
dotnet run --project src/PortalLite.Api
```

```bash
# Terminal B — the SPA, on :4200 (proxies /api to :5080 automatically)
ng serve
```

Open **http://localhost:4200** in your normal Windows browser.

## 6. Try it

- Sign in as **Alfreds Futterkiste** (or search "ALFKI") — search orders,
  filter to a status, open one and check the line items add up to the
  total.
- Sign in as **Ernst Handel** — Alfreds' own orders have all shipped, so
  to see a *Late* order and its voyage line, use this account instead.
- Resize the window below ~720px (or open dev tools' device toolbar) to
  see the card list the Orders screen switches to on a phone.

## 7. Run the automated tests

```bash
npx playwright test
```

This starts both servers itself if they aren't already running, so it
also works with nothing set up in a terminal beforehand (as long as steps
1-4 above have been done at least once).

## Troubleshooting

| Problem | Try this |
|---|---|
| `wsl --install` fails / WSL won't start | Virtualisation is usually off in the BIOS/UEFI. Check Task Manager → Performance → CPU shows "Virtualization: Enabled"; if not, enable it in firmware settings. |
| Setup script fails on the password check | It needs 8+ characters and 3 of upper/lower/digit/symbol — the example above meets this. |
| SQL Server won't start / times out | Usually memory. WSL2 defaults to using up to half your RAM; if that's tight, close other apps or raise the limit via a `.wslconfig` file (search "WSL2 .wslconfig memory"). |
| Ports already in use (4200 / 5080 / 1433) | Something else is using them — stop it, or check `scripts/dev-setup/lib/config.sh` for the port variables if you need to change one. |
| Things are in a weird state | From **PowerShell**: `wsl --shutdown`, then reopen Ubuntu and re-run `bash scripts/dev-setup/setup.sh`. |
| `ng serve` / `dotnet run` says a command isn't found | Open a new terminal so the PATH changes from setup take effect, or run `source ~/.portal-lite-env`. |

## Project layout

```
db/portal-lite.sql          the SQL queries the API runs (also runnable standalone)
src/PortalLite.Api/         .NET minimal API
src/app/                    Angular app
src/styles/                 design tokens
e2e/                        Playwright tests
scripts/dev-setup/          the setup script this guide runs
docs/plans/                 spec, design doc, roadmap
```
