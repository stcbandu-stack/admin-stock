const { createApp, ref, reactive, computed, onMounted, watch } = Vue;
const { createClient } = supabase;

// --- Config ---
const SUPABASE_URL = 'https://dcigpisivgpofeljvoph.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_ccUnFtL3x-8eV8exjy4oIw__JiDK4VK'; 
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

createApp({
    setup() {
        // --- State Variables ---
        const currentView = ref('home'); // 'home' | 'history'
        const viewMode = ref('grid');    // 'grid' | 'list'
        const currentUser = ref(null);
        const isVip = ref(false);
        const loadingItems = ref(false);
        const loadingLogs = ref(false);
        
        const items = ref([]);
        const logs = ref([]);
        
        // Modals Control
        const modals = reactive({
            login: false,
            add: false,
            edit: false,
            action: false,
            confirm: false
        });

        // Forms Data
        const forms = reactive({
            login: { email: '', password: '' },
            add: { name: '', desc: '', qty: '', cost: '', file: null },
            edit: { id: null, name: '', desc: '', cost: '', file: null },
            action: { itemId: null, itemName: '', type: '', amount: '', date: '', userName: '', branch: '', actName: '', actLoc: '', actDate: '', note: '' }
        });

        // Filters
        const filters = reactive({
            search: '',
            logMonth: '',
            logBranch: '',
            logItemName: ''
        });

        // Pagination
        const pagination = reactive({
            currentPage: 0,
            pageSize: 25,
            totalCount: 0,
            totalPages: 1
        });

        // Toast & Confirm System
        const toasts = ref([]);
        const confirmMessage = ref('');
        let confirmCallback = null;

        // --- Computed ---
        const filteredItems = computed(() => {
            const term = filters.search.toLowerCase();
            return items.value.filter(i => 
                i.name.toLowerCase().includes(term) || 
                (i.description || '').toLowerCase().includes(term)
            );
        });

        // --- Initialization ---
        onMounted(async () => {
            await checkUser();
            loadItems();
        });

        watch(currentView, (newView) => {
            if (newView === 'home') loadItems();
            if (newView === 'history') loadLogs();
        });

        // --- Methods: Auth ---
        async function checkUser() {
            const { data: { session } } = await db.auth.getSession();
            currentUser.value = session?.user || null;
            if (currentUser.value) {
                const { data } = await db.from('user_permissions').select('can_backdate').eq('email', currentUser.value.email).single();
                isVip.value = !!(data && data.can_backdate);
            } else {
                isVip.value = false;
            }
        }

        async function handleLogin() {
            const { error } = await db.auth.signInWithPassword({ 
                email: forms.login.email, 
                password: forms.login.password 
            });
            if (error) {
                showToast('อีเมลหรือรหัสผ่านไม่ถูกต้อง', 'error');
            } else {
                showToast('ยินดีต้อนรับ Admin', 'success');
                await checkUser();
                modals.login = false;
                forms.login.email = ''; forms.login.password = '';
                loadItems();
            }
        }

        async function logout() {
            await db.auth.signOut();
            currentUser.value = null;
            isVip.value = false;
            showToast('ออกจากระบบแล้ว', 'info');
            loadItems();
        }

        // --- Methods: Items CRUD ---
        async function loadItems() {
            loadingItems.value = true;
            const { data, error } = await db.from('items').select('*').eq('is_active', true).order('quantity', { ascending: false });
            if (!error) items.value = data;
            loadingItems.value = false;
        }

        async function addItem() {
            if (!forms.add.name || !forms.add.qty) return showToast('กรุณากรอกชื่อและจำนวน', 'warning');
            
            let imageUrl = '';
            if (forms.add.file) {
                const fileName = `item-${Date.now()}.${forms.add.file.name.split('.').pop()}`;
                await db.storage.from('item-images').upload(fileName, forms.add.file);
                imageUrl = db.storage.from('item-images').getPublicUrl(fileName).data.publicUrl;
            }

            const { data: newItem, error } = await db.from('items').insert({
                name: forms.add.name,
                description: forms.add.desc,
                quantity: forms.add.qty,
                total_quantity: forms.add.qty,
                image_url: imageUrl,
                cost_per_unit: forms.add.cost || 0
            }).select().single();

            if (error) return showToast('เกิดข้อผิดพลาดในการบันทึก', 'error');

            // Log
            await db.from('logs').insert({
                item_id: newItem.id,
                item_name: newItem.name,
                action_type: 'ADD_NEW',
                amount: parseInt(forms.add.qty),
                balance_after: parseInt(forms.add.qty),
                report_date: new Date().toISOString().split('T')[0],
                user_name: 'Admin',
                branch: '-',
                note: 'เพิ่มของชำร่วยเข้าระบบ',
                cost_per_unit: forms.add.cost || 0
            });

            showToast('เพิ่มสินค้าใหม่สำเร็จ', 'success');
            modals.add = false;
            // Clear Form
            Object.assign(forms.add, { name: '', desc: '', qty: '', cost: '', file: null });
            loadItems();
        }

        function openEditModal(item) {
            forms.edit.id = item.id;
            forms.edit.name = item.name;
            forms.edit.desc = item.description || '';
            forms.edit.cost = item.cost_per_unit || '';
            modals.edit = true;
        }

        async function submitEdit() {
            let updateData = {
                name: forms.edit.name,
                description: forms.edit.desc,
                cost_per_unit: forms.edit.cost || 0
            };

            if (forms.edit.file) {
                const fileName = `edit-${Date.now()}.${forms.edit.file.name.split('.').pop()}`;
                await db.storage.from('item-images').upload(fileName, forms.edit.file);
                updateData.image_url = db.storage.from('item-images').getPublicUrl(fileName).data.publicUrl;
            }

            await db.from('items').update(updateData).eq('id', forms.edit.id);
            showToast('แก้ไขข้อมูลเรียบร้อย', 'success');
            modals.edit = false;
            loadItems();
        }

        function deleteItem(item) {
            confirmMessage.value = `คุณต้องการลบ "${item.name}" ใช่หรือไม่?`;
            confirmCallback = async () => {
                await db.from('logs').insert({
                    item_id: item.id, item_name: item.name, action_type: 'DELETE', amount: 0, balance_after: 0,
                    report_date: new Date().toISOString().split('T')[0], user_name: 'Admin', branch: '-', note: 'Archived', cost_per_unit: item.cost_per_unit || 0
                });
                await db.from('items').update({ is_active: false }).eq('id', item.id);
                showToast(`ลบ "${item.name}" สำเร็จ`, 'success');
                loadItems();
            };
            modals.confirm = true;
        }

        function confirmAction() {
            if (confirmCallback) confirmCallback();
            modals.confirm = false;
        }

        // --- Methods: Transactions (Restock/Withdraw) ---
        function openAction(item, type) {
            forms.action.itemId = item.id;
            forms.action.itemName = item.name;
            forms.action.type = type;
            forms.action.amount = '';
            forms.action.note = '';
            forms.action.date = new Date().toISOString().split('T')[0];
            
            // Clear specific fields
            forms.action.userName = ''; forms.action.branch = ''; forms.action.actName = ''; forms.action.actLoc = ''; forms.action.actDate = '';
            
            modals.action = true;
        }

        async function submitAction() {
            const { itemId, type, amount, date, branch, actName, actLoc, actDate, note, userName } = forms.action;
            
            if (!amount || !date) return showToast('กรุณากรอกข้อมูลวันที่และจำนวน', 'warning');
            
            if (type === 'WITHDRAW') {
                if (!branch || !actName || !actLoc || !actDate) return showToast('กรุณากรอกข้อมูลการเบิกให้ครบถ้วน', 'warning');
                const dReport = new Date(date); const dActivity = new Date(actDate);
                dReport.setHours(0,0,0,0); dActivity.setHours(0,0,0,0);
                if (dReport > dActivity && !isVip.value) return showToast('หากต้องการคีย์ย้อนหลัง โปรดติดต่อผู้ดูแลระบบ', 'error');
            }

            const { data: item } = await db.from('items').select('*').eq('id', itemId).single();
            let newQty = 0; let newTotal = item.total_quantity;

            if (type === 'WITHDRAW') {
                if (item.quantity < amount) return showToast('สต็อกไม่พอเบิก!', 'error');
                newQty = item.quantity - amount;
            } else {
                newQty = item.quantity + amount;
                newTotal = item.total_quantity + amount;
            }

            await db.from('items').update({ quantity: newQty, total_quantity: newTotal }).eq('id', itemId);

            await db.from('logs').insert({
                item_id: itemId, item_name: item.name, action_type: type, amount: amount, balance_after: newQty,
                report_date: date, user_name: userName || 'Admin', branch: type === 'WITHDRAW' ? branch : '-',
                note: note, activity_name: type === 'WITHDRAW' ? actName : null, 
                activity_location: type === 'WITHDRAW' ? actLoc : null, activity_date: type === 'WITHDRAW' ? actDate : null,
                cost_per_unit: item.cost_per_unit || 0
            });

            showToast('บันทึกรายการสำเร็จ', 'success');
            modals.action = false;
            loadItems();
        }

        // --- Methods: Logs & History ---
        async function loadLogs() {
            loadingLogs.value = true;
            let query = db.from('logs').select('*, items(name)', { count: 'exact' });
            
            // Build Query
            const { logMonth, logBranch, logItemName } = filters;
            if (logMonth) {
                const year = new Date().getFullYear();
                query = query.gte('report_date', `${year}-${logMonth}-01`).lte('report_date', `${year}-${logMonth}-31`);
            }
            if (logBranch) query = query.ilike('branch', `%${logBranch}%`);
            // Note: Join filtering on item name is tricky in simple supabase client without embedded resource filtering, 
            // so we filter by log.item_name (snapshot) primarily.
            if (logItemName) query = query.ilike('item_name', `%${logItemName}%`);

            const from = pagination.currentPage * pagination.pageSize;
            const to = from + pagination.pageSize - 1;

            let { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);
            
            if (error) {
                // Fallback if join fails
                let fbQuery = db.from('logs').select('*', { count: 'exact' });
                if (logMonth) { const year = new Date().getFullYear(); fbQuery = fbQuery.gte('report_date', `${year}-${logMonth}-01`).lte('report_date', `${year}-${logMonth}-31`); }
                if (logBranch) fbQuery = fbQuery.ilike('branch', `%${logBranch}%`);
                if (logItemName) fbQuery = fbQuery.ilike('item_name', `%${logItemName}%`);
                const res = await fbQuery.order('created_at', { ascending: false }).range(from, to);
                data = res.data; count = res.count;
            }

            logs.value = data || [];
            pagination.totalCount = count || 0;
            pagination.totalPages = Math.ceil((count || 0) / pagination.pageSize) || 1;
            loadingLogs.value = false;
        }

        function changePage(direction) {
            const newPage = pagination.currentPage + direction;
            if (newPage >= 0 && newPage < pagination.totalPages) {
                pagination.currentPage = newPage;
                loadLogs();
            }
        }
        
        function jumpToPage(val) {
            const pageNum = parseInt(val);
            if (!pageNum || pageNum < 1 || pageNum > pagination.totalPages) return;
            pagination.currentPage = pageNum - 1;
            loadLogs();
        }

        async function exportLogsToCSV() {
            showToast('กำลังประมวลผลข้อมูล...', 'info');
            
            // 1. ลองดึงแบบ JOIN (พยายามเอาชื่อปัจจุบันมาด้วย)
            let query = db.from('logs').select('*, items(name)');
            
            // ดึงค่า Filter จาก State
            const { logMonth, logBranch, logItemName } = filters;

            // ฟังก์ชันช่วยใส่ Filter (จะได้ไม่ต้องเขียนซ้ำ)
            const applyFilters = (q) => {
                if (logMonth) { 
                    const year = new Date().getFullYear(); 
                    q = q.gte('report_date', `${year}-${logMonth}-01`).lte('report_date', `${year}-${logMonth}-31`); 
                }
                if (logBranch) q = q.ilike('branch', `%${logBranch}%`);
                if (logItemName) q = q.ilike('item_name', `%${logItemName}%`);
                return q;
            };

            // ใส่ Filter ให้ Query แรก
            query = applyFilters(query);
            
            // ดึงข้อมูล พร้อมรับค่า Error
            let { data, error } = await query.order('created_at', { ascending: false });
            
            // 2. 🔥 FALLBACK: ถ้า Error (Database เชื่อมไม่ติด) ให้ดึงแบบธรรมดา
            if (error) {
                console.warn('Export Join failed, using fallback.', error);
                let fbQuery = db.from('logs').select('*');
                fbQuery = applyFilters(fbQuery); // ใส่ Filter ให้ Query สำรอง
                const res = await fbQuery.order('created_at', { ascending: false });
                data = res.data;
            }
            
            if (!data || data.length === 0) return showToast('ไม่พบข้อมูลที่จะ Export', 'warning');

            // 3. สร้าง CSV
            let csvContent = "\uFEFFวันที่ทำรายการ,รายการสินค้า,ประเภทรายการ,ผู้ทำรายการ,สาขา,ชื่อกิจกรรม,สถานที่,วันที่จัดกิจกรรม,หมายเหตุ,จำนวน,ยอดคงเหลือ,ต้นทุนต่อชิ้น,มูลค่ารวม\n";
            
            data.forEach(log => {
                const date = log.report_date ? new Date(log.report_date).toLocaleDateString('th-TH') : '-';
                
                // Logic เลือกชื่อสินค้า (ถ้ามี items.name ให้ใช้ ถ้าไม่มีใช้ของเดิม)
                const itemName = log.items ? log.items.name : log.item_name;
                
                let typeThai = '';
                switch(log.action_type) {
                    case 'WITHDRAW': typeThai = 'เบิกออก'; break;
                    case 'RESTOCK': typeThai = 'เติมสต็อก'; break;
                    case 'ADD_NEW': typeThai = 'เพิ่มของใหม่'; break;
                    case 'DELETE': typeThai = 'ลบสินค้า'; break;
                    default: typeThai = 'ทั่วไป';
                }

                const amount = (log.action_type === 'WITHDRAW' ? '-' : '+') + log.amount;
                const totalVal = (log.cost_per_unit || 0) * log.amount;
                
                // Escape ฟันหนู " ในข้อความเพื่อไม่ให้ CSV พัง
                const cleanNote = (log.note || '-').replace(/"/g, '""'); 
                
                csvContent += `"${date}","${itemName}","${typeThai}","${log.user_name || '-'}","${log.branch || '-'}","${log.activity_name || '-'}","${log.activity_location || '-'}","${log.activity_date || '-'}","${cleanNote}","${amount}","${log.balance_after}","${log.cost_per_unit || 0}","${totalVal}"\n`;
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `StockReport_${new Date().toISOString().slice(0,10)}.csv`;
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
            showToast(`ดาวน์โหลดเรียบร้อย (${data.length} รายการ)`, 'success');
        }

        // --- Helpers ---
        function showToast(message, type = 'success') {
            const colors = { 'success': 'bg-green-600', 'error': 'bg-red-600', 'warning': 'bg-yellow-500', 'info': 'bg-blue-600' };
            const icons = { 'success': 'fa-circle-check', 'error': 'fa-circle-xmark', 'warning': 'fa-triangle-exclamation', 'info': 'fa-circle-info' };
            const id = Date.now();
            toasts.value.push({ id, message, bgClass: colors[type], icon: icons[type] });
            setTimeout(() => {
                toasts.value = toasts.value.filter(t => t.id !== id);
            }, 3000);
        }

        function formatDate(dateStr) {
            if (!dateStr) return '-';
            return new Date(dateStr).toLocaleDateString('th-TH');
        }

        function getLogBadge(type) {
            switch(type) {
                case 'WITHDRAW': return `<span class="bg-red-100 text-red-700 px-2 py-1 rounded-md text-xs font-bold border border-red-200"><i class="fa-solid fa-minus"></i> เบิกออก</span>`;
                case 'RESTOCK': return `<span class="bg-green-100 text-green-700 px-2 py-1 rounded-md text-xs font-bold border border-green-200"><i class="fa-solid fa-plus"></i> เติมสต็อก</span>`;
                case 'ADD_NEW': return `<span class="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs font-bold border border-blue-200"><i class="fa-solid fa-star"></i> เพิ่มของใหม่</span>`;
                case 'DELETE': return `<span class="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs font-bold border border-gray-200"><i class="fa-solid fa-trash"></i> ลบสินค้า</span>`;
                default: return `<span class="bg-gray-100 text-gray-500 px-2 py-1 rounded text-xs">ทั่วไป</span>`;
            }
        }
        
        function getAmountClass(type) {
            return type === 'WITHDRAW' ? 'text-red-600' : (type === 'DELETE' ? 'text-gray-400' : 'text-green-600');
        }
        
        function getAmountPrefix(type) {
            return type === 'WITHDRAW' ? '-' : (type === 'DELETE' ? '' : '+');
        }

        return {
            currentView, viewMode, currentUser, items, logs,
            modals, forms, filters, pagination,
            loadingItems, loadingLogs, toasts, confirmMessage,
            filteredItems,
            loadItems, loadLogs, addItem, submitEdit, deleteItem,
            openAction, openEditModal, submitAction, confirmAction,
            handleLogin, logout,
            changePage, jumpToPage, exportLogsToCSV,
            formatDate, getLogBadge, getAmountClass, getAmountPrefix
        };
    }
}).mount('#app');