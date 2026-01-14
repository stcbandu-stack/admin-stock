// ==========================================
// 1. CONFIGURATION & STATE
// ==========================================
const SUPABASE_URL = 'https://dcigpisivgpofeljvoph.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_ccUnFtL3x-8eV8exjy4oIw__JiDK4VK'; 
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// Global Variables
let currentUser = null;
let allItems = []; 
let currentPage = 0;
let currentTotalPages = 1; 
const pageSize = 25; 
let isVip = false; 
let viewMode = 'grid'; // 'grid' | 'list'

// ==========================================
// 2. INITIALIZATION
// ==========================================
window.onload = async () => {
    await checkUser(); 
    if (document.getElementById('item-grid')) loadItems();          
    if (document.getElementById('storage-grid')) loadItems('storage'); 
    if (document.getElementById('log-table-body')) loadLogs();      
};

// ==========================================
// 3. UTILITY FUNCTIONS
// ==========================================
window.showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const colors = { 'success': 'bg-green-600', 'error': 'bg-red-600', 'warning': 'bg-yellow-500', 'info': 'bg-blue-600' };
    const icons = { 'success': 'fa-circle-check', 'error': 'fa-circle-xmark', 'warning': 'fa-triangle-exclamation', 'info': 'fa-circle-info' };
    const toast = document.createElement('div');
    toast.className = `${colors[type]} text-white px-10 py-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 transform scale-50 opacity-0 transition-all duration-300 pointer-events-auto min-w-[300px] border-4 border-white/20`;
    toast.innerHTML = `<i class="fa-solid ${icons[type]} text-6xl"></i><span class="text-2xl font-bold text-center">${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.remove('scale-50', 'opacity-0'), 10);
    setTimeout(() => { toast.classList.add('opacity-0', 'scale-90'); setTimeout(() => toast.remove(), 300); }, 2500);
};

window.toggleModal = (id, show) => { 
    const el = document.getElementById(id); 
    if(show) el.classList.remove('hidden'); else el.classList.add('hidden'); 
};

window.customConfirm = (message, callback) => {
    document.getElementById('confirm-message').innerText = message;
    const btn = document.getElementById('confirm-yes-btn');
    btn.onclick = null; 
    btn.onclick = () => { toggleModal('modal-confirm', false); callback(); };
    toggleModal('modal-confirm', true);
};

// ==========================================
// 4. AUTHENTICATION
// ==========================================
async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-pass').value;
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) { showToast('อีเมลหรือรหัสผ่านไม่ถูกต้อง', 'error'); } 
    else { showToast('ยินดีต้อนรับ Admin', 'success'); await checkUser(); if(document.getElementById('item-grid')) loadItems(); toggleModal('modal-login', false); }
}

async function checkUser() {
    const { data: { session } } = await db.auth.getSession();
    currentUser = session?.user;
    if (currentUser) {
        const { data } = await db.from('user_permissions').select('can_backdate').eq('email', currentUser.email).single();
        isVip = !!(data && data.can_backdate);
    } else { isVip = false; }
    
    const authDiv = document.getElementById('auth-section');
    if (authDiv) {
        authDiv.innerHTML = currentUser ? 
            `<button onclick="logout()" class="text-red-600 font-bold flex items-center gap-1"><i class="fa-solid fa-right-from-bracket"></i> ออกจากระบบ</button>` : 
            `<button onclick="toggleModal('modal-login', true)" class="bg-black text-white px-4 py-1.5 rounded-full text-sm flex items-center gap-1"><i class="fa-solid fa-user-lock"></i> Staff Login</button>`;
    }
    const adminToolbar = document.getElementById('admin-toolbar');
    if(adminToolbar) { if(currentUser) adminToolbar.classList.remove('hidden'); else adminToolbar.classList.add('hidden'); }
}

async function logout() {
    try { await db.auth.signOut(); } catch (error) { console.warn('Logout error', error); } 
    finally { currentUser = null; isVip = false; localStorage.clear(); showToast('ออกจากระบบแล้ว', 'info'); setTimeout(() => { window.location.reload(); }, 500); }
}

// ==========================================
// 5. DATA LOADING
// ==========================================
async function loadItems(mode = 'normal') {
    const gridId = mode === 'storage' ? 'storage-grid' : 'item-grid';
    const grid = document.getElementById(gridId);
    if (grid) grid.innerHTML = '<div class="text-center col-span-full py-20 text-gray-400 font-bold animate-pulse">กำลังโหลดข้อมูล...</div>';
    
    const { data, error } = await db.from('items').select('*').eq('is_active', true).order('quantity', { ascending: false });
    if (error) return console.error(error);
    allItems = data;

    if (mode === 'storage') { renderStorage(data); } 
    else { renderItems(data); const lowStock = data.filter(i => i.quantity > 0 && i.quantity <= 5); if (lowStock.length > 0) showToast(`มีของใกล้หมด ${lowStock.length} รายการ`, 'warning'); }
}

window.filterItems = () => {
    const term = document.getElementById('item-search').value.toLowerCase();
    renderItems(allItems.filter(i => i.name.toLowerCase().includes(term) || (i.description || '').toLowerCase().includes(term)));
};

// ==========================================
// 6. RENDERING (Grid & List with New Logic)
// ==========================================
function renderItems(items) {
    const container = document.getElementById('item-grid');
    if (!container) return;
    
    container.innerHTML = items.length ? '' : '<div class="text-center col-span-full py-10 text-gray-400">ไม่พบรายการ...</div>'; 
    
    if (viewMode === 'grid') {
        // --- Grid View (3 กล่อง: ฟ้า/แดง/เขียว) ---
        container.className = 'grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 items-stretch'; // เพิ่ม items-stretch
        
        items.forEach(item => {
            const isOut = item.quantity <= 0;
            const totalIn = item.total_quantity || 0;
            const balance = item.quantity || 0;
            const used = totalIn - balance;

            const adminBtns = currentUser ? `
                <div class="flex gap-1 mt-3 pt-3 border-t border-gray-100">
                    <button onclick="openAction(${item.id}, 'RESTOCK')" class="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold flex items-center justify-center gap-1 transition"><i class="fa-solid fa-plus text-green-600"></i> เติม</button>
                    <button onclick="openAction(${item.id}, 'WITHDRAW')" class="flex-1 py-1.5 bg-black hover:bg-gray-800 text-white rounded text-xs font-bold flex items-center justify-center gap-1 transition"><i class="fa-solid fa-minus"></i> เบิก</button>
                </div>
                <div class="flex gap-1 mt-1">
                    <button onclick="openEditModal(${item.id})" class="flex-1 text-yellow-600 text-[10px] border border-yellow-600 rounded py-1 flex items-center justify-center gap-1 hover:bg-yellow-50">แก้ไข</button>
                    <button onclick="deleteItem(${item.id})" class="flex-1 text-red-500 text-[10px] border border-red-500 rounded py-1 flex items-center justify-center gap-1 hover:bg-red-50">ลบ</button>
                </div>` : '';
                
            container.innerHTML += `
                <div class="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full">
                    
                    <div class="w-full aspect-[4/5] bg-gray-100 relative group overflow-hidden">
                        
                        <img src="${item.image_url || 'https://via.placeholder.com/300'}" 
                             class="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-110 ${isOut ? 'grayscale' : ''}">
                        
                        ${isOut ? '<div class="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10"><span class="bg-red-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">สินค้าหมด</span></div>' : ''}
                    </div>
                    
                    <div class="p-4 flex flex-col flex-grow">
                        <div class="mb-4">
                            <h3 class="font-bold text-lg text-gray-800 leading-tight mb-1 line-clamp-1" title="${item.name}">${item.name}</h3>
                            <p class="text-gray-500 text-xs line-clamp-2 h-8 overflow-hidden">${item.description || '-'}</p>
                        </div>
                        
                        <div class="mt-auto">
                            <div class="grid grid-cols-3 gap-1">
                                <div class="bg-blue-50 border border-blue-100 rounded p-1.5 text-center">
                                    <div class="text-[9px] text-blue-500 font-bold uppercase">รับเข้า</div>
                                    <div class="text-sm font-extrabold text-blue-700">${totalIn}</div>
                                </div>
                                <div class="bg-red-50 border border-red-100 rounded p-1.5 text-center">
                                    <div class="text-[9px] text-red-500 font-bold uppercase">ใช้ไป</div>
                                    <div class="text-sm font-extrabold text-red-700">${used}</div>
                                </div>
                                <div class="bg-green-50 border border-green-100 rounded p-1.5 text-center">
                                    <div class="text-[9px] text-green-600 font-bold uppercase">คงเหลือ</div>
                                    <div class="text-sm font-extrabold text-green-700">${balance}</div>
                                </div>
                            </div>
                            ${adminBtns}
                        </div>
                    </div>
                </div>`;
        });
    } else {
        // --- List View (Table with 3 Color Columns) - เหมือนเดิม ---
        container.className = 'bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden';

        let tableHTML = `
            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                    <thead class="bg-gray-100 text-gray-700 uppercase tracking-wider text-xs">
                        <tr>
                            <th class="p-3">สินค้า</th>
                            <th class="p-3 text-center text-blue-700 bg-blue-50">รับเข้า (In)</th>
                            <th class="p-3 text-center text-red-700 bg-red-50">ใช้ไป (Out)</th>
                            <th class="p-3 text-center text-green-700 bg-green-50">คงเหลือ (Bal)</th>
                            ${currentUser ? '<th class="p-3 text-center">จัดการ</th>' : ''}
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">`;
        
        items.forEach(item => {
            const totalIn = item.total_quantity || 0;
            const balance = item.quantity || 0;
            const used = totalIn - balance;
            
            const adminActions = currentUser ? `
                <td class="p-3 text-center">
                    <div class="flex gap-1 justify-center">
                        <button onclick="openAction(${item.id}, 'WITHDRAW')" class="w-7 h-7 bg-black text-white rounded hover:bg-gray-800 flex items-center justify-center transition" title="เบิก"><i class="fa-solid fa-minus text-xs"></i></button>
                        <button onclick="openAction(${item.id}, 'RESTOCK')" class="w-7 h-7 bg-gray-200 text-black rounded hover:bg-gray-300 flex items-center justify-center transition" title="เติม"><i class="fa-solid fa-plus text-xs"></i></button>
                        <button onclick="openEditModal(${item.id})" class="w-7 h-7 text-yellow-600 border border-yellow-600 rounded hover:bg-yellow-50 flex items-center justify-center transition" title="แก้ไข"><i class="fa-solid fa-pen text-xs"></i></button>
                        <button onclick="deleteItem(${item.id})" class="w-7 h-7 text-red-600 border border-red-600 rounded hover:bg-red-50 flex items-center justify-center transition" title="ลบ"><i class="fa-solid fa-trash text-xs"></i></button>
                    </div>
                </td>` : '';

            tableHTML += `
                <tr class="hover:bg-gray-50 transition">
                    <td class="p-3">
                        <div class="flex items-center gap-3">
                            <img src="${item.image_url || 'https://via.placeholder.com/100'}" class="w-10 h-10 object-cover rounded-md border bg-gray-100">
                            <div>
                                <div class="font-bold text-gray-800 text-sm">${item.name}</div>
                                <div class="text-xs text-gray-500 truncate max-w-[150px]">${item.description || '-'}</div>
                            </div>
                        </div>
                    </td>
                    <td class="p-3 text-center font-bold text-blue-600 bg-blue-50/50">${totalIn}</td>
                    <td class="p-3 text-center font-bold text-red-600 bg-red-50/50">${used}</td>
                    <td class="p-3 text-center font-bold text-green-600 bg-green-50/50 text-base">${balance}</td>
                    ${adminActions}
                </tr>`;
        });

        tableHTML += `</tbody></table></div>`;
        container.innerHTML = tableHTML;
    }
}

