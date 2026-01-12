// --- ตั้งค่า Supabase ---
const SUPABASE_URL = 'https://dcigpisivgpofeljvoph.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_ccUnFtL3x-8eV8exjy4oIw__JiDK4VK'; 
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let allItems = []; 
let allLogs = []; 

window.onload = async () => {
    checkUser(); 
    if (document.getElementById('item-grid')) loadItems();
    if (document.getElementById('log-table-body')) {
        const isIndex = !!document.getElementById('item-grid');
        loadLogs(isIndex ? 5 : 50); 
    }
};

// --- ระบบแจ้งเตือน (Toast Notification) แทน Alert ---
window.showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    const colors = {
        'success': 'bg-green-600',
        'error': 'bg-red-600',
        'warning': 'bg-yellow-500',
        'info': 'bg-blue-600'
    };
    const icons = {
        'success': 'fa-circle-check',
        'error': 'fa-circle-xmark',
        'warning': 'fa-triangle-exclamation',
        'info': 'fa-circle-info'
    };
    toast.className = `${colors[type]} text-white px-10 py-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 transform scale-50 opacity-0 transition-all duration-300 pointer-events-auto min-w-[300px] border-4 border-white/20`;
    toast.innerHTML = `<i class="fa-solid ${icons[type]} text-6xl"></i><span class="text-2xl font-bold text-center">${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.remove('scale-50', 'opacity-0'), 10);
    setTimeout(() => { toast.classList.add('opacity-0', 'scale-90'); setTimeout(() => toast.remove(), 300); }, 2500);
};

// --- ระบบยืนยัน (Confirm Modal) แทน confirm() ---
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
    
    // แจ้งเตือนสต็อกต่ำ
    const lowStock = data.filter(i => i.quantity > 0 && i.quantity <= 5);
    if (lowStock.length > 0) showToast(`มีของใกล้หมด ${lowStock.length} รายการ`, 'warning');
}

function renderItems(items) {
    const grid = document.getElementById('item-grid');
    if (!grid) return;
    grid.innerHTML = items.length ? '' : '<div class="text-center col-span-full py-10 text-gray-400">ไม่พบรายการ...</div>'; 
    items.forEach(item => {
        const isOut = item.quantity <= 0;
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
                    <div class="absolute top-2 right-2 ${isOut ? 'bg-gray-500' : 'bg-red-600'} text-white text-xs px-2 py-1 rounded">${isOut ? 'ของหมด' : 'เหลือ ' + item.quantity}</div>
                </div>
                <div class="p-4"><h3 class="font-bold text-lg">${item.name}</h3><p class="text-gray-500 text-sm h-10 overflow-hidden">${item.description || '-'}</p>${adminBtns}</div>
            </div>`;
    });
}

window.filterItems = () => {
    const term = document.getElementById('item-search').value.toLowerCase();
    renderItems(allItems.filter(i => i.name.toLowerCase().includes(term) || (i.description || '').toLowerCase().includes(term)));
};

// --- 2. จัดการประวัติ ---
async function loadLogs(limit = 10) { 
    const { data, error } = await db.from('logs').select('*').order('created_at', { ascending: false }).limit(limit);
    if (error) return console.error(error);
    allLogs = data;
    renderLogs(data);
}

function renderLogs(logs) {
    const tbody = document.getElementById('log-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    logs.forEach(log => {
        const isW = log.action_type === 'WITHDRAW';
        const date = log.report_date ? new Date(log.report_date).toLocaleDateString('th-TH') : '-';
        tbody.innerHTML += `
            <tr class="border-b hover:bg-gray-50 text-xs md:text-sm">
                <td class="p-3 text-gray-500">${date}</td>
                <td class="p-3 font-semibold">${log.item_name}</td>
                <td class="p-3">${isW ? log.user_name : 'Admin'}</td>
                <td class="p-3 text-gray-500 text-xs">${isW ? log.branch : 'เติมสต็อก'}</td>
                <td class="p-3 text-gray-400 italic">${log.note || '-'}</td>
                <td class="p-3 text-right font-bold ${isW ? 'text-red-600' : 'text-green-600'}">${isW ? '-' : '+'}${log.amount}</td>
                <td class="p-3 text-right font-mono font-bold text-blue-600 bg-blue-50">${log.balance_after ?? '-'}</td>
            </tr>`;
    });
}

