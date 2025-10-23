// --- Simple localStorage login (demo only)
const loginSection = document.getElementById('login');
const appSection = document.getElementById('app');
const whoSpan = document.getElementById('who');
const btnLogin = document.getElementById('btnLogin');
const btnLogout = document.getElementById('btnLogout');
const btnPrint = document.getElementById('btnPrint');
const networkStatus = document.getElementById('network-status');

function showApp(username){
  loginSection.style.display = 'none';
  appSection.style.display = 'block';
  whoSpan.textContent = username;
}

function showLogin(){
  loginSection.style.display = 'block';
  appSection.style.display = 'none';
}

btnLogin.addEventListener('click', () => {
  const u = document.getElementById('user').value.trim();
  const p = document.getElementById('pass').value;
  // Demo: terima semua credential (jangan di production)
  if(u){
    localStorage.setItem('pwa_user', u);
    showApp(u);
  } else alert('Masukkan username');
});
btnLogout.addEventListener('click', () => {
  localStorage.removeItem('pwa_user');
  showLogin();
});

// Auto-login jika ada di localStorage
const saved = localStorage.getItem('pwa_user');
if(saved) showApp(saved);

// --- Print handler
btnPrint.addEventListener('click', () => {
  // Buka window baru yang berisi konten print-friendly (opsional)
  // Bisa juga langsung window.print();
  window.print();
});

// --- Network / signal quality detection & notice
function updateOnlineStatus(){
  const online = navigator.onLine;
  if(!online){
    networkStatus.textContent = 'Kamu sedang offline — beberapa fitur mungkin terbatasi.';
    networkStatus.style.background = '#ffd6d6';
  } else {
    networkStatus.textContent = 'Koneksi: online';
    networkStatus.style.background = '#e6ffea';
  }
}
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

// Try to detect effective connection quality (if supported)
async function checkConnectionQuality(){
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if(conn && conn.effectiveType){
    // effectiveType: 'slow-2g', '2g', '3g', '4g'
    const type = conn.effectiveType;
    networkStatus.textContent = `Koneksi: ${type} (${navigator.onLine ? 'online' : 'offline'})`;
    if(type === 'slow-2g' || type === '2g'){
      networkStatus.textContent += ' — Sinyal lemah';
      networkStatus.style.background = '#ffd6d6';
    } else {
      networkStatus.style.background = '#e6ffea';
    }
  } else {
    // fallback: quick ping to check latency
    try {
      const start = performance.now();
      await fetch('/favicon.ico', {method: 'HEAD', cache: 'no-store'});
      const dur = performance.now() - start;
      networkStatus.textContent = `Koneksi: online (latency ~${Math.round(dur)}ms)`;
      if(dur > 1000) { networkStatus.textContent += ' — Sinyal lemah'; networkStatus.style.background = '#ffd6d6'; }
      else networkStatus.style.background = '#e6ffea';
    } catch (e) {
      networkStatus.textContent = 'Koneksi: online (ping gagal)'; networkStatus.style.background = '#fff8b3';
    }
  }
}

// run every 15s to update quality
checkConnectionQuality();
setInterval(checkConnectionQuality, 15000);
