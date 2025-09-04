// Semua script dari index.html saya pindahkan ke sini
// ----------------------------
// UI basics (nav, tabs, modal)
// ----------------------------
const mobileMenu = document.getElementById("mobileMenu");
const menuBtn = document.getElementById("menuBtn");
if (menuBtn) {
  menuBtn.addEventListener("click", () => mobileMenu.classList.toggle("hidden"));
}

function showPage(pageId) {
  document.querySelectorAll("main section").forEach(sec => sec.classList.add("hidden"));
  const el = document.getElementById(pageId);
  if (el) el.classList.remove("hidden");
}
function navigate(pageId) {
  showPage(pageId);
  if (mobileMenu) mobileMenu.classList.add("hidden");
}
function openModal(){ document.getElementById("walletModal").classList.remove("hidden"); }
function closeModal(){ document.getElementById("walletModal").classList.add("hidden"); }
function copyContract(){ const addr = document.getElementById("contractAddr").innerText; navigator.clipboard.writeText(addr); alert("✅ Contract Address disalin: " + addr); }

// Tabs
function initTabs(){
  const tabButtons = document.querySelectorAll(".tabBtn");
  const tabContents = document.querySelectorAll(".tabContent");
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const tabId = btn.getAttribute("data-tab");
      tabButtons.forEach(b => b.classList.remove("border-yellow-500","text-yellow-600"));
      tabContents.forEach(c => c.classList.add("hidden"));
      btn.classList.add("border-yellow-500","text-yellow-600");
      const target = document.getElementById("tab-" + tabId);
      if (target) target.classList.remove("hidden");
    });
  });
}
initTabs();
showPage("home");

// ----------------------------
// (Seluruh script blockchain sama seperti di file Anda, dipindahkan ke sini)
// ----------------------------
// ... semua fungsi ethers.js (connect, swap, buy, liquidity, balances, dll) ...

// ----------------------------
// Fitur Baru: Staking (dummy logic lokal)
// ----------------------------
let totalStaked = 0;
function doStake() {
  const amount = parseFloat(document.getElementById("stakeAmount").value);
  if (isNaN(amount) || amount <= 0) {
    return alert("Masukkan jumlah KN valid untuk staking.");
  }
  totalStaked += amount;
  document.getElementById("totalStaked").innerText = totalStaked.toFixed(2) + " KN";
  document.getElementById("stakeAmount").value = "";
  alert("✅ Berhasil staking " + amount + " KN!");
}

// ----------------------------
// Fitur Baru: Chart Harga (dummy fetch harga)
// ----------------------------
async function loadChart() {
  const ctx = document.getElementById("priceChart");
  const chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
      datasets: [{
        label: "Harga KN/BNB",
        data: [0.0012, 0.0014, 0.0011, 0.0016, 0.0015],
        borderColor: "rgb(255, 205, 86)",
        tension: 0.2
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true } }
    }
  });
}
loadChart();

// ----------------------------
// Expose ke window
// ----------------------------
window.openModal = openModal;
window.closeModal = closeModal;
window.navigate = navigate;
window.selectWallet = selectWallet;
window.updateSwapOutput = updateSwapOutput;
window.updateBuyOutput = updateBuyOutput;
window.doSwap = doSwap;
window.doBuy = doBuy;
window.doAddLiquidity = doAddLiquidity;
window.copyContract = copyContract;
window.doStake = doStake;
