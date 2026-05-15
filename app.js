// ============== STATE ==============
let html5QrCode = null;
let isScanning = false;
let currentQRData = null;
let currentWikiData = {
    title: '',
    imgUrl: ''
};

// ============== INIT ==============
document.addEventListener('DOMContentLoaded', () => {
    loadHistory();
    
    // Enter key support
    document.getElementById('qr-text').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            generateQR();
        }
    });
});

// ============== TABS ==============
function switchTab(tabName) {
    // Panels
    document.querySelectorAll('.tab-panel').forEach(el => el.classList.add('hidden'));
    document.getElementById(`${tabName}-panel`).classList.remove('hidden');
    
    // Buttons
    ['generate', 'scan', 'history'].forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        if (t === tabName) {
            btn.className = 'flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 bg-blue-600 text-white shadow-lg shadow-blue-600/25';
        } else {
            btn.className = 'flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 text-gray-400 hover:text-white';
        }
    });
    
    // Cleanup scanner if leaving scan tab
    if (tabName !== 'scan' && isScanning) {
        stopScan();
    }
}

// ============== TOAST ==============
function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-msg').textContent = message;
    toast.classList.remove('opacity-0', 'translate-y-4');
    toast.classList.add('opacity-100', 'translate-y-0');
    
    setTimeout(() => {
        toast.classList.remove('opacity-100', 'translate-y-0');
        toast.classList.add('opacity-0', 'translate-y-4');
    }, 2500);
}

// ============== GENERATE QR ==============
function generateQR() {
    const text = document.getElementById('qr-text').value.trim();
    if (!text) {
        showToast('Please enter text or URL!');
        return;
    }
    
    const size = parseInt(document.getElementById('qr-size').value);
    const color = document.getElementById('qr-color').value;
    const container = document.getElementById('qrcode');
    
    // Clear previous
    container.innerHTML = '';
    
    // Generate using library
    new QRCode(container, {
        text: text,
        width: size,
        height: size,
        colorDark: color,
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });
    
    currentQRData = { text, size, color };
    document.getElementById('qr-result').classList.remove('hidden');
    
    saveToHistory(text, size, color);
    showToast('QR Code Generated!');
}

