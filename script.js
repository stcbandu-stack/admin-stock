// --- ตั้งค่า Supabase ---
const SUPABASE_URL = 'https://dcigpisivgpofeljvoph.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_ccUnFtL3x-8eV8exjy4oIw__JiDK4VK'; 
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let allItems = []; 
let allLogs = []; 
let currentPage = 0;
let currentTotalPages = 1; 
const pageSize = 25; 
let isVip = false; // สำหรับระบบสิทธิ์ VIP
let viewMode = 'grid'; // 'grid' หรือ 'list' <--- เพิ่มตัวแปรนี้

// เริ่มทำงานเมื่อเว็บโหลด
window.onload = async () => {
    checkUser(); 
    
    // ตรวจสอบว่าอยู่หน้าไหน แล้วโหลดข้อมูลให้ถูก
    if (document.getElementById('item-grid')) loadItems(); // หน้าหลัก
    if (document.getElementById('storage-grid')) loadItems('storage'); // หน้า Storage
    if (document.getElementById('log-table-body')) loadLogs(); // หน้าประวัติ
};

// --- ระบบแจ้งเตือน (Toast Notification) ---
window.showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    const colors = { 'success': 'bg-green-600', 'error': 'bg-red-600', 'warning': 'bg-yellow-500', 'info': 'bg-blue-600' };
    const icons = { 'success': 'fa-circle-check', 'error': 'fa-circle-xmark', 'warning': 'fa-triangle-exclamation', 'info': 'fa-circle-info' };
    
    toast.className = `${colors[type]} text-white px-10 py-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 transform scale-50 opacity-0 transition-all duration-300 pointer-events-auto min-w-[300px] border-4 border-white/20`;
    toast.innerHTML = `<i class="fa-solid ${icons[type]} text-6xl"></i><span class="text-2xl font-bold text-center">${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.remove('scale-50', 'opacity-0'), 10);
    setTimeout(() => { toast.classList.add('opacity-0', 'scale-90'); setTimeout(() => toast.remove(), 300); }, 2500);
};

// --- ระบบยืนยัน (Confirm Modal) ---
window.customConfirm = (message, callback) => {
    document.getElementById('confirm-message').innerText = message;
    const btn = document.getElementById('confirm-yes-btn');
    btn.onclick = () => { toggleModal('modal-confirm', false); callback(); };
    toggleModal('modal-confirm', true);
};

// --- จัดการมุมมอง (Grid/List) เพิ่มใหม่ ---
window.switchView = (mode) => {
    viewMode = mode;
    const btnGrid = document.getElementById('btn-view-grid');
    const btnList = document.getElementById('btn-view-list');
    
    // สลับสีปุ่ม
    if(mode === 'grid') {
        btnGrid.className = 'px-3 py-1.5 rounded text-sm transition bg-black text-white shadow';
        btnList.className = 'px-3 py-1.5 rounded text-sm transition text-gray-500 hover:bg-gray-100';
    } else {
        btnList.className = 'px-3 py-1.5 rounded text-sm transition bg-black text-white shadow';
        btnGrid.className = 'px-3 py-1.5 rounded text-sm transition text-gray-500 hover:bg-gray-100';
    }
    
    // เรนเดอร์ใหม่
    renderItems(allItems);
};

// --- 1. จัดการรายการสินค้า ---
async function loadItems(mode = 'normal') {
    const gridId = mode === 'storage' ? 'storage-grid' : 'item-grid';
    const grid = document.getElementById(gridId);
    
    if (grid) grid.innerHTML = '<div class="text-center col-span-full py-20 text-gray-400 font-bold animate-pulse">กำลังโหลดข้อมูล...</div>';
    
    const { data, error } = await db.from('items').select('*').eq('is_active', true).order('quantity', { ascending: false });
    
    if (error) return console.error(error);
    allItems = data;

    if (mode === 'storage') {
        renderStorage(data);
    } else {
        renderItems(data);
        const lowStock = data.filter(i => i.quantity > 0 && i.quantity <= 5);
        if (lowStock.length > 0) showToast(`มีของใกล้หมด ${lowStock.length} รายการ`, 'warning');
    }
}

// ฟังก์ชัน Render หลัก (แก้ไขให้รองรับทั้ง Grid และ List)
function renderItems(items) {
    const container = document.getElementById('item-grid');
    if (!container) return;
    
    container.innerHTML = items.length ? '' : '<div class="text-center col-span-full py-10 text-gray-400">ไม่พบรายการ...</div>'; 
    
    if (viewMode === 'grid') {
        // --- แสดงผลแบบการ์ด (Grid) ---
        container.className = 'grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6'; // ใส่ Class Grid
        
        items.forEach(item => {
            const isOut = item.quantity <= 0;
            const total = item.total_quantity || item.quantity; 

            const adminBtns = currentUser ? `
                <div class="flex gap-1 mt-2 pt-2 border-t border-gray-100">
                    <button onclick="openAction(${item.id}, 'RESTOCK')" class="flex-1 py-1 bg-gray-100 rounded text-xs md:text-sm flex items-center justify-center gap-1">เติม</button>
                    <button onclick="openAction(${item.id}, 'WITHDRAW')" class="flex-1 py-1 bg-black text-white rounded text-xs md:text-sm flex items-center justify-center gap-1">เบิก</button>
                </div>
                <div class="flex gap-1 mt-1">
                    <button onclick="openEditModal(${item.id})" class="flex-1 text-yellow-600 text-xs border border-yellow-600 rounded py-1 flex items-center justify-center gap-1">แก้ไข</button>
                    <button onclick="deleteItem(${item.id})" class="flex-1 text-red-500 text-xs border border-red-500 rounded py-1 flex items-center justify-center gap-1">ลบ</button>
                </div>` : '';
                
            container.innerHTML += `
                <div class="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition">
                    <div class="w-full aspect-[4/5] bg-gray-100 relative">
                        <img src="${item.image_url || 'https://via.placeholder.com/300'}" class="w-full h-full object-cover ${isOut ? 'grayscale' : ''}">
                        
                        <div class="absolute top-2 right-2 ${isOut ? 'bg-gray-500' : 'bg-red-600'} text-white text-xs px-2 py-1 rounded shadow-md">
                            ${isOut ? 'ของหมด' : `คงเหลือ ${item.quantity}/${total}`}
                        </div>
                    </div>
                    <div class="p-4"><h3 class="font-bold text-lg">${item.name}</h3><p class="text-gray-500 text-sm h-10 overflow-hidden text-ellipsis">${item.description || '-'}</p>${adminBtns}</div>
                </div>`;
        });
    } else {
        // --- แสดงผลแบบตาราง (List) ---
        container.className = 'bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden'; // ใส่ Class Container ตาราง

        // หัวตาราง
        let tableHTML = `
            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                    <thead class="bg-gray-100 text-gray-700 uppercase tracking-wider">
                        <tr>
                            <th class="p-3">รูปภาพ</th>
                            <th class="p-3">ชื่อสินค้า</th>
                            <th class="p-3">รายละเอียด</th>
                            <th class="p-3 text-center">คงเหลือ</th>
                            <th class="p-3 text-center">คงคลัง (Total)</th>
                            ${currentUser ? '<th class="p-3 text-center">จัดการ</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>`;
        
        // วนลูปสร้างแถว
        items.forEach(item => {
            const isOut = item.quantity <= 0;
            const total = item.total_quantity || item.quantity;
            
            const adminActions = currentUser ? `
                <td class="p-3">
                    <div class="flex gap-1 justify-center">
                        <button onclick="openAction(${item.id}, 'WITHDRAW')" class="w-8 h-8 bg-black text-white rounded hover:bg-gray-800" title="เบิก"><i class="fa-solid fa-minus"></i></button>
                        <button onclick="openAction(${item.id}, 'RESTOCK')" class="w-8 h-8 bg-gray-200 text-black rounded hover:bg-gray-300" title="เติม"><i class="fa-solid fa-plus"></i></button>
                        <button onclick="openEditModal(${item.id})" class="w-8 h-8 text-yellow-600 border border-yellow-600 rounded hover:bg-yellow-50" title="แก้ไข"><i class="fa-solid fa-pen"></i></button>
                        <button onclick="deleteItem(${item.id})" class="w-8 h-8 text-red-600 border border-red-600 rounded hover:bg-red-50" title="ลบ"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>` : '';

            tableHTML += `
                <tr class="border-b hover:bg-gray-50">
                    <td class="p-3">
                        <img src="${item.image_url || 'https://via.placeholder.com/100'}" class="w-12 h-12 object-cover rounded-md border ${isOut ? 'grayscale' : ''}">
                    </td>
                    <td class="p-3 font-bold text-gray-800">${item.name}</td>
                    <td class="p-3 text-gray-500 truncate max-w-xs">${item.description || '-'}</td>
                    <td class="p-3 text-center">
                        <span class="${isOut ? 'bg-gray-500' : 'bg-red-600'} text-white px-2 py-0.5 rounded text-xs">
                            ${isOut ? 'หมด' : item.quantity}
                        </span>
                    </td>
                    <td class="p-3 text-center font-mono text-gray-600">${total}</td>
                    ${adminActions}
                </tr>
            `;
        });

        tableHTML += `</tbody></table></div>`;
        container.innerHTML = tableHTML;
    }
}

