/* =========================================================
   JW Global Crypto — site interactions + wallet connection
   =========================================================
   WALLET CONNECTION SETUP (read me before going live):
   This file uses WalletConnect's EthereumProvider to let visitors
   connect a wallet and view their own public balances. It is
   READ-ONLY: it requests no transaction-signing permissions.

   To go live you need a free WalletConnect Project ID:
     1. Go to https://cloud.reown.com (formerly cloud.walletconnect.com)
     2. Create a free account and a new project
     3. Copy your Project ID
     4. Paste it below where it says YOUR_WALLETCONNECT_PROJECT_ID

   Until you do that, the "WalletConnect" option will show a clear
   setup notice instead of silently failing — MetaMask / Coinbase
   Wallet browser-extension connections will still work without it,
   since those use the browser's injected wallet directly.
   ========================================================= */

const WALLETCONNECT_PROJECT_ID = "YOUR_WALLETCONNECT_PROJECT_ID";

// ---------- Header scroll state ----------
const header = document.getElementById('siteHeader');
window.addEventListener('scroll', () => {
  if (window.scrollY > 20) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
}, { passive: true });

// ---------- Scroll reveal ----------
const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
revealEls.forEach(el => revealObserver.observe(el));

// ---------- Modal control ----------
const connectModal = document.getElementById('connectModal');
const openConnectModalBtn = document.getElementById('openConnectModal');
const navCta = document.querySelector('.nav-cta');
const closeModalBtn = document.getElementById('closeModal');

function openModal() {
  connectModal.classList.add('active');
}
function closeModal() {
  connectModal.classList.remove('active');
}
if (openConnectModalBtn) openConnectModalBtn.addEventListener('click', openModal);
if (navCta) navCta.addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('portfolio').scrollIntoView({ behavior: 'smooth' });
  setTimeout(openModal, 400);
});
closeModalBtn.addEventListener('click', closeModal);
connectModal.addEventListener('click', (e) => {
  if (e.target === connectModal) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ---------- Wallet state / UI ----------
const walletBadge = document.getElementById('walletBadge');
const walletBadgeText = document.getElementById('walletBadgeText');
const connectPrompt = document.getElementById('connectPrompt');
const holdingsTable = document.getElementById('holdingsTable');
const walletAddrShort = document.getElementById('walletAddrShort');
const copyAddrBtn = document.getElementById('copyAddrBtn');

let currentAddress = null;

function shortenAddress(addr) {
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}

function setConnectedUI(address) {
  currentAddress = address;
  walletBadge.classList.add('connected');
  walletBadgeText.textContent = 'Connected';
  connectPrompt.classList.add('hidden');
  holdingsTable.classList.add('active');
  walletAddrShort.textContent = shortenAddress(address);
  closeModal();
}

function setDisconnectedUI() {
  currentAddress = null;
  walletBadge.classList.remove('connected');
  walletBadgeText.textContent = 'Not connected';
  connectPrompt.classList.remove('hidden');
  holdingsTable.classList.remove('active');
}

copyAddrBtn.addEventListener('click', () => {
  if (!currentAddress) return;
  navigator.clipboard.writeText(currentAddress).then(() => {
    copyAddrBtn.textContent = 'Copied';
    setTimeout(() => { copyAddrBtn.textContent = 'Copy'; }, 1500);
  });
});

// ---------- Read on-chain balances (read-only, public RPC) ----------
// Uses public JSON-RPC endpoints to read balances. No private key,
// no signing, ever. This is a minimal manual implementation so the
// site has zero required npm build step — open index.html and it runs.

const ERC20_BALANCE_SIG = "0x70a08231"; // balanceOf(address)

async function ethCall(rpcUrl, to, data) {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{ to, data }, 'latest']
    })
  });
  const json = await res.json();
  return json.result;
}

async function getEthBalance(rpcUrl, address) {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getBalance',
      params: [address, 'latest']
    })
  });
  const json = await res.json();
  if (!json.result) return 0;
  return parseInt(json.result, 16) / 1e18;
}

async function getErc20Balance(rpcUrl, tokenAddress, holderAddress, decimals) {
  const paddedAddr = holderAddress.replace('0x', '').padStart(64, '0');
  const data = ERC20_BALANCE_SIG + paddedAddr;
  const result = await ethCall(rpcUrl, tokenAddress, data);
  if (!result || result === '0x') return 0;
  return parseInt(result, 16) / Math.pow(10, decimals);
}

