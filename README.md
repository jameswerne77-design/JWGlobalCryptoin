# JW Global Crypto — Site Setup

## Files
- `index.html` — the full site
- `app.js` — wallet connection + interactions
- `assets/logo.png` — your logo

## To preview
Open `index.html` directly in any browser, or run a local server:
```
python3 -m http.server 8000
```
then visit `http://localhost:8000`

## To go live
1. Buy a domain (e.g. jwglobalcrypto.com) and host these 3 files on any static host — Netlify, Vercel, Cloudflare Pages, or GitHub Pages all work free.
2. **WalletConnect (mobile wallets):** Get a free Project ID at https://cloud.reown.com, then open `app.js` and replace:
   ```js
   const WALLETCONNECT_PROJECT_ID = "YOUR_WALLETCONNECT_PROJECT_ID";
   ```
   with your real ID. Takes about 2 minutes. Until you do this, MetaMask and Coinbase Wallet (browser extension) connections still work fine — only the WalletConnect/QR option needs it.
3. **Live USD prices (optional):** balances currently show token amounts only (e.g. "0.42 ETH"), not dollar values. Wire up a price feed like CoinGecko's free public API in `app.js` (`loadBalances` function) if you want USD values shown.
4. **Email:** swap `hello@jwglobalcrypto.com` everywhere for your real inbox.
5. **Legal:** the disclosure text is honest placeholder language, not a substitute for an actual lawyer once you're ready to take on users — especially before you ever touch custody, managed funds, or take deposits.

## What the wallet connection does and doesn't do
- **Does:** read public on-chain balances tied to an address the visitor connects, read-only.
- **Doesn't:** request a seed phrase, request transaction-signing permission, or give you custody/control of anyone's funds. Keep it that way until you're licensed for anything more.
