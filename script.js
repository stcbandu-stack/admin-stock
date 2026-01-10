// --- ตั้งค่า Supabase ---
const SUPABASE_URL = 'https://dcigpisivgpofeljvoph.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_ccUnFtL3x-8eV8exjy4oIw__JiDK4VK'; 

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let allItems = []; // ตัวแปรเก็บข้อมูลสินค้าสำหรับกดแก้ไข

// ทำงานทันทีเมื่อเปิดเว็บ
window.onload = async () => {
    checkUser(); 
    
    // ถ้าอยู่หน้าหลัก (มีตารางสินค้า)
    if (document.getElementById('item-grid')) {
        loadItems();
    }

    // ถ้าอยู่หน้าประวัติ (มีตารางประวัติ)
    if (document.getElementById('log-table-body')) {
        const limit = document.getElementById('item-grid') ? 5 : 50; 
        loadLogs(limit); 
    }
};

// --- 1. ฟังก์ชันโหลดข้อมูล ---
async function loadItems() {
    // เปลี่ยนจาก .order('id') เป็นการเรียงตาม quantity จากมากไปน้อย
    const { data, error } = await db.from('items')
        .select('*')
        .eq('is_active', true)
        .order('quantity', { ascending: false }); // แก้บรรทัดนี้
    
    if (error) return console.error(error);
    
    allItems = data; // เก็บข้อมูลลงตัวแปรกลาง
    
    const grid = document.getElementById('item-grid');
    grid.innerHTML = ''; 

    data.forEach(item => {
        const isOut = item.quantity <= 0;
        
        // ปุ่ม Admin (ถ้าล็อกอินจะเห็นปุ่ม แก้ไข/ลบ)
        const adminBtns = currentUser ? `
            <div class="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                <button onclick="openAction(${item.id}, 'RESTOCK')" class="flex-1 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm">เติม</button>
                <button onclick="openAction(${item.id}, 'WITHDRAW')" class="flex-1 py-1 bg-black text-white hover:bg-gray-800 rounded text-sm">เบิก</button>
            </div>
            <div class="flex gap-2 mt-2">
                <button onclick="openEditModal(${item.id})" class="flex-1 text-center text-yellow-600 text-xs border border-yellow-600 rounded py-1 hover:bg-yellow-50">แก้ไข</button>
                <button onclick="deleteItem(${item.id})" class="flex-1 text-center text-red-500 text-xs border border-red-500 rounded py-1 hover:bg-red-50">ลบ</button>
            </div>
        ` : '';

        // *** ตรงนี้แก้เป็น 4:5 ให้แล้วนะครับ ***
        grid.innerHTML += `
            <div class="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition">
                <div class="w-full aspect-[4/5] bg-gray-100 relative">
                    <img src="${item.image_url || 'https://via.placeholder.com/300'}" class="w-full h-full object-cover ${isOut ? 'grayscale' : ''}">
                    <div class="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded">เหลือ ${item.quantity}</div>
                </div>
                <div class="p-4">
                    <h3 class="font-bold text-lg">${item.name}</h3>
                    <p class="text-gray-500 text-sm h-10 overflow-hidden text-ellipsis">${item.description || '-'}</p>
                    ${adminBtns}
                </div>
            </div>
        `;
    });
}

async function loadLogs(limit = 10) { 
    const { data, error } = await db.from('logs').select('*').order('created_at', { ascending: false }).limit(limit);
    if (error) return console.error(error);

    const tbody = document.getElementById('log-table-body');
    if (!tbody) return; 
    
    tbody.innerHTML = ''; // ล้างข้อมูลเก่าก่อนโหลดใหม่

    // พี่ลืมบรรทัดข้างล่างนี้ครับ (ลูป foreach)
    data.forEach(log => {
        const isWithdraw = log.action_type === 'WITHDRAW';
        const date = new Date(log.created_at).toLocaleDateString('th-TH');
        
        tbody.innerHTML += `
            <tr class="border-b hover:bg-gray-50">
                <td class="p-3 text-gray-500">${date}</td>
                <td class="p-3 font-semibold">${log.item_name}</td>
                <td class="p-3">${isWithdraw ? log.user_name : 'Admin'}</td>
                <td class="p-3 text-gray-500 text-xs">${isWithdraw ? log.branch : 'เติมสต็อก'}</td>
                <td class="p-3 text-gray-400 italic">${log.note || '-'}</td>
                <td class="p-3 text-right font-bold ${isWithdraw ? 'text-red-600' : 'text-green-600'}">
                    ${isWithdraw ? '-' : '+'}${log.amount}
                </td>
                <td class="p-3 text-right font-mono font-bold text-blue-600 bg-blue-50">
                    ${log.balance_after !== null ? log.balance_after : '-'}
                </td>
            </tr>
        `;
    });
}