window.switchView = (mode) => {
    viewMode = mode;
    const btnGrid = document.getElementById('btn-view-grid');
    const btnList = document.getElementById('btn-view-list');
    
    if(mode === 'grid') {
        btnGrid.className = 'px-3 py-1.5 rounded text-sm transition bg-black text-white shadow';
        btnList.className = 'px-3 py-1.5 rounded text-sm transition text-gray-500 hover:bg-gray-100';
    } else {
        btnList.className = 'px-3 py-1.5 rounded text-sm transition bg-black text-white shadow';
        btnGrid.className = 'px-3 py-1.5 rounded text-sm transition text-gray-500 hover:bg-gray-100';
    }
    renderItems(allItems);
};

// ==========================================
// 7. ACTIONS (Logic Calculation Changed!)
// ==========================================

// 7.1 Submit Action (Running Total Logic)
async function submitAction() {
    const id = document.getElementById('action-item-id').value;
    const type = document.getElementById('action-type').value;
    const amount = parseInt(document.getElementById('action-amount').value);
    const reportDate = document.getElementById('action-date').value; 

    // Fields
    const branch = document.getElementById('action-branch').value;
    const actName = document.getElementById('action-activity-name').value;
    const actLoc = document.getElementById('action-activity-location').value;
    const actDate = document.getElementById('action-activity-date').value;
    const note = document.getElementById('action-note').value;

    if(!amount || !reportDate) return showToast('กรุณากรอกข้อมูลวันที่และจำนวน', 'warning');

    if (type === 'WITHDRAW') {
        if (!branch || !actName || !actLoc || !actDate) return showToast('กรุณากรอกข้อมูลการเบิกให้ครบถ้วน', 'warning');
        const dReport = new Date(reportDate); const dActivity = new Date(actDate); dReport.setHours(0,0,0,0); dActivity.setHours(0,0,0,0);
        if (dReport > dActivity && !isVip) return showToast('หากต้องการคีย์ย้อนหลัง โปรดติดต่อผู้ดูแลระบบ', 'error');
    }

    // --- NEW LOGIC: Cumulative Sum ---
    const { data: item } = await db.from('items').select('*').eq('id', id).single();
    
    let newQty = 0;          // ยอดคงเหลือใหม่ (Balance)
    let newTotal = item.total_quantity; // ยอดรับเข้าสะสม (Total In)

    if (type === 'WITHDRAW') {
        if (item.quantity < amount) return showToast('สต็อกไม่พอเบิก!', 'error');
        newQty = item.quantity - amount;
        // การเบิก ไม่ทำให้ยอดรับเข้า (Total In) เปลี่ยนแปลง
    } else {
        // การเติม (RESTOCK)
        newQty = item.quantity + amount;
        newTotal = item.total_quantity + amount; // บวกสะสมเพิ่มเข้าไป (Cumulative)
    }

    // Update DB
    await db.from('items').update({ quantity: newQty, total_quantity: newTotal }).eq('id', id);
    
    await db.from('logs').insert({
        item_id: id, item_name: item.name, action_type: type, amount: amount, balance_after: newQty,
        report_date: reportDate, user_name: document.getElementById('action-name').value || 'Admin', branch: type === 'WITHDRAW' ? branch : '-', 
        note: note, activity_name: type === 'WITHDRAW' ? actName : null, activity_location: type === 'WITHDRAW' ? actLoc : null, activity_date: type === 'WITHDRAW' ? actDate : null
    });

    showToast('บันทึกรายการสำเร็จ', 'success');
    toggleModal('modal-action', false);
    
    if(document.getElementById('item-grid')) loadItems();
    if(document.getElementById('storage-grid')) loadItems('storage');
    if(document.getElementById('log-table-body')) loadLogs(); 
}