// --- 3. ระบบเบิก/เติมสต็อก (ใช้ Toast) ---
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
    if(!amount || !reportDate) return showToast('กรุณากรอกข้อมูลให้ครบ', 'warning');

    const { data: item } = await db.from('items').select('*').eq('id', id).single();
    let newQty = type === 'WITHDRAW' ? item.quantity - amount : item.quantity + amount;
    if (type === 'WITHDRAW' && item.quantity < amount) return showToast('สต็อกไม่พอเบิก!', 'error');

    await db.from('items').update({ quantity: newQty }).eq('id', id);
    await db.from('logs').insert({ item_id: id, item_name: item.name, action_type: type, amount, balance_after: newQty, report_date: reportDate, user_name: document.getElementById('action-name').value || 'Admin', branch: document.getElementById('action-branch').value || '-', note: document.getElementById('action-note').value });

    showToast('บันทึกรายการสำเร็จ', 'success');
    toggleModal('modal-action', false);
    loadItems();
    loadLogs(document.getElementById('item-grid') ? 5 : 50);
}

// --- 4. ฟังก์ชันเบื้องหลัง (Auth / CRUD) ---
async function handleLogin() {
    const { data, error } = await db.auth.signInWithPassword({ email: document.getElementById('login-email').value, password: document.getElementById('login-pass').value });
    if (error) showToast('อีเมลหรือรหัสผ่านไม่ถูกต้อง', 'error');
    else { showToast('ยินดีต้อนรับ Admin', 'success'); checkUser(); loadItems(); toggleModal('modal-login', false); }
}

async function checkUser() {
    const { data: { session } } = await db.auth.getSession();
    currentUser = session?.user;
    document.getElementById('auth-section').innerHTML = currentUser ? `<button onclick="logout()" class="text-red-600 font-bold flex items-center gap-1"><i class="fa-solid fa-right-from-bracket"></i> ออกจากระบบ</button>` : `<button onclick="toggleModal('modal-login', true)" class="bg-black text-white px-4 py-1.5 rounded-full text-sm flex items-center gap-1"><i class="fa-solid fa-user-lock"></i> Staff Login</button>`;
    if(document.getElementById('admin-toolbar')) {
        if(currentUser) document.getElementById('admin-toolbar').classList.remove('hidden');
        else document.getElementById('admin-toolbar').classList.add('hidden');
    }
}

