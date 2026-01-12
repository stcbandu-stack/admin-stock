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

// เริ่มทำงานเมื่อเว็บโหลด
window.onload = async () => {
    checkUser(); 
    if (document.getElementById('item-grid')) loadItems();
    if (document.getElementById('log-table-body')) {
        // ถ้าอยู่หน้าประวัติ ให้โหลดประวัติ
        loadLogs(); 
    }
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

// --- 1. จัดการรายการสินค้า ---
async function loadItems() {
    const grid = document.getElementById('item-grid');
    if (grid) grid.innerHTML = '<div class="text-center col-span-full py-20 text-gray-400 font-bold animate-pulse">กำลังโหลดข้อมูล...</div>';
    
    const { data, error } = await db.from('items').select('*').eq('is_active', true).order('quantity', { ascending: false });
    
    if (error) return console.error(error);
    allItems = data;
    renderItems(data);
    
    const lowStock = data.filter(i => i.quantity > 0 && i.quantity <= 5);
    if (lowStock.length > 0) showToast(`มีของใกล้หมด ${lowStock.length} รายการ`, 'warning');
}

function renderItems(items) {
    const grid = document.getElementById('item-grid');
    if (!grid) return;
    grid.innerHTML = items.length ? '' : '<div class="text-center col-span-full py-10 text-gray-400">ไม่พบรายการ...</div>'; 
    
    items.forEach(item => {
        const isOut = item.quantity <= 0;
        // ** แก้ไขตรงนี้: ใช้ total_quantity ที่สร้างใหม่ **
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
            
        grid.innerHTML += `
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
}

window.filterItems = () => {
    const term = document.getElementById('item-search').value.toLowerCase();
    renderItems(allItems.filter(i => i.name.toLowerCase().includes(term) || (i.description || '').toLowerCase().includes(term)));
};

// --- 2. จัดการประวัติ (Pagination & Logic) ---
async function loadLogs() {
    const tbody = document.getElementById('log-table-body');
    if (!tbody) return; // ถ้าไม่มีตาราง (เช่นอยู่หน้าหลัก) ไม่ต้องทำอะไร
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

    // Pagination
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

// --- 3. ระบบเบิก/เติมสต็อก (หัวใจสำคัญของการแก้ Logic) ---
window.openAction = (id, type) => {
    document.getElementById('action-item-id').value = id;
    document.getElementById('action-type').value = type;
    document.getElementById('action-amount').value = '';
    document.getElementById('action-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('action-title').innerText = type === 'RESTOCK' ? 'เติมสต็อค' : 'เบิกของ';
    
    if(type === 'WITHDRAW') document.getElementById('withdraw-fields').classList.remove('hidden');
    else document.getElementById('withdraw-fields').classList.add('hidden');
    
    toggleModal('modal-action', true);
};

async function submitAction() {
    const id = document.getElementById('action-item-id').value;
    const type = document.getElementById('action-type').value;
    const amount = parseInt(document.getElementById('action-amount').value);
    const reportDate = document.getElementById('action-date').value; 

    // ดึงค่าใหม่
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

        // Logic ตรวจสอบวันที่คีย์ย้อนหลัง
        const dReport = new Date(reportDate);
        const dActivity = new Date(actDate);
        dReport.setHours(0,0,0,0);
        dActivity.setHours(0,0,0,0);

        if (dReport > dActivity) {
            return showToast('หากต้องการคีย์ย้อนหลัง โปรดติดต่อผู้ดูแลระบบ', 'error');
        }
    }

    // ** ตรงนี้คือจุดเปลี่ยน Logic 15/30 **
    const { data: item } = await db.from('items').select('*').eq('id', id).single();
    
    let newQty = 0;
    let newTotal = item.total_quantity || item.quantity; // เริ่มต้นเอาค่าเดิมมาตั้ง

    if (type === 'WITHDRAW') {
        if (item.quantity < amount) return showToast('สต็อกไม่พอเบิก!', 'error');
        newQty = item.quantity - amount;
        // กรณีเบิก: ไม่เปลี่ยน newTotal (ตัวส่วนเท่าเดิม)
    } else {
        // กรณีเติม: เพิ่มจำนวน และรีเซ็ตฐาน (ตัวส่วน) ใหม่
        newQty = item.quantity + amount;
        newTotal = newQty; 
    }

    // อัปเดตทั้ง 2 ค่า
    await db.from('items').update({ 
        quantity: newQty,
        total_quantity: newTotal 
    }).eq('id', id);
    
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
    
    // โหลดข้อมูลใหม่ (ดูว่าอยู่หน้าไหน)
    if(document.getElementById('item-grid')) loadItems();
    if(document.getElementById('log-table-body')) loadLogs(); 
}

// --- 4. ฟังก์ชันเบื้องหลัง (Auth / CRUD / CSV) ---
async function handleLogin() {
    const { data, error } = await db.auth.signInWithPassword({ email: document.getElementById('login-email').value, password: document.getElementById('login-pass').value });
    if (error) showToast('อีเมลหรือรหัสผ่านไม่ถูกต้อง', 'error');
    else { showToast('ยินดีต้อนรับ Admin', 'success'); checkUser(); if(document.getElementById('item-grid')) loadItems(); toggleModal('modal-login', false); }
}

async function checkUser() {
    const { data: { session } } = await db.auth.getSession();
    currentUser = session?.user;
    const authDiv = document.getElementById('auth-section');
    
    if (authDiv) {
        authDiv.innerHTML = currentUser ? 
            `<button onclick="logout()" class="text-red-600 font-bold flex items-center gap-1"><i class="fa-solid fa-right-from-bracket"></i> ออกจากระบบ</button>` : 
            `<button onclick="toggleModal('modal-login', true)" class="bg-black text-white px-4 py-1.5 rounded-full text-sm flex items-center gap-1"><i class="fa-solid fa-user-lock"></i> Staff Login</button>`;
    }
    
    const adminToolbar = document.getElementById('admin-toolbar');
    if(adminToolbar) {
        if(currentUser) adminToolbar.classList.remove('hidden');
        else adminToolbar.classList.add('hidden');
    }
}

async function logout() {
    try {
        await db.auth.signOut(); 
    } catch (error) {
        console.warn('Logout error (ignored):', error);
    } finally {
        currentUser = null; 
        localStorage.clear(); 
        showToast('ออกจากระบบแล้ว', 'info');
        setTimeout(() => { window.location.reload(); }, 500);
    }
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
    
    // ** สร้างของใหม่ ให้ total = qty **
    await db.from('items').insert({ 
        name, 
        description: document.getElementById('add-desc').value, 
        quantity: qty, 
        total_quantity: qty, 
        image_url: imageUrl 
    });

    showToast('เพิ่มของชำร่วยใหม่สำเร็จ', 'success'); toggleModal('modal-add', false); loadItems();
}

window.deleteItem = (id) => { 
    customConfirm('คุณต้องการลบรายการนี้ใช่หรือไม่?', async () => {
        await db.from('items').update({ is_active: false }).eq('id', id);
        showToast('ลบรายการสำเร็จ', 'success'); loadItems();
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

window.applyFilters = () => {
    currentPage = 0; 
    loadLogs();
};