// Public RPC + well-known mainnet token contracts
const RPC_URL = "https://cloudflare-eth.com";
const TOKENS = {
  WBTC: { address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", decimals: 8 },
  USDC: { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6 }
};

async function loadBalances(address) {
  document.getElementById('ethAmount').textContent = 'Loading…';
  document.getElementById('btcAmount').textContent = 'Loading…';
  document.getElementById('usdcAmount').textContent = 'Loading…';

  try {
    const [ethBal, btcBal, usdcBal] = await Promise.all([
      getEthBalance(RPC_URL, address),
      getErc20Balance(RPC_URL, TOKENS.WBTC.address, address, TOKENS.WBTC.decimals),
      getErc20Balance(RPC_URL, TOKENS.USDC.address, address, TOKENS.USDC.decimals)
    ]);

    document.getElementById('ethAmount').textContent = ethBal.toFixed(5) + ' ETH';
    document.getElementById('btcAmount').textContent = btcBal.toFixed(6) + ' WBTC';
    document.getElementById('usdcAmount').textContent = usdcBal.toFixed(2) + ' USDC';

    // Values left blank intentionally — wire up a price feed (e.g.
    // CoinGecko's public API) if you want live USD conversion shown.
    document.getElementById('ethValue').textContent = '—';
    document.getElementById('btcValue').textContent = '—';
    document.getElementById('usdcValue').textContent = '—';
  } catch (err) {
    console.error('Balance read failed:', err);
    document.getElementById('ethAmount').textContent = 'Unavailable';
    document.getElementById('btcAmount').textContent = 'Unavailable';
    document.getElementById('usdcAmount').textContent = 'Unavailable';
  }
}

// ---------- MetaMask / injected wallet (EIP-1193) ----------
document.getElementById('connectMetaMask').addEventListener('click', async () => {
  if (typeof window.ethereum === 'undefined') {
    alert('No injected wallet found. Install the MetaMask browser extension, or use WalletConnect to connect a mobile wallet instead.');
    return;
  }
  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (accounts && accounts[0]) {
      setConnectedUI(accounts[0]);
      loadBalances(accounts[0]);
    }
  } catch (err) {
    console.error(err);
    alert('Connection request was rejected or failed.');
  }
});

document.getElementById('connectCoinbase').addEventListener('click', async () => {
  // Coinbase Wallet also injects window.ethereum (or window.coinbaseWalletExtension)
  // when its extension is installed; falls back to same EIP-1193 flow.
  if (typeof window.ethereum === 'undefined') {
    alert('No injected wallet found. Install the Coinbase Wallet browser extension, or use WalletConnect for mobile.');
    return;
  }
  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (accounts && accounts[0]) {
      setConnectedUI(accounts[0]);
      loadBalances(accounts[0]);
    }
  } catch (err) {
    console.error(err);
    alert('Connection request was rejected or failed.');
  }
});

// ---------- WalletConnect (for mobile wallets / no extension) ----------
document.getElementById('connectWalletConnect').addEventListener('click', async () => {
  if (WALLETCONNECT_PROJECT_ID === "YOUR_WALLETCONNECT_PROJECT_ID") {
    alert(
      "WalletConnect isn't configured yet.\n\n" +
      "To enable it: get a free Project ID at cloud.reown.com and paste it " +
      "into app.js at WALLETCONNECT_PROJECT_ID. Takes about two minutes.\n\n" +
      "In the meantime, you can connect with MetaMask or Coinbase Wallet if " +
      "the browser extension is installed."
    );
    return;
  }

  try {
    // Loaded lazily from CDN only when needed, keeping initial page light.
    const { EthereumProvider } = await import("https://esm.sh/@walletconnect/ethereum-provider@2.13.3");
    const provider = await EthereumProvider.init({
      projectId: WALLETCONNECT_PROJECT_ID,
      chains: [1],
      showQrModal: true,
      methods: ["eth_requestAccounts"], // read-only: no eth_sendTransaction requested
      metadata: {
        name: "JW Global Crypto",
        description: "Read-only portfolio viewer",
        url: window.location.origin,
        icons: [window.location.origin + "/assets/logo.png"]
      }
    });

    await provider.connect();
    const accounts = provider.accounts;
    if (accounts && accounts[0]) {
      setConnectedUI(accounts[0]);
      loadBalances(accounts[0]);
    }

    provider.on("disconnect", () => {
      setDisconnectedUI();
    });
  } catch (err) {
    console.error('WalletConnect error:', err);
    alert('WalletConnect session failed or was cancelled.');
  }
});

// ---------- React to wallet-side account/network changes ----------
if (typeof window.ethereum !== 'undefined') {
  window.ethereum.on && window.ethereum.on('accountsChanged', (accounts) => {
    if (accounts.length === 0) {
      setDisconnectedUI();
    } else {
      setConnectedUI(accounts[0]);
      loadBalances(accounts[0]);
    }
  });
}
