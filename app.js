// ----------------------------
// UI & Navigasi
// ----------------------------
function showPage(pageId) {
  document.querySelectorAll(".page-section").forEach(sec => {
    sec.classList.remove("active");
  });
  const el = document.getElementById(pageId);
  if (el) el.classList.add("active");
}
function navigate(pageId) {
  showPage(pageId);
  closeModal(); // auto tutup modal
}
function openModal(){ document.getElementById("walletModal").classList.remove("hidden"); }
function closeModal(){ document.getElementById("walletModal").classList.add("hidden"); }
function copyContract(){ 
  const addr=document.getElementById("contractAddr")?.innerText; 
  if(addr){navigator.clipboard.writeText(addr); alert("✅ Contract Address disalin: " + addr);} 
}
showPage("home");

// ----------------------------
// Blockchain constants
// ----------------------------
const BSC_CHAIN_ID = "0x38";
const KN = "0x1390f63AF92448c46368443496a2bfc1469558de";
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)"
];
let provider, signer, userAddress;

function fromWei(bn, decimals){ return ethers.utils.formatUnits(bn, decimals); }

async function ensureBSC(){
  if (!window.ethereum) return;
  const chainId = await window.ethereum.request({ method: "eth_chainId" });
  if (chainId !== BSC_CHAIN_ID) {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params:[{ chainId: BSC_CHAIN_ID }] });
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
  } catch(err){ alert("Gagal connect: " + err.message); }
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
  } catch(err){ alert("Gagal connect: " + err.message); }
}

function selectWallet(w){ if (w === "metamask") connectMetaMask(); else if (w === "okx") connectOKX(); }

async function updateBalances(){
  if (!provider || !userAddress) return;
  const bnbBal = await provider.getBalance(userAddress);
  document.getElementById("bnbBalance").innerText = (+fromWei(bnbBal, 18)).toFixed(4) + " BNB";
  const token = new ethers.Contract(KN, ERC20_ABI, provider);
  const raw = await token.balanceOf(userAddress);
  const kn = fromWei(raw, 6);
  document.getElementById("tokenBalance").innerText = (+kn).toFixed(2) + " KN";
}

// ----------------------------
// Staking (dummy)
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
// Expose ke window
// ----------------------------
window.openModal = openModal;
window.closeModal = closeModal;
window.navigate = navigate;
window.selectWallet = selectWallet;
window.copyContract = copyContract;
window.doStake = doStake;