// --- 2. ฟังก์ชันจัดการระบบ ---

// ล็อกอิน
async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;
    const { data, error } = await db.auth.signInWithPassword({ email, password: pass });
    
    if (error) alert('อีเมลหรือรหัสผ่านผิด');
    else {
        currentUser = data.user;
        toggleModal('modal-login', false);
        checkUser(); 
        loadItems(); 
    }
}

// ตรวจสอบสถานะ User
async function checkUser() {
    const { data: { session } } = await db.auth.getSession();
    currentUser = session?.user;

    const authDiv = document.getElementById('auth-section');
    const adminTool = document.getElementById('admin-toolbar');

    if (currentUser) {
        authDiv.innerHTML = `<button onclick="logout()" class="text-red-600 text-sm font-bold">ออกจากระบบ</button>`;
        if(adminTool) adminTool.classList.remove('hidden');
    } else {
        authDiv.innerHTML = `<button onclick="toggleModal('modal-login', true)" class="bg-black text-white px-3 py-1 rounded text-sm">Staff Login</button>`;
        if(adminTool) adminTool.classList.add('hidden');
    }
}

async function logout() {
    await db.auth.signOut();
    checkUser();
    if(document.getElementById('item-grid')) loadItems();
}

// เปิดหน้าต่าง เบิก/เติม
window.openAction = (id, type) => {
    document.getElementById('action-item-id').value = id;
    document.getElementById('action-type').value = type;
    document.getElementById('action-title').innerText = type === 'RESTOCK' ? 'เติมสต็อค' : 'เบิกของ';
    
    if(type === 'WITHDRAW') document.getElementById('withdraw-fields').classList.remove('hidden');
    else document.getElementById('withdraw-fields').classList.add('hidden');

    toggleModal('modal-action', true);
}

// ยืนยันการ เบิก/เติม
async function submitAction() {
    const id = document.getElementById('action-item-id').value;
    const type = document.getElementById('action-type').value;
    const amount = parseInt(document.getElementById('action-amount').value);

    if(!amount) return alert('ใส่จำนวนด้วยครับ');

    const { data: item } = await db.from('items').select('*').eq('id', id).single();
    
    let newQty = item.quantity;
    if (type === 'WITHDRAW') {
        if (item.quantity < amount) return alert('ของไม่พอ!');
        newQty -= amount;
    } else {
        newQty += amount;
    }

    await db.from('items').update({ quantity: newQty }).eq('id', id);

await db.from('logs').insert({
    item_id: id,
    item_name: item.name,
    action_type: type,
    amount: amount,
    balance_after: newQty, // เพิ่มบรรทัดนี้เพื่อบันทึกยอดคงเหลือหลังทำรายการ
    user_name: document.getElementById('action-name').value || 'Admin',
    branch: document.getElementById('action-branch').value || '-',
    note: document.getElementById('action-note').value
});

    alert('เรียบร้อย!');
    toggleModal('modal-action', false);
    loadItems();
    loadLogs(document.getElementById('item-grid') ? 5 : 50);
}