// 7.2 Add Item (Logic: เริ่มต้นยอดสะสมเท่ากับจำนวนแรกเข้า)
async function addItem() {
    const name = document.getElementById('add-name').value;
    const qty = document.getElementById('add-qty').value;
    if(!name || !qty) return showToast('กรุณากรอกชื่อและจำนวน', 'warning');
    
    const file = document.getElementById('add-image').files[0];
    let imageUrl = '';
    if(file) {
        const fileName = `item-${Date.now()}.${file.name.split('.').pop()}`;
        await db.storage.from('item-images').upload(fileName, file);
        imageUrl = db.storage.from('item-images').getPublicUrl(fileName).data.publicUrl;
    }
    
    // Logic: ของใหม่ ยอดคงเหลือ = qty, ยอดรับเข้าสะสม = qty
    const { data: newItem, error } = await db.from('items').insert({ 
        name, description: document.getElementById('add-desc').value, 
        quantity: qty, 
        total_quantity: qty, // ตั้งต้นยอดสะสม
        image_url: imageUrl 
    }).select().single();

    if(error) return showToast('เกิดข้อผิดพลาดในการบันทึก', 'error');

    await db.from('logs').insert({
        item_id: newItem.id, item_name: newItem.name, action_type: 'ADD_NEW', amount: parseInt(qty), balance_after: parseInt(qty),
        report_date: new Date().toISOString().split('T')[0], user_name: 'Admin', branch: '-', note: 'เพิ่มของชำร่วยเข้าระบบ', activity_name: '-', activity_location: '-', activity_date: null
    });

    showToast('เพิ่มสินค้าใหม่สำเร็จ', 'success'); toggleModal('modal-add', false); loadItems();
}