window.filterItems = () => {
    const term = document.getElementById('item-search').value.toLowerCase();
    renderItems(allItems.filter(i => i.name.toLowerCase().includes(term) || (i.description || '').toLowerCase().includes(term)));
};

// ฟังก์ชัน Render หน้า Storage (เหมือนเดิม)
function renderStorage(items) {
    const grid = document.getElementById('storage-grid');
    if (!grid) return;
    grid.innerHTML = items.length ? '' : '<div class="text-center col-span-full py-10 text-gray-400">ไม่พบรายการ...</div>'; 
    
    items.forEach(item => {
        const total = item.total_quantity || item.quantity;
        const isOut = item.quantity <= 0;
        const isLow = item.quantity > 0 && item.quantity < (total * 0.2); 

        let numColor = 'text-green-600';
        if (isOut) numColor = 'text-gray-400';
        else if (isLow) numColor = 'text-red-600';

        grid.innerHTML += `
            <div class="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition flex flex-col">
                <div class="w-full aspect-[4/5] bg-gray-100 relative">
                    <img src="${item.image_url || 'https://via.placeholder.com/300'}" class="w-full h-full object-cover ${isOut ? 'grayscale opacity-50' : ''}">
                    ${isOut ? '<div class="absolute inset-0 flex items-center justify-center bg-black/10 font-bold text-gray-600">หมด</div>' : ''}
                </div>
                
                <div class="p-3 flex-1 flex flex-col justify-between text-center">
                    <div>
                        <h3 class="font-bold text-sm text-gray-800 line-clamp-1" title="${item.name}">${item.name}</h3>
                        <p class="text-xs text-gray-400 mt-1 line-clamp-1">${item.description || '-'}</p>
                    </div>
                    
                    <div class="mt-3 pt-2 border-t border-gray-100">
                        <div class="text-xs text-gray-400 uppercase font-bold tracking-wider">คงเหลือ</div>
                        <div class="text-3xl font-extrabold ${numColor} font-mono leading-none mt-1">
                            ${item.quantity}<span class="text-sm text-gray-300 font-normal">/${total}</span>
                        </div>
                    </div>
                </div>
            </div>`;
    });
}

