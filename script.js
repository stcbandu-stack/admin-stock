// --- ตั้งค่า Supabase (เอาค่าจากเว็บ Supabase มาใส่ตรงนี้) ---
const SUPABASE_URL = 'https://dcigpisivgpofeljvoph.supabase.co'; // ใส่ URL ของคุณ
const SUPABASE_KEY = 'sb_publishable_ccUnFtL3x-8eV8exjy4oIw__JiDK4VK'; // ใส่ Key (Anon Key) ของคุณ

// เริ่มการทำงาน
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;

// ทำงานทันทีเมื่อเปิดเว็บ
window.onload = async () => {
    checkUser();
    loadItems();
    loadLogs();
};

// --- 1. ฟังก์ชันโหลดข้อมูล ---
async function loadItems() {
    // ดึงข้อมูลสินค้าที่ยังไม่ถูกลบ
    const { data, error } = await db.from('items').select('*').eq('is_active', true).order('id');
    
    if (error) return console.error(error);
    
    const grid = document.getElementById('item-grid');
    grid.innerHTML = ''; // ล้างของเก่า

    data.forEach(item => {
        const isOut = item.quantity <= 0;
        // ปุ่ม Admin (ถ้าล็อกอินจะเห็น)
        const adminBtns = currentUser ? `
            <div class="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                <button onclick="openAction(${item.id}, 'RESTOCK')" class="flex-1 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm">เติม</button>
                <button onclick="openAction(${item.id}, 'WITHDRAW')" class="flex-1 py-1 bg-black text-white hover:bg-gray-800 rounded text-sm">เบิก</button>
            </div>
            <button onclick="deleteItem(${item.id})" class="text-red-500 text-xs mt-2 underline w-full text-center">ลบสินค้า</button>
        ` : '';

        grid.innerHTML += `
            <div class="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition">
                <div class="h-48 bg-gray-100 relative">
                    <img src="${item.image_url || 'https://via.placeholder.com/300'}" class="w-full h-full object-cover ${isOut ? 'grayscale' : ''}">
                    <div class="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded">เหลือ ${item.quantity}</div>
                </div>
                <div class="p-4">
                    <h3 class="font-bold text-lg">${item.name}</h3>
                    <p class="text-gray-500 text-sm">${item.description || '-'}</p>
                    ${adminBtns}
                </div>
            </div>
        `;
    });
}

