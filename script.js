const MASTER_KEY = "school_project_secret"; 

// --- Encryption ---
function encrypt(text) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ MASTER_KEY.charCodeAt(i % MASTER_KEY.length));
    }
    return btoa(result);
}

function decrypt(encryptedText) {
    try {
        let text = atob(encryptedText);
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ MASTER_KEY.charCodeAt(i % MASTER_KEY.length));
        }
        return result;
    } catch (e) { return "Error"; }
}

// --- Core Logic ---
let passwords = JSON.parse(localStorage.getItem("myPasswords")) || [];

// DOM Elements
const serviceInput = document.getElementById('serviceName');
const userInput = document.getElementById('userName');
const passInput = document.getElementById('passwordInput');
const editIdInput = document.getElementById('editId');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const formTitle = document.getElementById('formTitle');

// Initialize
passInput.addEventListener('input', (e) => checkStrength(e.target.value));
renderTable();

// --- Strength Logic ---
function calculateScore(password) {
    if (!password) return 0;
    let score = 0;
    if (password.length > 8) score++;
    if (password.length > 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
}

function checkStrength(password) {
    const score = calculateScore(password);
    const bar = document.getElementById('strengthBar');
    const txt = document.getElementById('strengthText');
    
    bar.className = "h-full transition-all duration-300";
    if (!password) {
            bar.classList.add("w-0");
            txt.innerText = "Strength check...";
            return;
    }

    if (score < 3) {
        bar.classList.add("w-1/3", "bg-red-500");
        txt.innerText = "Weak"; txt.className = "text-[10px] text-red-400 font-bold";
    } else if (score < 5) {
        bar.classList.add("w-2/3", "bg-yellow-500");
        txt.innerText = "Medium"; txt.className = "text-[10px] text-yellow-400 font-bold";
    } else {
        bar.classList.add("w-full", "bg-green-500");
        txt.innerText = "Strong"; txt.className = "text-[10px] text-green-400 font-bold";
    }
}

function generateNewPassword() {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let password = "";
    for (let i = 0; i < 16; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    passInput.value = password;
    checkStrength(password);
}

function suggestVariations() {
    const current = passInput.value;
    if (!current) { showToast("Type a word first!"); return; }
    const subs = { 'a': '@', 'e': '3', 'i': '!', 'o': '0', 's': '$', 't': '7' };
    let variant = current.split('').map(c => subs[c.toLowerCase()] || c).join('');
    variant = variant.charAt(0).toUpperCase() + variant.slice(1) + (Math.floor(Math.random()*100)+"#");
    passInput.value = variant;
    checkStrength(variant);
}

// --- CRUD Operations ---
function savePassword() {
    const service = serviceInput.value.trim();
    const user = userInput.value.trim();
    const pass = passInput.value.trim();
    const idToEdit = editIdInput.value;

    if (!service || !user || !pass) { alert("Fill all fields."); return; }

    if (idToEdit) {
        // UPDATE existing
        const index = passwords.findIndex(p => p.id == idToEdit);
        if(index !== -1) {
            passwords[index] = { id: Number(idToEdit), service, user, pass: encrypt(pass) };
            showToast("Password Updated!");
        }
    } else {
        // CREATE new
        const newEntry = { id: Date.now(), service, user, pass: encrypt(pass) };
        passwords.push(newEntry);
        showToast("Password Saved!");
    }

    localStorage.setItem("myPasswords", JSON.stringify(passwords));
    cancelEdit(); // Reset form
    renderTable();
}

function deletePassword(id) {
    if(confirm("Delete this password?")) {
        passwords = passwords.filter(p => p.id !== id);
        localStorage.setItem("myPasswords", JSON.stringify(passwords));
        renderTable();
        showToast("Deleted.");
    }
}

function loadForEdit(id) {
    const entry = passwords.find(p => p.id === id);
    if(!entry) return;

    serviceInput.value = entry.service;
    userInput.value = entry.user;
    passInput.value = decrypt(entry.pass);
    editIdInput.value = entry.id;

    // UI Changes for Edit Mode
    formTitle.innerHTML = `<i class="fa-solid fa-pen-to-square mr-2"></i>Editing: ${entry.service}`;
    formTitle.classList.replace('text-blue-200', 'text-yellow-200');
    saveBtn.innerText = "UPDATE";
    saveBtn.classList.replace('from-blue-600', 'from-yellow-600');
    saveBtn.classList.replace('to-blue-500', 'to-yellow-500');
    cancelBtn.classList.remove('hidden');

    checkStrength(passInput.value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    closeModal();
}

function cancelEdit() {
    serviceInput.value = ""; userInput.value = ""; passInput.value = ""; editIdInput.value = "";
    checkStrength("");
    
    formTitle.innerHTML = `<i class="fa-solid fa-plus mr-2"></i>Add New Credential`;
    formTitle.classList.replace('text-yellow-200', 'text-blue-200');
    saveBtn.innerText = "SAVE";
    saveBtn.classList.replace('from-yellow-600', 'from-blue-600');
    saveBtn.classList.replace('to-yellow-500', 'to-blue-500');
    cancelBtn.classList.add('hidden');
}

// --- Details Modal Logic ---
function showWeakDetails() {
    const content = document.getElementById('modalContent');
    document.getElementById('modalTitle').innerText = "Weak Passwords";
    content.innerHTML = "";
    
    const weak = passwords.filter(p => calculateScore(decrypt(p.pass)) < 4);
    
    if (weak.length === 0) {
        content.innerHTML = "<p class='text-center text-gray-400'>No weak passwords found! Good job.</p>";
    } else {
        weak.forEach(p => {
            content.innerHTML += createDetailRow(p.service, p.user, p.id, "red");
        });
    }
    document.getElementById('infoModal').classList.remove('hidden');
}

function showReusedDetails() {
    const content = document.getElementById('modalContent');
    document.getElementById('modalTitle').innerText = "Reused Passwords Groups";
    content.innerHTML = "";

    // Group by password
    const groups = {};
    passwords.forEach(p => {
        const plain = decrypt(p.pass);
        if (!groups[plain]) groups[plain] = [];
        groups[plain].push(p);
    });

    let found = false;
    Object.values(groups).forEach(group => {
        if (group.length > 1) {
            found = true;
            let html = `<div class="bg-slate-800 p-3 rounded-lg border border-slate-600 mb-2">
                <p class="text-xs text-slate-400 mb-2 font-bold uppercase">These apps share a password:</p>`;
            group.forEach(item => {
                html += `<div class="flex justify-between items-center bg-slate-700/50 p-2 rounded mb-1">
                            <span>${item.service}</span>
                            <button onclick="loadForEdit(${item.id})" class="text-xs bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded text-white">Fix</button>
                            </div>`;
            });
            html += `</div>`;
            content.innerHTML += html;
        }
    });

    if (!found) content.innerHTML = "<p class='text-center text-gray-400'>No reused passwords found!</p>";
    document.getElementById('infoModal').classList.remove('hidden');
}

function createDetailRow(service, user, id, color) {
    return `
        <div class="flex justify-between items-center bg-slate-800 p-3 rounded border border-slate-700">
            <div>
                <div class="font-bold text-white">${service}</div>
                <div class="text-xs text-slate-400">${user}</div>
            </div>
            <button onclick="loadForEdit(${id})" class="text-xs bg-${color}-600 hover:bg-${color}-500 text-white px-3 py-1 rounded transition">
                Fix Now
            </button>
        </div>
    `;
}

function closeModal() {
    document.getElementById('infoModal').classList.add('hidden');
}

// --- Rendering & Stats ---
function renderTable() {
    const tbody = document.getElementById('passwordTableBody');
    tbody.innerHTML = "";
    let weakCount = 0;
    let plainPassMap = new Set();
    
    passwords.forEach(p => {
        const plain = decrypt(p.pass);
        if (calculateScore(plain) < 4) weakCount++;
        plainPassMap.add(plain);

        const row = document.createElement('tr');
        row.className = "border-b border-slate-700 hover:bg-slate-700/50 transition";
        
        row.innerHTML = `
            <td class="p-4 font-medium text-white">${p.service}</td>
            <td class="p-4 text-slate-400">${p.user}</td>
            <td class="p-4 font-mono text-slate-500 text-xs" id="pass-display-${p.id}">●●●●●●●●</td>
            <td class="p-4 text-right">
                <button onclick="toggleVisibility(${p.id})" class="text-slate-400 hover:text-green-400 mx-1"><i id="eye-icon-${p.id}" class="fa-solid fa-eye"></i></button>
                <button onclick="loadForEdit(${p.id})" class="text-slate-400 hover:text-yellow-400 mx-1"><i class="fa-solid fa-pen"></i></button>
                <button onclick="copyToClipboard(${p.id})" class="text-slate-400 hover:text-blue-400 mx-1"><i class="fa-regular fa-copy"></i></button>
                <button onclick="deletePassword(${p.id})" class="text-slate-400 hover:text-red-400 mx-1"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Update Stats
    document.getElementById('statTotal').innerText = passwords.length;
    document.getElementById('statWeak').innerText = weakCount;
    document.getElementById('statReused').innerText = passwords.length - plainPassMap.size;
    
    document.getElementById('emptyState').className = passwords.length === 0 ? "block p-12 text-center text-slate-500" : "hidden";
}

// --- Features Logic ---

function toggleVisibility(id) {
    const entry = passwords.find(p => p.id === id);
    if(!entry) return;

    const displayEl = document.getElementById(`pass-display-${id}`);
    const iconEl = document.getElementById(`eye-icon-${id}`);
    const plain = decrypt(entry.pass);

    if (displayEl.innerText.includes('●')) {
        displayEl.innerText = plain;
        displayEl.classList.remove('text-slate-500');
        displayEl.classList.add('text-green-400', 'font-bold');
        iconEl.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        displayEl.innerText = '●●●●●●●●';
        displayEl.classList.add('text-slate-500');
        displayEl.classList.remove('text-green-400', 'font-bold');
        iconEl.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

function copyToClipboard(id) {
    const entry = passwords.find(p => p.id === id);
    if(!entry) return;
    const textToCopy = decrypt(entry.pass);

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textToCopy)
            .then(() => showToast("Copied to clipboard!"))
            .catch(() => copyFallback(textToCopy));
    } else {
        copyFallback(textToCopy);
    }
}

function copyFallback(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showToast("Copied!");
    } catch (err) {
        showToast("Failed to copy", true);
    }
    
    document.body.removeChild(textArea);
}

function clearStorage() {
        if(confirm("Delete ALL passwords?")) {
        localStorage.removeItem("myPasswords");
        passwords = [];
        renderTable();
        showToast("Reset complete.");
        }
}

function showToast(msg, isError = false) {
    const t = document.getElementById('toast');
    const icon = t.querySelector('i');
    
    if(isError) {
        icon.className = "fa-solid fa-circle-xmark text-red-500";
    } else {
        icon.className = "fa-solid fa-circle-check text-green-500";
    }

    document.getElementById('toastMsg').innerText = msg;
    t.classList.remove('translate-y-24');
    setTimeout(() => t.classList.add('translate-y-24'), 3000);
}