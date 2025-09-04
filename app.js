// ----------------------------
// UI & Navigasi
// ----------------------------
const mobileMenu = document.getElementById("mobileMenu");
const menuBtn = document.getElementById("menuBtn");
if (menuBtn) menuBtn.addEventListener("click", () => mobileMenu.classList.toggle("hidden"));

function showPage(pageId) {
  document.querySelectorAll("main section").forEach(sec => sec.classList.add("hidden"));
  const el = document.getElementById(pageId);
  if (el) el.classList.remove("hidden");
}
function navigate(pageId) { showPage(pageId); if (mobileMenu) mobileMenu.classList.add("hidden"); }
function openModal(){ document.getElementById("walletModal").classList.remove("hidden"); }
function closeModal(){ document.getElementById("walletModal").classList.add("hidden"); }
function copyContract(){ const addr=document.getElementById("contractAddr")?.innerText; if(addr){navigator.clipboard.writeText(addr); alert("✅ Contract Address disalin: " + addr);} }
showPage("home");

// ----------------------------
// Blockchain constants (dipendekkan, sama seperti file asli Anda)
// ----------------------------
const BSC_CHAIN_ID = "0x38";
const KN = "0x1390f63AF92448c46368443496a2bfc1469558de";
const USDT = "0x55d398326f99059fF775485246999027B3197955";
const USDC = "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d";
const WBNB = "0xBB4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const ROUTER_ADDRESS = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
// ... (semua fungsi ethers.js: connect, balances, swap, liquidity, dll tetap sama, cukup pindahkan dari file asli) ...
const TOKEN_DECIMALS = { BNB:18, USDT:18, USDC:18, KN:6 };

  const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function allowance(address,address) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)"
  ];

  const ROUTER_ABI = [
    {"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"}],"name":"getAmountsOut","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapExactTokensForTokens","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapExactETHForTokens","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"payable","type":"function"},
    {"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amountTokenDesired","type":"uint256"},{"internalType":"uint256","name":"amountTokenMin","type":"uint256"},{"internalType":"uint256","name":"amountETHMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"addLiquidityETH","outputs":[{"internalType":"uint256","name":"amountToken","type":"uint256"},{"internalType":"uint256","name":"amountETH","type":"uint256"},{"internalType":"uint256","name":"liquidity","type":"uint256"}],"stateMutability":"payable","type":"function"}
  ];

  // Read-only RPC provider (fallback)
  const READ_ONLY_PROVIDER = new ethers.providers.JsonRpcProvider("https://bsc-dataseed.binance.org/");

  function getReadProvider(){
    if (window.ethereum) {
      try {
        return new ethers.providers.Web3Provider(window.ethereum);
      } catch(e){
        // ignore and fallback
      }
    }
    return READ_ONLY_PROVIDER;
  }

  function getRouter(providerOrSigner){
    return new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, providerOrSigner);
  }

  function getPath(fromSymbol){
    if (fromSymbol === "BNB") return [WBNB, KN];
    if (fromSymbol === "USDT") return [USDT, KN];
    if (fromSymbol === "USDC") return [USDC, KN];
    return [WBNB, KN];
  }
  
  function getTokenAddress(symbol) {
  if (symbol === "BNB") return WBNB;
  if (symbol === "USDT") return USDT;
  if (symbol === "USDC") return USDC;
  if (symbol === "KN") return KN;
  return WBNB;
}

  function sanitizeNumberInput(v){
    if (v === null || v === undefined) return "";
    return String(v).trim().replace(/,/g,'.');
  }

  function toWei(amountStr, decimals){
    const s = sanitizeNumberInput(amountStr);
    if (s === "" || isNaN(s)) return ethers.constants.Zero;
    try {
      return ethers.utils.parseUnits(s, decimals);
    } catch (e){
      // If parseUnits fails (too many decimals), trim decimals to allowed length
      const parts = s.split('.');
      if (parts.length === 1) return ethers.utils.parseUnits(parts[0], decimals);
      const whole = parts[0];
      const frac = parts[1].slice(0, decimals);
      return ethers.utils.parseUnits(whole + (frac ? '.' + frac : ''), decimals);
    }
  }

  function fromWei(bn, decimals){
    try { return ethers.utils.formatUnits(bn, decimals); }
    catch(e){ console.error("fromWei error:", e); return "0"; }
  }

  // ----------------------------
  // Wallet (connect + balances)
  // ----------------------------
  let provider, signer, userAddress;

  async function ensureBSC(){
    if (!window.ethereum) return;
    try {
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      if (chainId !== BSC_CHAIN_ID) {
        await window.ethereum.request({ method: "wallet_switchEthereumChain", params:[{ chainId: BSC_CHAIN_ID }] });
      }
    } catch(e){
      // ignore here; connect functions will handle messages
      throw e;
    }
  }

  async function connectMetaMask(){
    if (!window.ethereum) return alert("MetaMask belum terpasang!");
    try {
      await ensureBSC();
      provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      signer = provider.getSigner();
      userAddress = await signer.getAddress();
      document.getElementById("connectBtn").innerText = userAddress.substring(0,6) + "..." + userAddress.slice(-4);
      await updateBalances();
      closeModal();
      setupWalletEvents();
    } catch(err){
      console.error("connectMetaMask error:", err);
      alert("Gagal connect MetaMask: " + (err?.message || err));
    }
  }

  async function connectOKX(){
    if (!(window.okxwallet && window.okxwallet.request)) return alert("OKX Wallet belum terpasang!");
    try {
      provider = new ethers.providers.Web3Provider(window.okxwallet);
      await provider.send("eth_requestAccounts", []);
      signer = provider.getSigner();
      userAddress = await signer.getAddress();
      document.getElementById("connectBtn").innerText = userAddress.substring(0,6) + "..." + userAddress.slice(-4);
      await updateBalances();
      closeModal();
      setupWalletEvents();
    } catch(err){
      console.error("connectOKX error:", err);
      alert("Gagal connect OKX: " + (err?.message || err));
    }
  }

  function selectWallet(w){
    if (w === "metamask") connectMetaMask();
    else if (w === "okx") connectOKX();
  }

  function setupWalletEvents(){
    if (!window.ethereum) return;
    window.ethereum.on("accountsChanged", async (accounts) => {
      if (!accounts || accounts.length === 0) {
        // disconnected
        document.getElementById("connectBtn").innerText = "Connect Wallet";
        userAddress = null;
        provider = null;
        signer = null;
        document.getElementById("bnbBalance").innerText = "0 BNB";
        document.getElementById("tokenBalance").innerText = "0 KN";
      } else {
        userAddress = accounts[0];
        document.getElementById("connectBtn").innerText = userAddress.substring(0,6) + "..." + userAddress.slice(-4);
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        await updateBalances();
      }
    });
    window.ethereum.on("chainChanged", () => window.location.reload());
  }

  async function updateBalances(){
    try {
      if (!provider) {
        document.getElementById("bnbBalance").innerText = "0 BNB";
        document.getElementById("tokenBalance").innerText = "0 KN";
        return;
      }
      const addr = userAddress || (await provider.listAccounts())[0];
      if (!addr) return;
      const bal = await provider.getBalance(addr);
      const bnb = fromWei(bal, 18);
      document.getElementById("bnbBalance").innerText = (+bnb).toFixed(4) + " BNB";

      const tokenContract = new ethers.Contract(KN, ERC20_ABI, provider);
      const raw = await tokenContract.balanceOf(addr);
      const kn = fromWei(raw, TOKEN_DECIMALS.KN);
      document.getElementById("tokenBalance").innerText = (+kn).toFixed(2) + " KN";
    } catch(e){
      console.error("updateBalances error:", e);
    }
  }

  // approve helper (signer required)
  async function ensureAllowance(tokenAddr, owner, spender, amountWei){
    const token = new ethers.Contract(tokenAddr, ERC20_ABI, signer);
    const current = await token.allowance(owner, spender);
    if (current.gte(amountWei)) return;
    const tx = await token.approve(spender, amountWei);
    await tx.wait();
  }

  // ----------------------------
  // Kalkulasi (read-only, fallback RPC)
  // ----------------------------
  async function updateSwapOutput(){
    const fromToken = document.getElementById("swapFromToken").value;
    const amountIn = sanitizeNumberInput(document.getElementById("swapFromAmount").value);
    const outEl = document.getElementById("swapToAmount");
    if (!amountIn || isNaN(amountIn) || Number(amountIn) <= 0) {
      outEl.value = "0.0";
      return;
    }
    try {
      const readProvider = getReadProvider();
      const router = getRouter(readProvider);
      const decIn = TOKEN_DECIMALS[fromToken] || 18;
      const inWei = toWei(amountIn, decIn);
      if (inWei.isZero()) { outEl.value = "0.0"; return; }
      const path = [ getTokenAddress(fromToken), KN ];

      // safe call
      const amounts = await router.getAmountsOut(inWei, path);
      if (!amounts || amounts.length === 0) { outEl.value = "No pool"; return; }
      const outWei = amounts[amounts.length - 1];
      const out = fromWei(outWei, TOKEN_DECIMALS.KN);
      outEl.value = (+out).toFixed(6);
    } catch (err) {
      console.error("updateSwapOutput error:", err);
      // If RPC call revert (no pool), show friendly message
      document.getElementById("swapToAmount").value = "No pool";
    }
  }

  async function updateBuyOutput(){
    const fromToken = document.getElementById("buyFromToken").value;
    const amountIn = sanitizeNumberInput(document.getElementById("buyAmount").value);
    const outEl = document.getElementById("buyReceive");
    if (!amountIn || isNaN(amountIn) || Number(amountIn) <= 0) {
      outEl.value = "0.0";
      return;
    }
    try {
      const readProvider = getReadProvider();
      const router = getRouter(readProvider);
      const decIn = TOKEN_DECIMALS[fromToken] || 18;
      const inWei = toWei(amountIn, decIn);
      if (inWei.isZero()) { outEl.value = "0.0"; return; }
      const path = [ getTokenAddress(fromToken), KN ];
      const amounts = await router.getAmountsOut(inWei, path);
      if (!amounts || amounts.length === 0) { outEl.value = "No pool"; return; }
      const outWei = amounts[amounts.length - 1];
      const out = fromWei(outWei, TOKEN_DECIMALS.KN);
      outEl.value = (+out).toFixed(6);
    } catch (err) {
      console.error("updateBuyOutput error:", err);
      document.getElementById("buyReceive").value = "No pool";
    }
  }

  // ----------------------------
  // Eksekusi transaksi (signer required)
  // ----------------------------
  async function doSwap(){
    if (!window.ethereum) return alert("Wallet belum terpasang.");
    try {
      await ensureBSC();
      provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      signer = provider.getSigner();
      userAddress = await signer.getAddress();

      const fromToken = document.getElementById("swapFromToken").value;
      const amountIn = sanitizeNumberInput(document.getElementById("swapFromAmount").value);
      if (!amountIn || isNaN(amountIn) || Number(amountIn) <= 0) return alert("Masukkan jumlah valid");

      const decIn = TOKEN_DECIMALS[fromToken] || 18;
      const inWei = toWei(amountIn, decIn);
      const readRouter = getRouter(getReadProvider());
      const path = [ getTokenAddress(fromToken), KN ];
      const amounts = await readRouter.getAmountsOut(inWei, path);
      if (!amounts || amounts.length===0) return alert("Pair belum ada likuiditas (No pool).");

      const outWei = amounts[amounts.length-1];
      const slippageBps = 100; // 1%
      const amountOutMin = outWei.mul(10000 - slippageBps).div(10000);

      const router = getRouter(signer);
      const deadline = Math.floor(Date.now() / 1000) + 60 * 10;
      let tx;
      if (fromToken === "BNB") {
        tx = await router.swapExactETHForTokens(amountOutMin, path, userAddress, deadline, { value: inWei });
      } else {
        const tokenAddr = fromToken === "USDT" ? USDT : USDC;
        await ensureAllowance(tokenAddr, userAddress, ROUTER_ADDRESS, inWei);
        tx = await router.swapExactTokensForTokens(inWei, amountOutMin, path, userAddress, deadline);
      }
      alert("Swap tx sent! Hash: " + tx.hash);
    } catch(err) {
      console.error("doSwap error:", err);
      alert("Gagal swap: " + (err?.reason || err?.message || err));
    } finally {
      updateBalances();
    }
  }

  async function doBuy(){
    // buy uses same flow as swap UI; just call doSwap
    await doSwap();
  }

  async function doAddLiquidity(){
    if (!window.ethereum) return alert("Wallet belum terpasang.");
    try {
      await ensureBSC();
      provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      signer = provider.getSigner();
      userAddress = await signer.getAddress();

      const bnbAmount = sanitizeNumberInput(document.getElementById("liqFromAmount").value);
      const knAmount = sanitizeNumberInput(document.getElementById("liqKNC").value);
      if (!bnbAmount || !knAmount || isNaN(bnbAmount) || isNaN(knAmount) || +bnbAmount <= 0 || +knAmount <= 0) {
        return alert("Masukkan jumlah BNB & KN yang valid");
      }
      const bnbWei = toWei(bnbAmount, 18);
      const knWei = toWei(knAmount, TOKEN_DECIMALS.KN);

      const router = getRouter(signer);
      // approve KN
      await ensureAllowance(KN, userAddress, ROUTER_ADDRESS, knWei);

      const amountKNMin = knWei.mul(9900).div(10000); // 1% slippage
      const amountBNBMin = bnbWei.mul(9900).div(10000);
      const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

      const tx = await router.addLiquidityETH(KN, knWei, amountKNMin, amountBNBMin, userAddress, deadline, { value: bnbWei });
      alert("Add Liquidity tx sent! Hash: " + tx.hash);
    } catch(err){
      console.error("doAddLiquidity error:", err);
      alert("Gagal add liquidity: " + (err?.reason || err?.message || err));
    } finally {
      updateBalances();
    }
  }