// เพิ่มสินค้าใหม่ (แก้เรื่องชื่อไฟล์ภาษาไทยแล้ว)
async function addItem() {
    const name = document.getElementById('add-name').value;
    const qty = document.getElementById('add-qty').value;
    const file = document.getElementById('add-image').files[0];

    if(!name || !qty) return alert('กรอกข้อมูลให้ครบนะ');

    let imageUrl = '';
    if(file) {
        // ตั้งชื่อไฟล์ใหม่เป็นตัวเลข (กัน error ภาษาไทย)
        const fileExt = file.name.split('.').pop();
        const fileName = `item-${Date.now()}.${fileExt}`;
        
        const { error } = await db.storage.from('item-images').upload(fileName, file);
        if(!error) {
            const { data } = db.storage.from('item-images').getPublicUrl(fileName);
            imageUrl = data.publicUrl;
        }
    }

    await db.from('items').insert({
        name: name,
        description: document.getElementById('add-desc').value,
        quantity: qty,
        image_url: imageUrl
    });

    alert('เพิ่มสินค้าแล้ว');
    toggleModal('modal-add', false);
    loadItems();
}

// ลบสินค้า
window.deleteItem = async (id) => {
    if(confirm('ลบจริงหรอ?')) {
        await db.from('items').update({ is_active: false }).eq('id', id);
        loadItems();
    }
}

// เปิดหน้าต่างแก้ไข
window.openEditModal = (id) => {
    const item = allItems.find(x => x.id === id);
    if(!item) return;

    document.getElementById('edit-id').value = item.id;
    document.getElementById('edit-name').value = item.name;
    document.getElementById('edit-desc').value = item.description || '';
    document.getElementById('edit-image').value = ''; 

    toggleModal('modal-edit', true);
}

// บันทึกการแก้ไข (แก้เรื่องชื่อไฟล์ภาษาไทยแล้ว)
window.submitEdit = async () => {
    const id = document.getElementById('edit-id').value;
    const name = document.getElementById('edit-name').value;
    const desc = document.getElementById('edit-desc').value;
    const file = document.getElementById('edit-image').files[0];

    if(!name) return alert('ชื่อห้ามว่างนะครับ');

    let updateData = { name: name, description: desc };

    if (file) {
        // ตั้งชื่อไฟล์ใหม่เป็นตัวเลข (กัน error ภาษาไทย)
        const fileExt = file.name.split('.').pop();
        const fileName = `edit-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await db.storage.from('item-images').upload(fileName, file);
        if (uploadError) return alert('อัปโหลดรูปไม่ผ่าน: ' + uploadError.message);

        const { data } = db.storage.from('item-images').getPublicUrl(fileName);
        updateData.image_url = data.publicUrl;
    }

    const { error } = await db.from('items').update(updateData).eq('id', id);

    if (error) alert('แก้ไม่ได้แฮะ: ' + error.message);
    else {
        alert('แก้ไขเรียบร้อย!');
        toggleModal('modal-edit', false);
        loadItems();
    }
}

// เครื่องมือ เปิด/ปิด หน้าต่าง
window.toggleModal = (id, show) => {
    const el = document.getElementById(id);
    if(show) el.classList.remove('hidden');
    else el.classList.add('hidden');
}

window.exportLogsToCSV = async () => {
    const { data, error } = await db.from('logs').select('*').order('created_at', { ascending: false });
    if (error) return alert('ไม่สามารถดึงข้อมูลเพื่อ Export ได้');

    let csvContent = "\uFEFF"; 
    csvContent += "วันที่,รายการสินค้า,ผู้ทำรายการ,สาขา,หมายเหตุ,จำนวน,ยอดคงเหลือ\n";

    data.forEach(log => {
        const date = new Date(log.created_at).toLocaleDateString('th-TH');
        const isWithdraw = log.action_type === 'WITHDRAW';
        const user = isWithdraw ? log.user_name : 'Admin';
        const branch = isWithdraw ? log.branch : 'เติมสต็อก';
        const amount = (isWithdraw ? '-' : '+') + log.amount;
        const note = (log.note || '-').replace(/,/g, ' '); 
        const balance = log.balance_after !== null ? log.balance_after : '-';

        csvContent += `"${date}","${log.item_name}","${user}","${branch}","${note}","${amount}","${balance}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `stock_history_${new Date().toLocaleDateString('th-TH')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
