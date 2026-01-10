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

// --- 1. จัดการรายการสินค้า ---
async function loadItems() {
    const grid = document.getElementById('item-grid');
    if (grid) grid.innerHTML = '<div class="text-center col-span-full py-20 text-gray-400">กำลังโหลดข้อมูล...</div>';

    const { data, error } = await db.from('items').select('*').eq('is_active', true).order('quantity', { ascending: false });
    if (error) return console.error(error);
    allItems = data;
    renderItems(data);
}

function renderItems(items) {
    const grid = document.getElementById('item-grid');
    if (!grid) return;
    grid.innerHTML = items.length ? '' : '<div class="text-center col-span-full py-10 text-gray-400">ไม่พบรายการ...</div>'; 

    items.forEach(item => {
        const isOut = item.quantity <= 0;
        const adminBtns = currentUser ? `
            <div class="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                <button onclick="openAction(${item.id}, 'RESTOCK')" class="flex-1 py-1 bg-gray-100 rounded text-sm">เติม</button>
                <button onclick="openAction(${item.id}, 'WITHDRAW')" class="flex-1 py-1 bg-black text-white rounded text-sm">เบิก</button>
            </div>
            <div class="flex gap-2 mt-2">
                <button onclick="openEditModal(${item.id})" class="flex-1 text-yellow-600 text-xs border border-yellow-600 rounded py-1">แก้ไข</button>
                <button onclick="deleteItem(${item.id})" class="flex-1 text-red-500 text-xs border border-red-500 rounded py-1">ลบ</button>
            </div>` : '';

        grid.innerHTML += `
            <div class="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition">
                <div class="w-full aspect-[4/5] bg-gray-100 relative">
                    <img src="${item.image_url || 'https://via.placeholder.com/300'}" class="w-full h-full object-cover ${isOut ? 'grayscale' : ''}">
                    <div class="absolute top-2 right-2 ${isOut ? 'bg-gray-500' : 'bg-red-600'} text-white text-xs px-2 py-1 rounded">
                        ${isOut ? 'ของหมด' : 'เหลือ ' + item.quantity}
                    </div>
                </div>
                <div class="p-4">
                    <h3 class="font-bold text-lg">${item.name}</h3>
                    <p class="text-gray-500 text-sm h-10 overflow-hidden">${item.description || '-'}</p>
                    ${adminBtns}
                </div>
            </div>`;
    });
}

window.filterItems = () => {
    const term = document.getElementById('item-search').value.toLowerCase();
    renderItems(allItems.filter(i => i.name.toLowerCase().includes(term) || (i.description || '').toLowerCase().includes(term)));
};

// --- 2. จัดการประวัติการทำรายการ ---
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
        const displayDate = log.report_date ? new Date(log.report_date).toLocaleDateString('th-TH') : '-';
        tbody.innerHTML += `
            <tr class="border-b hover:bg-gray-50 text-xs md:text-sm">
                <td class="p-3 text-gray-500">${displayDate}</td>
                <td class="p-3 font-semibold">${log.item_name}</td>
                <td class="p-3">${isW ? log.user_name : 'Admin'}</td>
                <td class="p-3 text-gray-500 text-xs">${isW ? log.branch : 'เติมสต็อก'}</td>
                <td class="p-3 text-gray-400 italic">${log.note || '-'}</td>
                <td class="p-3 text-right font-bold ${isW ? 'text-red-600' : 'text-green-600'}">${isW ? '-' : '+'}${log.amount}</td>
                <td class="p-3 text-right font-mono font-bold text-blue-600 bg-blue-50">${log.balance_after ?? '-'}</td>
            </tr>`;
    });
}

window.filterLogs = () => {
    const term = document.getElementById('log-search')?.value.toLowerCase();
    if(term) renderLogs(allLogs.filter(l => l.item_name.toLowerCase().includes(term) || (l.user_name || '').toLowerCase().includes(term) || (l.branch || '').toLowerCase().includes(term)));
};