// --- ส่วนอื่นๆ (Modal Open/Close, Edit, Delete, Logs, Storage) เหมือนเดิม ---
// (Copy โค้ดส่วนที่เหลือจากเวอร์ชั่น Clean Code ก่อนหน้านี้มาแปะต่อท้ายได้เลยครับ ส่วนนั้นไม่มีการเปลี่ยนแปลง Logic)

// 7.3 Edit & Delete & Open Action & Logs (เอามาแปะให้ครบเพื่อความสะดวก)
window.openAction = (id, type) => {
    const item = allItems.find(x => x.id === id);
    const itemName = item ? item.name : '';
    document.getElementById('action-item-id').value = id;
    document.getElementById('action-type').value = type;
    document.getElementById('action-amount').value = '';
    document.getElementById('action-note').value = ''; 
    const dateInput = document.getElementById('action-date');
    dateInput.value = new Date().toISOString().split('T')[0];
    const actionText = type === 'RESTOCK' ? 'เติมสต็อค' : 'เบิกของ';
    document.getElementById('action-title').innerText = `${actionText} - ${itemName}`;
    if(type === 'WITHDRAW') {
        document.getElementById('withdraw-fields').classList.remove('hidden');
        dateInput.readOnly = true; dateInput.classList.add('bg-gray-100', 'text-gray-500', 'cursor-not-allowed'); 
    } else {
        document.getElementById('withdraw-fields').classList.add('hidden');
        dateInput.readOnly = false; dateInput.classList.remove('bg-gray-100', 'text-gray-500', 'cursor-not-allowed'); 
    }
    toggleModal('modal-action', true);
};