async function logout() {
    try {
        // พยายามบอก Server ว่าออกแล้วนะ
        await db.auth.signOut(); 
    } catch (error) {
        // ถ้าบอก Server ไม่ได้ (เน็ตหลุด) ช่างมัน... เราจะลบเองในเครื่อง
        console.warn('Logout error (ช่างมัน):', error);
    } finally {
        // ไม่ว่าจะเกิดอะไรขึ้น "ต้อง" ทำส่วนนี้เสมอ
        
        // 1. ล้างค่าตัวแปร
        currentUser = null; 
        
        // 2. ล้าง LocalStorage ของ Supabase (กวาดให้เกลี้ยง)
        localStorage.clear(); // หรือจะลบเฉพาะ key ของ supabase ก็ได้แต่นี่ง่ายสุดสำหรับแอปเรา
        
        // 3. แจ้งเตือนและรีเฟรชหน้าจอ
        showToast('ออกจากระบบแล้ว', 'info');
        checkUser();
        
        // 4. (ท่าไม้ตาย) รีโหลดหน้าเว็บใหม่ 1 ที เพื่อความชัวร์ 100%
        setTimeout(() => {
            window.location.reload();
        }, 500);
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
    await db.from('items').insert({ name, description: document.getElementById('add-desc').value, quantity: qty, image_url: imageUrl });
    showToast('เพิ่มของชำร่วยใหม่สำเร็จ', 'success'); toggleModal('modal-add', false); loadItems();
}

window.deleteItem = (id) => { 
    customConfirm('คุณต้องการลบรายการนี้ใช่หรือไม่?', async () => {
        await db.from('items').update({ is_active: false }).eq('id', id);
        showToast('ลบรายการสำเร็จ', 'success'); loadItems();
    });
};

// ฟังก์ชัน Export CSV (ดึงข้อมูลทั้งหมดตามตัวกรอง ไม่สนใจหน้า)
window.exportLogsToCSV = async () => {
    // 1. ดึงค่า Filter จากหน้าจอมาใช้
    const month = document.getElementById('filter-month')?.value;
    const branch = document.getElementById('filter-branch')?.value;

    showToast('กำลังประมวลผลข้อมูลทั้งหมด...', 'info');

    // 2. สร้าง Query พื้นฐาน (ดึงทั้งหมด ไม่จำกัดจำนวน)
    let query = db.from('logs').select('*');

    // 3. ใส่ตัวกรองให้เหมือนกับที่ตาเห็นในตารางเป๊ะๆ
    if (month) {
        const year = new Date().getFullYear(); 
        // ใช้ logic เดียวกับ loadLogs เพื่อความแม่นยำ
        query = query.gte('report_date', `${year}-${month}-01`)
                     .lte('report_date', `${year}-${month}-31`);
    }

    if (branch) {
        query = query.ilike('branch', `%${branch}%`);
    }

    // 4. ดึงข้อมูลจริง (สังเกตว่าไม่มี .range หรือ .limit)
    const { data, error } = await query.order('created_at', { ascending: false }).limit(100000);

    if (error) {
        console.error(error);
        return showToast('เกิดข้อผิดพลาดในการดึงข้อมูล', 'error');
    }

    if (!data || data.length === 0) {
        return showToast('ไม่พบข้อมูลตามเงื่อนไขที่เลือก', 'warning');
    }

    // 5. แปลงข้อมูลเป็น CSV
    // \uFEFF คือ BOM เพื่อให้ Excel อ่านภาษาไทยออก
    let csvContent = "\uFEFFวันที่,รายการสินค้า,ผู้ทำรายการ,สาขา,หมายเหตุ,จำนวน,ยอดคงเหลือ\n";
    
    data.forEach(log => {
        const date = log.report_date ? new Date(log.report_date).toLocaleDateString('th-TH') : '-';
        const isW = log.action_type === 'WITHDRAW';
        const user = isW ? log.user_name : 'Admin'; // ถ้าเติมของ ให้ขึ้น Admin เสมอ
        const branchCol = isW ? log.branch : 'เติมสต็อก';
        // ใส่เครื่องหมาย + หรือ - หน้าตัวเลข
        const amount = (isW ? '-' : '+') + log.amount;
        // ลบเครื่องหมาย , ในหมายเหตุออก เพื่อไม่ให้ CSV พัง
        const note = (log.note || '-').replace(/,/g, ' '); 
        const balance = log.balance_after ?? '-';

        // จัด Format CSV: "ค่า","ค่า","ค่า"
        csvContent += `"${date}","${log.item_name}","${user}","${branchCol}","${note}","${amount}","${balance}"\n`;
    });

    // 6. สร้าง Link และสั่งดาวน์โหลด
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    // ตั้งชื่อไฟล์ให้สื่อความหมาย เช่น stock_report_Month01.csv
    const timeStamp = new Date().toISOString().slice(0,10);
    const fileName = `StockReport_${month ? 'Month'+month : 'AllYear'}_${timeStamp}.csv`;
    
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`ดาวน์โหลดเรียบร้อย (${data.length} รายการ)`, 'success');
};

let currentPage = 0;
let currentTotalPages = 1; // เพิ่มตัวนี้ เพื่อเอาไว้เช็คว่ากรอกเลขเกินหน้าที่มีจริงไหม
const pageSize = 25; // แสดงหน้าละ 25 รายการ