window.filterStorage = () => {
    const term = document.getElementById('storage-search').value.toLowerCase();
    renderStorage(allItems.filter(i => i.name.toLowerCase().includes(term)));
};

// --- ส่วนที่เหลือ (ประวัติ, Auth, Action) เหมือนเดิมเป๊ะ ---
async function loadLogs() {
    const tbody = document.getElementById('log-table-body');
    if (!tbody) return; 
    tbody.innerHTML = '<tr><td colspan="10" class="p-10 text-center text-gray-400 animate-pulse font-bold">กำลังดึงข้อมูลประวัติ...</td></tr>';

    const month = document.getElementById('filter-month')?.value;
    const branch = document.getElementById('filter-branch')?.value;

    let query = db.from('logs').select('*', { count: 'exact' });

    if (month) {
        const year = new Date().getFullYear(); 
        query = query.gte('report_date', `${year}-${month}-01`).lte('report_date', `${year}-${month}-31`);
    }

    if (branch) {
        query = query.ilike('branch', `%${branch}%`);
    }

    const from = currentPage * pageSize;
    const to = from + pageSize - 1;
    
    const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error) return console.error(error);
    
    renderLogs(data);
    updatePaginationUI(count);
}

function renderLogs(logs) {
    const tbody = document.getElementById('log-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    logs.forEach(log => {
        const isW = log.action_type === 'WITHDRAW';
        const date = log.report_date ? new Date(log.report_date).toLocaleDateString('th-TH') : '-';
        const actDate = log.activity_date ? new Date(log.activity_date).toLocaleDateString('th-TH') : '-';

        tbody.innerHTML += `
            <tr class="border-b hover:bg-gray-50 text-xs md:text-sm">
                <td class="p-3 text-gray-500 whitespace-nowrap">${date}</td>
                <td class="p-3 font-semibold">${log.item_name}</td>
                <td class="p-3">${isW ? log.user_name : 'Admin'}</td>
                <td class="p-3 text-gray-500 text-xs">${isW ? log.branch : 'เติมสต็อก'}</td>
                <td class="p-3">${isW ? (log.activity_name || '-') : '-'}</td>
                <td class="p-3 text-gray-500">${isW ? (log.activity_location || '-') : '-'}</td>
                <td class="p-3 text-gray-500 whitespace-nowrap">${isW ? actDate : '-'}</td>
                <td class="p-3 text-gray-400 italic">${log.note || '-'}</td>
                <td class="p-3 text-right font-bold ${isW ? 'text-red-600' : 'text-green-600'}">${isW ? '-' : '+'}${log.amount}</td>
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

    if(pageInput) {
        pageInput.value = currentPage + 1; 
        pageInput.max = currentTotalPages; 
    }
    if(totalDisplay) {
        totalDisplay.innerText = currentTotalPages; 
    }

    prevBtn.disabled = currentPage === 0;
    nextBtn.disabled = (currentPage + 1) >= currentTotalPages;
}

window.openAction = (id, type) => {
    const item = allItems.find(x => x.id === id);
    const itemName = item ? item.name : '';

    document.getElementById('action-item-id').value = id;
    document.getElementById('action-type').value = type;
    document.getElementById('action-amount').value = '';
    // ล้างค่าหมายเหตุเก่าทิ้งด้วย เพื่อความสะอาด
    document.getElementById('action-note').value = ''; 
    
    // ตั้งค่าเริ่มต้นเป็น "วันนี้" เสมอ
    const dateInput = document.getElementById('action-date');
    dateInput.value = new Date().toISOString().split('T')[0];
    
    const actionText = type === 'RESTOCK' ? 'เติมสต็อค' : 'เบิกของ';
    document.getElementById('action-title').innerText = `${actionText} - ${itemName}`;
    
    if(type === 'WITHDRAW') {
        // เปิดช่องรายละเอียดเฉพาะการเบิก (พวกสาขา กิจกรรม)
        document.getElementById('withdraw-fields').classList.remove('hidden');
        
        // --- ล็อกวันที่ (ห้ามแก้ไข) ---
        dateInput.readOnly = true; 
        // เปลี่ยนสีเป็นเทาๆ ให้รู้ว่าแก้ไม่ได้
        dateInput.classList.add('bg-gray-100', 'text-gray-500', 'cursor-not-allowed'); 
    }
    else {
        // ปิดช่องรายละเอียดเบิก (แต่หมายเหตุยังอยู่นะ เพราะเราย้าย HTML ออกมาแล้ว)
        document.getElementById('withdraw-fields').classList.add('hidden');
        
        // --- ปลดล็อกวันที่ (เผื่อคีย์บิลย้อนหลังตอนเติมของ) ---
        dateInput.readOnly = false;
        dateInput.classList.remove('bg-gray-100', 'text-gray-500', 'cursor-not-allowed'); 
    }
    
    toggleModal('modal-action', true);
};

async function submitAction() {
    const id = document.getElementById('action-item-id').value;
    const type = document.getElementById('action-type').value;
    const amount = parseInt(document.getElementById('action-amount').value);
    const reportDate = document.getElementById('action-date').value; 

    const branch = document.getElementById('action-branch').value;
    const actName = document.getElementById('action-activity-name').value;
    const actLoc = document.getElementById('action-activity-location').value;
    const actDate = document.getElementById('action-activity-date').value;
    const note = document.getElementById('action-note').value;

    if(!amount || !reportDate) return showToast('กรุณากรอกข้อมูลวันที่และจำนวน', 'warning');

    if (type === 'WITHDRAW') {
        if (!branch || !actName || !actLoc || !actDate) {
            return showToast('กรุณากรอกข้อมูลการเบิกให้ครบถ้วน', 'warning');
        }

        const dReport = new Date(reportDate);
        const dActivity = new Date(actDate);
        dReport.setHours(0,0,0,0);
        dActivity.setHours(0,0,0,0);

        if (dReport > dActivity && !isVip) {
            return showToast('หากต้องการคีย์ย้อนหลัง โปรดติดต่อผู้ดูแลระบบ', 'error');
        }
        if (dReport > dActivity && isVip) {
             showToast('Admin Override: บันทึกย้อนหลังสำเร็จ', 'info');
        }
    }

    const { data: item } = await db.from('items').select('*').eq('id', id).single();
    
    let newQty = 0;
    let newTotal = item.total_quantity || item.quantity; 

    if (type === 'WITHDRAW') {
        if (item.quantity < amount) return showToast('สต็อกไม่พอเบิก!', 'error');
        newQty = item.quantity - amount;
    } else {
        newQty = item.quantity + amount;
        newTotal = newQty; 
    }

    await db.from('items').update({ quantity: newQty, total_quantity: newTotal }).eq('id', id);
    
    await db.from('logs').insert({
        item_id: id,
        item_name: item.name,
        action_type: type,
        amount: amount,
        balance_after: newQty,
        report_date: reportDate,
        user_name: document.getElementById('action-name').value || 'Admin',
        branch: type === 'WITHDRAW' ? branch : '-', 
        note: note,
        activity_name: type === 'WITHDRAW' ? actName : null,
        activity_location: type === 'WITHDRAW' ? actLoc : null,
        activity_date: type === 'WITHDRAW' ? actDate : null
    });

    showToast('บันทึกรายการสำเร็จ', 'success');
    toggleModal('modal-action', false);
    
    if(document.getElementById('item-grid')) loadItems();
    if(document.getElementById('storage-grid')) loadItems('storage');
    if(document.getElementById('log-table-body')) loadLogs(); 
}

async function handleLogin() {
    const { data, error } = await db.auth.signInWithPassword({ email: document.getElementById('login-email').value, password: document.getElementById('login-pass').value });
    if (error) showToast('อีเมลหรือรหัสผ่านไม่ถูกต้อง', 'error');
    else { 
        showToast('ยินดีต้อนรับ Admin', 'success'); 
        checkUser(); 
        if(document.getElementById('item-grid')) loadItems(); 
        toggleModal('modal-login', false); 
    }
}

async function checkUser() {
    const { data: { session } } = await db.auth.getSession();
    currentUser = session?.user;

    if (currentUser) {
        const { data } = await db.from('user_permissions').select('can_backdate').eq('email', currentUser.email).single();
        if (data && data.can_backdate) isVip = true; else isVip = false;
    }

    const authDiv = document.getElementById('auth-section');
    if (authDiv) {
        authDiv.innerHTML = currentUser ? 
            `<button onclick="logout()" class="text-red-600 font-bold flex items-center gap-1"><i class="fa-solid fa-right-from-bracket"></i> ออกจากระบบ</button>` : 
            `<button onclick="toggleModal('modal-login', true)" class="bg-black text-white px-4 py-1.5 rounded-full text-sm flex items-center gap-1"><i class="fa-solid fa-user-lock"></i> Staff Login</button>`;
    }
    
    const adminToolbar = document.getElementById('admin-toolbar');
    if(adminToolbar) {
        if(currentUser) adminToolbar.classList.remove('hidden'); else adminToolbar.classList.add('hidden');
    }
}

async function logout() {
    try { await db.auth.signOut(); } catch (error) { console.warn('Logout error', error); } 
    finally { currentUser = null; localStorage.clear(); showToast('ออกจากระบบแล้ว', 'info'); setTimeout(() => { window.location.reload(); }, 500); }
}

window.toggleModal = (id, show) => { const el = document.getElementById(id); if(show) el.classList.remove('hidden'); else el.classList.add('hidden'); };

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
    
    await db.from('items').insert({ name, description: document.getElementById('add-desc').value, quantity: qty, total_quantity: qty, image_url: imageUrl });
    showToast('เพิ่มของชำร่วยใหม่สำเร็จ', 'success'); toggleModal('modal-add', false); loadItems();
}

window.deleteItem = (id) => { 
    const item = allItems.find(x => x.id === id);
    const itemName = item ? item.name : 'รายการนี้';

    customConfirm(`คุณต้องการลบ "${itemName}" ใช่หรือไม่?`, async () => {
        await db.from('items').update({ is_active: false }).eq('id', id);
        showToast(`ลบ "${itemName}" สำเร็จ`, 'success'); 
        loadItems();
    });
};

window.exportLogsToCSV = async () => {
    const month = document.getElementById('filter-month')?.value;
    const branch = document.getElementById('filter-branch')?.value;
    showToast('กำลังประมวลผลข้อมูลทั้งหมด...', 'info');
    let query = db.from('logs').select('*');
    if (month) {
        const year = new Date().getFullYear(); 
        query = query.gte('report_date', `${year}-${month}-01`).lte('report_date', `${year}-${month}-31`);
    }
    if (branch) query = query.ilike('branch', `%${branch}%`);
    const { data, error } = await query.order('created_at', { ascending: false }).limit(100000);

    if (error || !data || data.length === 0) return showToast('ไม่พบข้อมูลหรือเกิดข้อผิดพลาด', 'warning');

    let csvContent = "\uFEFFวันที่ทำรายการ,รายการสินค้า,ผู้เบิก,สาขา,ชื่อกิจกรรม,สถานที่,วันที่จัดกิจกรรม,หมายเหตุ,จำนวน,ยอดคงเหลือ\n";
    data.forEach(log => {
        const date = log.report_date ? new Date(log.report_date).toLocaleDateString('th-TH') : '-';
        const isW = log.action_type === 'WITHDRAW';
        const user = isW ? log.user_name : 'Admin';
        const branchCol = isW ? log.branch : 'เติมสต็อก';
        const amount = (isW ? '-' : '+') + log.amount;
        const note = (log.note || '-').replace(/,/g, ' '); 
        const balance = log.balance_after ?? '-';
        const actName = (log.activity_name || '-').replace(/,/g, ' ');
        const actLoc = (log.activity_location || '-').replace(/,/g, ' ');
        const actDate = log.activity_date ? new Date(log.activity_date).toLocaleDateString('th-TH') : '-';
        csvContent += `"${date}","${log.item_name}","${user}","${branchCol}","${actName}","${actLoc}","${actDate}","${note}","${amount}","${balance}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const timeStamp = new Date().toISOString().slice(0,10);
    link.setAttribute("download", `StockReport_${month ? 'Month'+month : 'AllYear'}_${timeStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`ดาวน์โหลดเรียบร้อย (${data.length} รายการ)`, 'success');
};

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
    if (newPage >= 0 && newPage < currentTotalPages) {
        currentPage = newPage;
        loadLogs();
    }
};

window.applyFilters = () => { currentPage = 0; loadLogs(); };