window.openEditModal = (id) => {
    const item = allItems.find(x => x.id === id);
    document.getElementById('edit-id').value = item.id;
    document.getElementById('edit-name').value = item.name;
    document.getElementById('edit-desc').value = item.description || '';
    toggleModal('modal-edit', true);
};

window.submitEdit = async () => {
    const id = document.getElementById('edit-id').value;
    const file = document.getElementById('edit-image').files[0];
    let updateData = { name: document.getElementById('edit-name').value, description: document.getElementById('edit-desc').value };
    if (file) {
        const fileName = `edit-${Date.now()}.${file.name.split('.').pop()}`;
        await db.storage.from('item-images').upload(fileName, file);
        updateData.image_url = db.storage.from('item-images').getPublicUrl(fileName).data.publicUrl;
    }
    await db.from('items').update(updateData).eq('id', id);
    showToast('แก้ไขข้อมูลเรียบร้อย', 'success'); toggleModal('modal-edit', false); loadItems();
};

window.deleteItem = (id) => { 
    const item = allItems.find(x => x.id === id);
    const itemName = item ? item.name : 'รายการนี้';
    customConfirm(`คุณต้องการลบ "${itemName}" ใช่หรือไม่?`, async () => {
        await db.from('logs').insert({
            item_id: id, item_name: itemName, action_type: 'DELETE', amount: 0, balance_after: 0, 
            report_date: new Date().toISOString().split('T')[0], user_name: 'Admin', branch: '-', note: 'นำของชำร่วยออกจากระบบ (Archived)', activity_name: '-', activity_location: '-', activity_date: null
        });
        await db.from('items').update({ is_active: false }).eq('id', id);
        showToast(`ลบ "${itemName}" สำเร็จ`, 'success'); loadItems();
    });
};

