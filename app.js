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

// Ganti sesuai alamat kontrakmu
const KN = "0xYourTokenAddress";                // Token KN
const STAKING_CONTRACT = "0xYourStakingAddress"; // Kontrak staking reward
const FAUCET_CONTRACT  = "0xYourFaucetAddress";  // Kontrak faucet

// ABI Token (BEP20)
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function approve(address spender, uint256 amount) returns (bool)"
];

// ABI Staking Contract (dengan reward)
const STAKING_ABI = [
  "function stake(uint256 amount) external",
  "function withdraw(uint256 amount) external",
  "function claimReward() external",
  "function pendingReward(address user) view returns (uint256)",
  "function getStaked(address user) view returns (uint256)"
];

// ABI Faucet
const FAUCET_ABI = [
  "function faucet() external"
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
    await updateStaked();
    await updateReward();
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
    await updateStaked();
    await updateReward();
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
  const decimals = await token.decimals();
  const kn = fromWei(raw, decimals);
  document.getElementById("tokenBalance").innerText = (+kn).toFixed(2) + " KN";
}

// ----------------------------
// Staking Function (real)
// ----------------------------
async function doStake() {
  if (!signer) return alert("Hubungkan wallet dulu!");
  const amount = parseFloat(document.getElementById("stakeAmount").value);
  if (isNaN(amount) || amount <= 0) return alert("Masukkan jumlah KN valid.");

  try {
    const token = new ethers.Contract(KN, ERC20_ABI, signer);
    const decimals = await token.decimals();
    const parsed = ethers.utils.parseUnits(amount.toString(), decimals);

    // 1. Approve token
    let tx = await token.approve(STAKING_CONTRACT, parsed);
    await tx.wait();

    // 2. Stake ke contract
    const staking = new ethers.Contract(STAKING_CONTRACT, STAKING_ABI, signer);
    tx = await staking.stake(parsed);
    await tx.wait();

    alert(`✅ Berhasil staking ${amount} KN!`);
    document.getElementById("stakeAmount").value = "";

    await updateBalances();
    await updateStaked();
    await updateReward();
  } catch (err) {
    alert("❌ Gagal staking: " + err.message);
  }
}

// ----------------------------
// Withdraw Staking
// ----------------------------
async function doWithdraw() {
  if (!signer) return alert("Hubungkan wallet dulu!");
  const amount = prompt("Masukkan jumlah KN untuk withdraw:");
  if (!amount) return;

  try {
    const staking = new ethers.Contract(STAKING_CONTRACT, STAKING_ABI, signer);
    const token = new ethers.Contract(KN, ERC20_ABI, signer);
    const decimals = await token.decimals();
    const parsed = ethers.utils.parseUnits(amount.toString(), decimals);

    const tx = await staking.withdraw(parsed);
    await tx.wait();

    alert(`✅ Berhasil withdraw ${amount} KN!`);
    await updateBalances();
    await updateStaked();
    await updateReward();
  } catch (err) {
    alert("❌ Gagal withdraw: " + err.message);
  }
}

// ----------------------------
// Claim Reward
// ----------------------------
async function claimReward() {
  if (!signer) return alert("Hubungkan wallet dulu!");
  try {
    const staking = new ethers.Contract(STAKING_CONTRACT, STAKING_ABI, signer);
    const tx = await staking.claimReward();
    await tx.wait();
    alert("🎉 Reward berhasil diclaim!");
    await updateBalances();
    await updateStaked();
    await updateReward();
  } catch (err) {
    alert("❌ Claim gagal: " + err.message);
  }
}

// ----------------------------
// Update Stake & Reward Balance
// ----------------------------
async function updateStaked() {
  if (!signer || !userAddress) return;
  const staking = new ethers.Contract(STAKING_CONTRACT, STAKING_ABI, provider);
  const token = new ethers.Contract(KN, ERC20_ABI, provider);
  const decimals = await token.decimals();

  const bal = await staking.getStaked(userAddress);
  document.getElementById("totalStaked").innerText = ethers.utils.formatUnits(bal, decimals) + " KN";
}

async function updateReward() {
  if (!signer || !userAddress) return;
  const staking = new ethers.Contract(STAKING_CONTRACT, STAKING_ABI, provider);
  const token = new ethers.Contract(KN, ERC20_ABI, provider);
  const decimals = await token.decimals();

  const reward = await staking.pendingReward(userAddress);
  document.getElementById("pendingReward").innerText = ethers.utils.formatUnits(reward, decimals) + " KN";
}

// ----------------------------
// Faucet
// ----------------------------
async function claimFaucet() {
  if (!signer) return alert("Hubungkan wallet dulu!");
  try {
    const faucet = new ethers.Contract(FAUCET_CONTRACT, FAUCET_ABI, signer);
    const tx = await faucet.faucet();
    await tx.wait();
    alert("🎉 Faucet berhasil! Token KN ditambahkan ke wallet Anda.");
    await updateBalances();
  } catch (err) {
    alert("❌ Gagal claim faucet: " + err.message);
  }
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
window.doWithdraw = doWithdraw;
window.claimFaucet = claimFaucet;
window.claimReward = claimReward;