// แก้ไขฟังก์ชัน loadLogs ให้ฉลาดขึ้น
async function loadLogs() {
    const tbody = document.getElementById('log-table-body');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="p-10 text-center text-gray-400 animate-pulse font-bold">กำลังดึงข้อมูลประวัติ...</td></tr>';

    const month = document.getElementById('filter-month')?.value;
    const branch = document.getElementById('filter-branch')?.value;

    let query = db.from('logs').select('*', { count: 'exact' });

    // 1. กรองตามเดือน (ถ้าเลือก)
    if (month) {
        const year = new Date().getFullYear(); // ปีปัจจุบัน 2026
        const startDate = `${year}-${month}-01`;
        const endDate = `${year}-${month}-31`;
        query = query.gte('report_date', startDate).lte('report_date', endDate);
    }

    // 2. กรองตามสาขา (ถ้าพิมพ์)
    if (branch) {
        query = query.ilike('branch', `%${branch}%`);
    }

    // 3. ทำ Pagination (ดึงข้อมูลตามช่วงหน้า)
    const from = currentPage * pageSize;
    const to = from + pageSize - 1;
    
    const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error) return console.error(error);
    
    allLogs = data;
    renderLogs(data);
    updatePaginationUI(count);
}

// อัปเดตสถานะปุ่มและเลขหน้า
function updatePaginationUI(totalCount) {
    const info = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const pageInput = document.getElementById('page-input');      // เพิ่ม
    const totalDisplay = document.getElementById('total-pages-display'); // เพิ่ม

    if (!info) return;

    currentTotalPages = Math.ceil(totalCount / pageSize) || 1; // คำนวณหน้าทั้งหมดเก็บใส่ตัวแปร

    info.innerText = `รายการที่ ${currentPage * pageSize + 1} - ${Math.min((currentPage + 1) * pageSize, totalCount)} จากทั้งหมด ${totalCount}`;

    // อัปเดต UI ช่องกรอก
    if(pageInput) {
        pageInput.value = currentPage + 1; // ใส่เลขหน้าปัจจุบันลงในช่อง
        pageInput.max = currentTotalPages; // กันไม่ให้กดลูกศรเกิน
    }
    if(totalDisplay) {
        totalDisplay.innerText = currentTotalPages; // แสดงจำนวนหน้าทั้งหมดหลังเครื่องหมาย /
    }

    prevBtn.disabled = currentPage === 0;
    nextBtn.disabled = (currentPage + 1) >= currentTotalPages;
}

// ฟังก์ชันกระโดดไปหน้าที่ระบุ
window.jumpToPage = (pageNum) => {
    pageNum = parseInt(pageNum);

    // ตรวจสอบความถูกต้อง
    if (!pageNum || pageNum < 1 || pageNum > currentTotalPages) {
        showToast(`กรุณาระบุหน้า 1 - ${currentTotalPages}`, 'warning');
        // รีเซ็ตเลขในช่องกลับเป็นหน้าปัจจุบัน
        document.getElementById('page-input').value = currentPage + 1;
        return;
    }

    // แปลงเป็น index (เพราะระบบนับเริ่ม 0 แต่คนนับเริ่ม 1)
    currentPage = pageNum - 1;
    loadLogs();
};

// ฟังก์ชันเปลี่ยนหน้า
window.changePage = (direction) => {
    const newPage = currentPage + direction;
    
    // กันไม่ให้ถอยหลังไปน้อยกว่าหน้า 1 (index 0)
    // และกันไม่ให้ไปข้างหน้าเกินจำนวนหน้าทั้งหมดที่มี
    if (newPage >= 0 && newPage < currentTotalPages) {
        currentPage = newPage;
        loadLogs();
    }
};

// ฟังก์ชันรีเซ็ตหน้าเมื่อมีการกรองใหม่
window.applyFilters = () => {
    currentPage = 0; // กลับไปเริ่มหน้า 1 ใหม่
    loadLogs();
};