async function loadLogs() {
    const tbody = document.getElementById('log-table-body');
    if (!tbody) return; 
    tbody.innerHTML = '<tr><td colspan="10" class="p-10 text-center text-gray-400 animate-pulse font-bold">กำลังดึงข้อมูลประวัติ...</td></tr>';
    const month = document.getElementById('filter-month')?.value;
    const branch = document.getElementById('filter-branch')?.value;
    let query = db.from('logs').select('*', { count: 'exact' });
    if (month) { const year = new Date().getFullYear(); query = query.gte('report_date', `${year}-${month}-01`).lte('report_date', `${year}-${month}-31`); }
    if (branch) query = query.ilike('branch', `%${branch}%`);
    const from = currentPage * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);
    if (error) return console.error(error);
    renderLogs(data); updatePaginationUI(count);
}

function renderLogs(logs) {
    const tbody = document.getElementById('log-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    logs.forEach(log => {
        const isW = log.action_type === 'WITHDRAW';
        const date = log.report_date ? new Date(log.report_date).toLocaleDateString('th-TH') : '-';
        const actDate = log.activity_date ? new Date(log.activity_date).toLocaleDateString('th-TH') : '-';

        // 1. สร้าง Badge สีสวยๆ ตามประเภทรายการ
        let typeBadge = '';
        let amountClass = '';
        let amountPrefix = '';

        switch(log.action_type) {
            case 'WITHDRAW':
                // สีแดง สำหรับการเบิก
                typeBadge = `<span class="bg-red-100 text-red-700 px-2 py-1 rounded-md text-xs font-bold border border-red-200"><i class="fa-solid fa-minus"></i> เบิกออก</span>`;
                amountClass = 'text-red-600';
                amountPrefix = '-';
                break;
            case 'RESTOCK':
                // สีเขียว สำหรับการเติม
                typeBadge = `<span class="bg-green-100 text-green-700 px-2 py-1 rounded-md text-xs font-bold border border-green-200"><i class="fa-solid fa-plus"></i> เติมสต็อก</span>`;
                amountClass = 'text-green-600';
                amountPrefix = '+';
                break;
            case 'ADD_NEW':
                // สีน้ำเงิน สำหรับของใหม่
                typeBadge = `<span class="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs font-bold border border-blue-200"><i class="fa-solid fa-star"></i> เพิ่มของใหม่</span>`;
                amountClass = 'text-blue-600';
                amountPrefix = '+';
                break;
            case 'DELETE':
                // สีเทา สำหรับการลบ
                typeBadge = `<span class="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs font-bold border border-gray-200"><i class="fa-solid fa-trash"></i> ลบสินค้า</span>`;
                amountClass = 'text-gray-400';
                amountPrefix = ''; 
                break;
            default:
                typeBadge = `<span class="bg-gray-100 text-gray-500 px-2 py-1 rounded text-xs">ทั่วไป</span>`;
        }

        // 2. จัดการคอลัมน์สาขา (ถ้าไม่ใช่เบิก ให้ขีดละ - ไว้)
        const branchDisplay = isW ? log.branch : '<span class="text-gray-300">-</span>';

        // 3. Render HTML (เพิ่มคอลัมน์ typeBadge เข้าไป)
        tbody.innerHTML += `
            <tr class="border-b hover:bg-gray-50 text-xs md:text-sm">
                <td class="p-3 text-gray-500 whitespace-nowrap">${date}</td>
                <td class="p-3 font-semibold text-gray-700">${log.item_name}</td>
                
                <td class="p-3 text-center whitespace-nowrap">${typeBadge}</td>
                
                <td class="p-3">${isW ? log.user_name : 'Admin'}</td>
                <td class="p-3 text-gray-600">${branchDisplay}</td> <td class="p-3">${isW ? (log.activity_name || '-') : '-'}</td>
                <td class="p-3 text-gray-500">${isW ? (log.activity_location || '-') : '-'}</td>
                <td class="p-3 text-gray-500 whitespace-nowrap">${isW ? actDate : '-'}</td>
                <td class="p-3 text-gray-400 italic">${log.note || '-'}</td>
                <td class="p-3 text-right font-bold ${amountClass}">${amountPrefix}${log.amount}</td>
                <td class="p-3 text-right font-mono font-bold text-blue-600 bg-blue-50">${log.balance_after ?? '-'}</td>
            </tr>`;
    });
}