// ----------------------------
// Fitur Staking (dummy)
// ----------------------------
let totalStaked = 0;
function doStake() {
  const amount = parseFloat(document.getElementById("stakeAmount").value);
  if (isNaN(amount) || amount <= 0) return alert("Masukkan jumlah KN valid.");
  totalStaked += amount;
  document.getElementById("totalStaked").innerText = totalStaked.toFixed(2) + " KN";
  document.getElementById("stakeAmount").value = "";
  alert("✅ Berhasil staking " + amount + " KN!");
}

// ----------------------------
// Chart Harga (candlestick real-time via Bitquery)
// ----------------------------
const BITQUERY_URL = "https://graphql.bitquery.io/";
const BITQUERY_API_KEY = "ssK09Et5.rYcItN5XtdqxBVf3W"; // API key kamu
let candleChart;

async function fetchOhlcData(tfMinutes=15) {
  const query = `
  {
    ethereum(network: bsc) {
      dexTrades(
        baseCurrency: {is: "${KN}"}
        quoteCurrency: {is: "${WBNB}"}
        options: {asc: "timeInterval.minute"}
        date: {since: "2025-09-01"}
      ) {
        timeInterval { minute(count: ${tfMinutes}, format: "%H:%M") }
        open: quotePrice(calculate: first)
        high: quotePrice(calculate: maximum)
        low: quotePrice(calculate: minimum)
        close: quotePrice(calculate: last)
      }
    }
  }`;

  const res = await fetch(BITQUERY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-KEY": BITQUERY_API_KEY },
    body: JSON.stringify({ query })
  });

  const json = await res.json();
  const trades = json.data?.ethereum?.dexTrades || [];
  return trades.map(t => ({ x: t.timeInterval.minute, o:+t.open, h:+t.high, l:+t.low, c:+t.close }));
}

async function loadCandleChart() {
  const tf = document.getElementById("timeframeSelect").value;
  const ohlc = await fetchOhlcData(tf);

  const ctx = document.getElementById("priceChart").getContext("2d");
  if (candleChart) {
    candleChart.data.datasets[0].data = ohlc;
    candleChart.update();
  } else {
    candleChart = new Chart(ctx, {
      type: "candlestick",
      data: { datasets: [{ label: `KN/BNB (${tf}m)`, data: ohlc }] },
      options: {
        responsive: true,
        plugins: { legend: { position: "top" } },
        scales: { y: { title: { display: true, text: "Harga (BNB)" } } }
      }
    });
  }
}

// refresh otomatis tiap 1 menit
window.addEventListener("DOMContentLoaded", () => {
  loadCandleChart();
  setInterval(loadCandleChart, 60*1000);
  document.getElementById("timeframeSelect").addEventListener("change", loadCandleChart);
});

// ----------------------------
// Expose ke window
// ----------------------------
window.openModal = openModal;
window.closeModal = closeModal;
window.navigate = navigate;
window.selectWallet = selectWallet;
window.copyContract = copyContract;
window.doStake = doStake;