function downloadQR() {
    const container = document.getElementById('qrcode');
    const canvas = container.querySelector('canvas');
    const img = container.querySelector('img');
    let src = null;
    
    if (canvas) {
        src = canvas.toDataURL('image/png');
    } else if (img) {
        src = img.src;
    }
    
    if (src) {
        const link = document.createElement('a');
        link.href = src;
        link.download = `qrcode-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Downloaded!');
    }
}

function shareQR() {
    if (navigator.share) {
        navigator.share({
            title: 'QR Code',
            text: currentQRData?.text || 'Check this QR'
        }).catch(() => {});
    } else {
        showToast('Download & share the image');
    }
}

// ============== HISTORY ==============
function saveToHistory(text, size, color) {
    let history = JSON.parse(localStorage.getItem('qr_history') || '[]');
    history.unshift({
        text,
        size,
        color,
        date: new Date().toLocaleString('en-IN', { hour12: true })
    });
    if (history.length > 15) history = history.slice(0, 15);
    localStorage.setItem('qr_history', JSON.stringify(history));
    loadHistory();
}

function loadHistory() {
    const list = document.getElementById('history-list');
    const history = JSON.parse(localStorage.getItem('qr_history') || '[]');
    
    if (history.length === 0) {
        list.innerHTML = `
            <div class="text-center py-10">
                <div class="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg class="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <p class="text-gray-500 text-sm">No history yet</p>
            </div>`;
        return;
    }
    
    list.innerHTML = history.map((item, idx) => `
        <div class="group bg-gray-800/40 hover:bg-gray-800/70 border border-gray-700/50 hover:border-gray-600 rounded-xl p-3 transition cursor-pointer flex items-center gap-3"
             onclick="restoreHistory(${idx})">
            <div class="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center text-lg font-bold" 
                 style="background:${item.color}20; color:${item.color}">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4m-4 0H8m4 0v4m0-4V8m0 4h4m-4 0H8"></path></svg>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm text-white font-medium truncate">${escapeHtml(item.text)}</p>
                <p class="text-[11px] text-gray-500 mt-0.5">${item.date}</p>
            </div>
            <button onclick="event.stopPropagation(); deleteHistoryItem(${idx})" 
                    class="opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
        </div>
    `).join('');
}

function restoreHistory(index) {
    const history = JSON.parse(localStorage.getItem('qr_history') || '[]');
    const item = history[index];
    if (!item) return;
    
    document.getElementById('qr-text').value = item.text;
    document.getElementById('qr-size').value = item.size;
    document.getElementById('qr-color').value = item.color;
    switchTab('generate');
    setTimeout(generateQR, 100);
}

function deleteHistoryItem(index) {
    let history = JSON.parse(localStorage.getItem('qr_history') || '[]');
    history.splice(index, 1);
    localStorage.setItem('qr_history', JSON.stringify(history));
    loadHistory();
    showToast('Removed from history');
}

function clearHistory() {
    if (!confirm('Clear all QR history?')) return;
    localStorage.removeItem('qr_history');
    loadHistory();
    showToast('History cleared');
}

// ============== SCANNER ==============
async function startScan() {
    if (isScanning) return;
    
    const readerDiv = document.getElementById('reader');
    readerDiv.innerHTML = ''; // Remove placeholder
    
    try {
        html5QrCode = new Html5Qrcode("reader");
        
        await html5QrCode.start(
            { facingMode: "environment" }, // Back camera prefer
            { fps: 10, qrbox: { width: 220, height: 220 } },
            onScanSuccess,
            onScanFailure
        );
        
        isScanning = true;
        document.getElementById('start-btn').classList.add('hidden');
        document.getElementById('stop-btn').classList.remove('hidden');
        document.getElementById('scan-overlay').classList.remove('hidden');
        document.getElementById('scan-result').classList.add('hidden');
        
    } catch (err) {
        console.error(err);
        readerDiv.innerHTML = `
            <div class="text-center p-6 text-red-400">
                <svg class="w-10 h-10 mx-auto mb-2 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                <p class="text-sm font-medium">Camera access denied</p>
                <p class="text-xs mt-1 opacity-80">Use Live Server / HTTPS</p>
            </div>`;
        showToast('Camera error! Use Live Server');
    }
}

async function stopScan() {
    if (!isScanning || !html5QrCode) return;
    
    try {
        await html5QrCode.stop();
        await html5QrCode.clear();
    } catch (e) {
        // Ignore cleanup errors
    }
    
    isScanning = false;
    html5QrCode = null;
    
    document.getElementById('start-btn').classList.remove('hidden');
    document.getElementById('stop-btn').classList.add('hidden');
    document.getElementById('scan-overlay').classList.add('hidden');
    
    // Reset placeholder
    document.getElementById('reader').innerHTML = `
        <div class="text-center p-6">
            <svg class="w-10 h-10 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            <p>Camera preview will appear here</p>
        </div>`;
}

function onScanSuccess(decodedText, decodedResult) {
    // Auto stop to save battery
    stopScan();
    
    const resultDiv = document.getElementById('scan-result');
    const textEl = document.getElementById('scanned-text');
    const openBtn = document.getElementById('open-btn');
    
    textEl.textContent = decodedText;
    resultDiv.classList.remove('hidden');
    
    // Smart detect URL
    const urlPattern = /^(https?:\/\/|www\.)[^\s]+$/i;
    if (urlPattern.test(decodedText)) {
        openBtn.classList.remove('hidden');
        document.getElementById('visual-result').classList.add('hidden');
    } else {
        openBtn.classList.add('hidden');
        fetchVisualInfo(decodedText);
    }
    
    showToast('QR Scanned Successfully!');
}

async function fetchVisualInfo(keyword) {
    const visualDiv = document.getElementById('visual-result');
    const loadingDiv = document.getElementById('visual-loading');
    const imgEl = document.getElementById('visual-img');
    const titleEl = document.getElementById('visual-title');
    const descEl = document.getElementById('visual-desc');

    visualDiv.classList.add('hidden');
    loadingDiv.classList.remove('hidden');

    try {
        // Wikipedia Search API
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages|extracts&titles=${encodeURIComponent(keyword)}&pithumbsize=500&exintro=1&explaintext=1&origin=*`;
        
        const response = await fetch(searchUrl);
        const data = await response.json();
        
        const pages = data.query.pages;
        const pageId = Object.keys(pages)[0];
        const page = pages[pageId];

        if (pageId !== "-1" && (page.thumbnail || page.extract)) {
            const highRes = page.thumbnail ? page.thumbnail.source.replace(/\d+px-/, '1000px-') : '';
            imgEl.src = page.thumbnail ? page.thumbnail.source : 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&q=80&w=500';
            titleEl.textContent = page.title;
            descEl.textContent = page.extract ? page.extract : "No description available.";
            
            // Store for actions
            currentWikiData.title = page.title;
            currentWikiData.imgUrl = highRes || imgEl.src;

            loadingDiv.classList.add('hidden');
            visualDiv.classList.remove('hidden');
        } else {
            // Fallback for very specific or unknown terms
            loadingDiv.classList.add('hidden');
        }
    } catch (error) {
        console.error('Visual Search Error:', error);
        loadingDiv.classList.add('hidden');
    }
}

function viewHighRes() {
    if (currentWikiData.imgUrl) {
        window.open(currentWikiData.imgUrl, '_blank');
    }
}

function openWiki() {
    if (currentWikiData.title) {
        const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(currentWikiData.title)}`;
        window.open(url, '_blank');
    }
}

function onScanFailure(error) {
    // Continuous scan errors are normal, ignore
}

// ============== SCAN RESULT ACTIONS ==============
function copyResult() {
    const text = document.getElementById('scanned-text').textContent;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => showToast('Copied!'));
    } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('Copied!');
    }
}

function openResult() {
    let url = document.getElementById('scanned-text').textContent.trim();
    if (!url.startsWith('http')) url = 'https://' + url;
    window.open(url, '_blank');
}

// ============== UTILS ==============
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Cleanup on page close
window.addEventListener('beforeunload', () => {
    if (isScanning) stopScan();
});