async function loadLogs() {
    const { data } = await db.from('logs').select('*').order('created_at', { ascending: false }).limit(10);
    const tbody = document.getElementById('log-table-body');
    tbody.innerHTML = '';
    
    data.forEach(log => {
        const isWithdraw = log.action_type === 'WITHDRAW';
        const date = new Date(log.created_at).toLocaleDateString('th-TH');
        tbody.innerHTML += `
            <tr class="border-b hover:bg-gray-50">
                <td class="p-3 text-gray-500">${date}</td>
                <td class="p-3">${log.item_name}</td>
                <td class="p-3">
                    ${isWithdraw ? log.user_name : 'Admin'} 
                    <span class="text-xs text-gray-400">(${isWithdraw ? log.branch : 'เติมสต็อค'})</span>
                </td>
                <td class="p-3 text-right font-bold ${isWithdraw ? 'text-red-600' : 'text-green-600'}">
                    ${isWithdraw ? '-' : '+'}${log.amount}
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
        checkUser(); // อัปเดตหน้าจอ
        loadItems(); // โหลดปุ่มใหม่
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
        adminTool.classList.remove('hidden');
    } else {
        authDiv.innerHTML = `<button onclick="toggleModal('modal-login', true)" class="bg-black text-white px-3 py-1 rounded text-sm">Staff Login</button>`;
        adminTool.classList.add('hidden');
    }
}

async function logout() {
    await db.auth.signOut();
    checkUser();
    loadItems();
}

// เปิดหน้าต่าง เบิก/เติม
window.openAction = (id, type) => {
    document.getElementById('action-item-id').value = id;
    document.getElementById('action-type').value = type;
    document.getElementById('action-title').innerText = type === 'RESTOCK' ? 'เติมสต็อค' : 'เบิกของ';
    
    // ถ้าเบิก ให้โชว์ช่องกรอกชื่อ
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

    // ดึงของเดิมมาก่อน
    const { data: item } = await db.from('items').select('*').eq('id', id).single();
    
    let newQty = item.quantity;
    if (type === 'WITHDRAW') {
        if (item.quantity < amount) return alert('ของไม่พอ!');
        newQty -= amount;
    } else {
        newQty += amount;
    }

    // อัปเดตของ
    await db.from('items').update({ quantity: newQty }).eq('id', id);

    // บันทึกประวัติ
    await db.from('logs').insert({
        item_id: id,
        item_name: item.name,
        action_type: type,
        amount: amount,
        user_name: document.getElementById('action-name').value || 'Admin',
        branch: document.getElementById('action-branch').value || '-',
        note: document.getElementById('action-note').value
    });

    alert('เรียบร้อย!');
    toggleModal('modal-action', false);
    loadItems();
    loadLogs();
}

// เพิ่มสินค้าใหม่
async function addItem() {
    const name = document.getElementById('add-name').value;
    const qty = document.getElementById('add-qty').value;
    const file = document.getElementById('add-image').files[0];

    if(!name || !qty) return alert('กรอกข้อมูลให้ครบนะ');

    let imageUrl = '';
    if(file) {
        const fileName = Date.now() + '-' + file.name;
        // อัปโหลดรูป
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

// เครื่องมือ เปิด/ปิด หน้าต่าง
window.toggleModal = (id, show) => {
    const el = document.getElementById(id);
    if(show) el.classList.remove('hidden');
    else el.classList.add('hidden');
}

// --- ประกาศตัวแปรเก็บข้อมูลสินค้าทั้งหมดไว้ข้างบนสุด (ใต้ let currentUser) ---
let allItems = []; 

async function loadItems() {
    // ดึงข้อมูล
    const { data, error } = await db.from('items').select('*').eq('is_active', true).order('id');
    
    if (error) return console.error(error);
    
    // *** เพิ่มบรรทัดนี้: เก็บข้อมูลลงตัวแปรกลาง เอาไว้ใช้ตอนกดแก้ไข ***
    allItems = data; 
    
    const grid = document.getElementById('item-grid');
    grid.innerHTML = ''; 

    data.forEach(item => {
        const isOut = item.quantity <= 0;
        
        // *** แก้ไขตรง adminBtns: เพิ่มปุ่ม แก้ไข สีเหลือง ***
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
        // ********************************************************

        grid.innerHTML += `
            <div class="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition">
                <div class="h-48 bg-gray-100 relative">
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

// --- ฟังก์ชันสำหรับระบบแก้ไข (เพิ่มใหม่) ---

// 1. เปิดหน้าต่างแก้ไข และดึงข้อมูลเก่ามาใส่ช่อง
function openEditModal(id) {
    // ค้นหาข้อมูลสินค้าจากตัวแปร allItems ที่เราเก็บไว้ตอนโหลด
    const item = allItems.find(x => x.id === id);
    
    if(!item) return;

    // เอาข้อมูลใส่ Input
    document.getElementById('edit-id').value = item.id;
    document.getElementById('edit-name').value = item.name;
    document.getElementById('edit-desc').value = item.description || '';
    document.getElementById('edit-image').value = ''; // รีเซ็ตช่องเลือกไฟล์

    toggleModal('modal-edit', true);
}

// 2. บันทึกการแก้ไขลง Supabase
async function submitEdit() {
    const id = document.getElementById('edit-id').value;
    const name = document.getElementById('edit-name').value;
    const desc = document.getElementById('edit-desc').value;
    const file = document.getElementById('edit-image').files[0];

    if(!name) return alert('ชื่อห้ามว่างนะครับ');

    // เตรียมข้อมูลที่จะอัปเดต
    let updateData = {
        name: name,
        description: desc
    };

    // ถ้ามีการเลือกรูปใหม่ ให้ทำกระบวนการอัปโหลด
    if (file) {
        const fileName = 'edit-' + Date.now() + '-' + file.name;
        const { error: uploadError } = await db.storage.from('item-images').upload(fileName, file);
        
        if (uploadError) {
            return alert('อัปโหลดรูปไม่ผ่าน: ' + uploadError.message);
        }

        const { data } = db.storage.from('item-images').getPublicUrl(fileName);
        updateData.image_url = data.publicUrl; // เพิ่ม URL รูปใหม่เข้าไปในข้อมูลที่จะอัปเดต
    }

    // ส่งคำสั่ง Update ไปที่ Supabase
    const { error } = await db.from('items').update(updateData).eq('id', id);

    if (error) {
        alert('แก้ไม่ได้แฮะ: ' + error.message);
    } else {
        alert('แก้ไขเรียบร้อย!');
        toggleModal('modal-edit', false);
        loadItems(); // โหลดหน้าใหม่
    }
}