function updatePaginationUI(totalCount) {
    const info = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const pageInput = document.getElementById('page-input');      
    const totalDisplay = document.getElementById('total-pages-display'); 
    if (!info) return;
    currentTotalPages = Math.ceil(totalCount / pageSize) || 1; 
    info.innerText = `รายการที่ ${currentPage * pageSize + 1} - ${Math.min((currentPage + 1) * pageSize, totalCount)} จากทั้งหมด ${totalCount}`;
    if(pageInput) { pageInput.value = currentPage + 1; pageInput.max = currentTotalPages; }
    if(totalDisplay) totalDisplay.innerText = currentTotalPages; 
    prevBtn.disabled = currentPage === 0;
    nextBtn.disabled = (currentPage + 1) >= currentTotalPages;
}

window.jumpToPage = (pageNum) => {
    pageNum = parseInt(pageNum);
    if (!pageNum || pageNum < 1 || pageNum > currentTotalPages) {
        showToast(`กรุณาระบุหน้า 1 - ${currentTotalPages}`, 'warning');
        document.getElementById('page-input').value = currentPage + 1;
        return;
    }
    currentPage = pageNum - 1;
    loadLogs();
};

window.changePage = (direction) => {
    const newPage = currentPage + direction;
    if (newPage >= 0 && newPage < currentTotalPages) { currentPage = newPage; loadLogs(); }
};

window.applyFilters = () => { currentPage = 0; loadLogs(); };