// --- 3. ระบบเบิก/เติมสต็อก ---
window.openAction = (id, type) => {
    document.getElementById('action-item-id').value = id;
    document.getElementById('action-type').value = type;
    document.getElementById('action-amount').value = '';
    document.getElementById('action-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('action-title').innerText = type === 'RESTOCK' ? 'เติมสต็อค' : 'เบิกของ';
    
    if(type === 'WITHDRAW') document.getElementById('withdraw-fields').classList.remove('hidden');
    else document.getElementById('withdraw-fields').classList.add('hidden');
    toggleModal('modal-action', true);
}

async function submitAction() {
    const id = document.getElementById('action-item-id').value;
    const type = document.getElementById('action-type').value;
    const amount = parseInt(document.getElementById('action-amount').value);
    const reportDate = document.getElementById('action-date').value;

    if(!amount || !reportDate) return alert('ใส่จำนวนและวันที่ด้วยครับ');

    const { data: item } = await db.from('items').select('*').eq('id', id).single();
    let newQty = type === 'WITHDRAW' ? item.quantity - amount : item.quantity + amount;
    if (type === 'WITHDRAW' && item.quantity < amount) return alert('ของไม่พอ!');

    await db.from('items').update({ quantity: newQty }).eq('id', id);
    await db.from('logs').insert({
        item_id: id, item_name: item.name, action_type: type, amount: amount, 
        balance_after: newQty, report_date: reportDate,
        user_name: document.getElementById('action-name').value || 'Admin',
        branch: document.getElementById('action-branch').value || '-',
        note: document.getElementById('action-note').value
    });

    alert('เรียบร้อย!');
    toggleModal('modal-action', false);
    loadItems();
    loadLogs(document.getElementById('item-grid') ? 5 : 50);
}

// --- 4. ฟังก์ชันพื้นฐานอื่นๆ (Auth / Modal / CRUD) ---
async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;
    const { data, error } = await db.auth.signInWithPassword({ email, password: pass });
    if (error) alert('รหัสผ่านผิด');
    else { currentUser = data.user; checkUser(); loadItems(); toggleModal('modal-login', false); }
}

async function checkUser() {
    const { data: { session } } = await db.auth.getSession();
    currentUser = session?.user;
    document.getElementById('auth-section').innerHTML = currentUser ? `<button onclick="logout()" class="text-red-600 font-bold">ออกจากระบบ</button>` : `<button onclick="toggleModal('modal-login', true)" class="bg-black text-white px-3 py-1 rounded text-sm">Staff Login</button>`;
    if(document.getElementById('admin-toolbar')) {
        if(currentUser) document.getElementById('admin-toolbar').classList.remove('hidden');
        else document.getElementById('admin-toolbar').classList.add('hidden');
    }
}

async function logout() { await db.auth.signOut(); checkUser(); loadItems(); }

window.toggleModal = (id, show) => { const el = document.getElementById(id); if(show) el.classList.remove('hidden'); else el.classList.add('hidden'); }

window.openEditModal = (id) => {
    const item = allItems.find(x => x.id === id);
    if(!item) return;
    document.getElementById('edit-id').value = item.id;
    document.getElementById('edit-name').value = item.name;
    document.getElementById('edit-desc').value = item.description || '';
    toggleModal('modal-edit', true);
}

window.submitEdit = async () => {
    const id = document.getElementById('edit-id').value;
    const name = document.getElementById('edit-name').value;
    const desc = document.getElementById('edit-desc').value;
    const file = document.getElementById('edit-image').files[0];
    let updateData = { name, description: desc };

    if (file) {
        const fileName = `edit-${Date.now()}.${file.name.split('.').pop()}`;
        await db.storage.from('item-images').upload(fileName, file);
        updateData.image_url = db.storage.from('item-images').getPublicUrl(fileName).data.publicUrl;
    }
    await db.from('items').update(updateData).eq('id', id);
    alert('แก้ไขแล้ว'); toggleModal('modal-edit', false); loadItems();
}

async function addItem() {
    const name = document.getElementById('add-name').value;
    const qty = document.getElementById('add-qty').value;
    const file = document.getElementById('add-image').files[0];
    let imageUrl = '';
    if(file) {
        const fileName = `item-${Date.now()}.${file.name.split('.').pop()}`;
        await db.storage.from('item-images').upload(fileName, file);
        imageUrl = db.storage.from('item-images').getPublicUrl(fileName).data.publicUrl;
    }
    await db.from('items').insert({ name, description: document.getElementById('add-desc').value, quantity: qty, image_url: imageUrl });
    alert('เพิ่มแล้ว'); toggleModal('modal-add', false); loadItems();
}

window.deleteItem = async (id) => { if(confirm('จะลบจริงหรอ?')) { await db.from('items').update({ is_active: false }).eq('id', id); loadItems(); } }

window.exportLogsToCSV = async () => {
    const { data } = await db.from('logs').select('*').order('created_at', { ascending: false });
    let csvContent = "\uFEFFวันที่,รายการสินค้า,ผู้ทำรายการ,สาขา,หมายเหตุ,จำนวน,ยอดคงเหลือ\n";
    data.forEach(log => {
        const date = log.report_date ? new Date(log.report_date).toLocaleDateString('th-TH') : '-';
        const isW = log.action_type === 'WITHDRAW';
        csvContent += `"${date}","${log.item_name}","${isW ? log.user_name : 'Admin'}","${isW ? log.branch : 'เติมสต็อก'}","${(log.note || '-').replace(/,/g, ' ')}","${(isW ? '-' : '+') + log.amount}","${log.balance_after ?? '-'}"\n`;
    });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })));
    link.setAttribute("download", `stock_report_${new Date().toLocaleDateString('th-TH')}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
};