window.exportLogsToCSV = async () => {
    const month = document.getElementById('filter-month')?.value;
    const branch = document.getElementById('filter-branch')?.value;
    showToast('กำลังประมวลผลข้อมูล...', 'info');
    let query = db.from('logs').select('*');
    if (month) { const year = new Date().getFullYear(); query = query.gte('report_date', `${year}-${month}-01`).lte('report_date', `${year}-${month}-31`); }
    if (branch) query = query.ilike('branch', `%${branch}%`);
    const { data, error } = await query.order('created_at', { ascending: false }).limit(100000);
    if (error || !data || data.length === 0) return showToast('ไม่พบข้อมูล', 'warning');

    // 🔥 เพิ่มหัวตาราง "ประเภทรายการ" ใน CSV
    let csvContent = "\uFEFFวันที่ทำรายการ,รายการสินค้า,ประเภทรายการ,ผู้ทำรายการ,สาขา,ชื่อกิจกรรม,สถานที่,วันที่จัดกิจกรรม,หมายเหตุ,จำนวน,ยอดคงเหลือ\n";
    
    data.forEach(log => {
        const date = log.report_date ? new Date(log.report_date).toLocaleDateString('th-TH') : '-';
        const isW = log.action_type === 'WITHDRAW';
        const user = isW ? log.user_name : 'Admin';
        
        // แปลง action_type เป็นภาษาไทยสำหรับ CSV
        let typeThai = 'ทั่วไป';
        if (log.action_type === 'WITHDRAW') typeThai = 'เบิกออก';
        else if (log.action_type === 'RESTOCK') typeThai = 'เติมสต็อก';
        else if (log.action_type === 'ADD_NEW') typeThai = 'เพิ่มของใหม่';
        else if (log.action_type === 'DELETE') typeThai = 'ลบสินค้า';

        const branchCol = isW ? log.branch : '-';
        const amount = (isW ? '-' : '+') + log.amount;
        const note = (log.note || '-').replace(/,/g, ' '); 
        const balance = log.balance_after ?? '-';
        const actName = (log.activity_name || '-').replace(/,/g, ' ');
        const actLoc = (log.activity_location || '-').replace(/,/g, ' ');
        const actDate = log.activity_date ? new Date(log.activity_date).toLocaleDateString('th-TH') : '-';
        
        // 🔥 เพิ่ม typeThai ลงในแถว
        csvContent += `"${date}","${log.item_name}","${typeThai}","${user}","${branchCol}","${actName}","${actLoc}","${actDate}","${note}","${amount}","${balance}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `StockReport_${month ? 'Month'+month : 'AllYear'}_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`ดาวน์โหลดเรียบร้อย (${data.length} รายการ)`, 'success');
};

// Render Storage (Dashboard)
function renderStorage(items) {
    const grid = document.getElementById('storage-grid');
    if (!grid) return;
    grid.innerHTML = items.length ? '' : '<div class="text-center col-span-full py-10 text-gray-400">ไม่พบรายการ...</div>'; 
    items.forEach(item => {
        const totalIn = item.total_quantity || 0;
        const balance = item.quantity || 0;
        const used = totalIn - balance;
        const isOut = balance <= 0;
        const isLow = balance > 0 && balance < (totalIn * 0.2); 
        let numColor = 'text-green-600';
        if (isOut) numColor = 'text-gray-400'; else if (isLow) numColor = 'text-red-600';

        grid.innerHTML += `
            <div class="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition flex flex-col">
                <div class="w-full h-80 bg-gray-100 relative group">
    <img src="${item.image_url || 'https://via.placeholder.com/300'}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${isOut ? 'grayscale' : ''}">
    ${isOut ? '<div class="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm"><span class="bg-red-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">ของหมด</span></div>' : ''}
</div>
                <div class="p-3 flex-1 flex flex-col justify-between text-center">
                    <div>
                        <h3 class="font-bold text-sm text-gray-800 line-clamp-1" title="${item.name}">${item.name}</h3>
                        <p class="text-xs text-gray-400 mt-1 line-clamp-1">${item.description || '-'}</p>
                    </div>
                    <div class="mt-3 pt-2 border-t border-gray-100 grid grid-cols-3 gap-1">
                         <div class="text-center">
                            <div class="text-[9px] text-blue-400 uppercase font-bold">รับเข้า</div>
                            <div class="text-sm font-bold text-blue-600">${totalIn}</div>
                        </div>
                         <div class="text-center">
                            <div class="text-[9px] text-red-400 uppercase font-bold">ใช้ไป</div>
                            <div class="text-sm font-bold text-red-600">${used}</div>
                        </div>
                         <div class="text-center">
                            <div class="text-[9px] text-green-400 uppercase font-bold">คงเหลือ</div>
                            <div class="text-sm font-bold text-green-600">${balance}</div>
                        </div>
                    </div>
                </div>
            </div>`;
    });
}