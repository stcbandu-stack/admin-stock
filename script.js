const { createApp, ref, reactive, computed, onMounted, watch } = Vue;
const { createClient } = supabase;

// --- Config ---
const SUPABASE_URL = 'https://dcigpisivgpofeljvoph.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_ccUnFtL3x-8eV8exjy4oIw__JiDK4VK'; 
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

createApp({
    setup() {
        // --- State Variables ---
        const currentView = ref('home'); 
        const viewMode = ref('grid');    
        const currentUser = ref(null);
        const isVip = ref(false);
        const loadingItems = ref(false);
        const loadingLogs = ref(false);
        const isProcessing = ref(false); // Lock state
        
        const items = ref([]);
        const logs = ref([]);
        
        const modals = reactive({
            login: false, add: false, edit: false, action: false, confirm: false
        });

        const forms = reactive({
            login: { email: '', password: '' },
            add: { name: '', desc: '', qty: '', cost: '', file: null },
            edit: { id: null, name: '', desc: '', cost: '', file: null },
            action: { itemId: null, itemName: '', type: '', amount: '', date: '', userName: '', branch: '', actName: '', actLoc: '', actDate: '', note: '' }
        });

        const filters = reactive({
            search: '', logMonth: '', logBranch: '', logItemName: ''
        });

        const pagination = reactive({
            currentPage: 0, pageSize: 25, totalCount: 0, totalPages: 1
        });

        const toasts = ref([]);
        const confirmMessage = ref('');
        let confirmCallback = null;

        const filteredItems = computed(() => {
            const term = filters.search.toLowerCase();
            return items.value.filter(i => 
                i.name.toLowerCase().includes(term) || 
                (i.description || '').toLowerCase().includes(term)
            );
        });

        onMounted(async () => {
            await checkUser();
            loadItems();
        });

        watch(currentView, (newView) => {
            if (newView === 'home') loadItems();
            if (newView === 'history') loadLogs();
        });

        // --- Methods ---
        async function checkUser() {
            const { data: { session } } = await db.auth.getSession();
            currentUser.value = session?.user || null;
            if (currentUser.value) {
                const { data } = await db.from('user_permissions').select('can_backdate').eq('email', currentUser.value.email).single();
                isVip.value = !!(data && data.can_backdate);
            } else isVip.value = false;
        }

        async function handleLogin() {
            if (isProcessing.value) return;
            isProcessing.value = true;
            try {
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
            } finally { isProcessing.value = false; }
        }

        async function logout() {
            await db.auth.signOut();
            currentUser.value = null; isVip.value = false;
            showToast('ออกจากระบบแล้ว', 'info');
            loadItems();
        }

        async function loadItems() {
            loadingItems.value = true;
            const { data, error } = await db.from('items').select('*').eq('is_active', true).order('quantity', { ascending: false });
            if (!error) items.value = data || [];
            loadingItems.value = false;
        }

        async function addItem() {
            if (isProcessing.value) return; 
            if (!forms.add.name || !forms.add.qty) return showToast('กรุณากรอกชื่อและจำนวน', 'warning');
            isProcessing.value = true;
            try {
                let imageUrl = '';
                if (forms.add.file) {
                    const fileName = `item-${Date.now()}.${forms.add.file.name.split('.').pop()}`;
                    await db.storage.from('item-images').upload(fileName, forms.add.file);
                    imageUrl = db.storage.from('item-images').getPublicUrl(fileName).data.publicUrl;
                }
                const { data: newItem, error } = await db.from('items').insert({
                    name: forms.add.name, description: forms.add.desc, quantity: forms.add.qty, total_quantity: forms.add.qty,
                    image_url: imageUrl, cost_per_unit: forms.add.cost || 0
                }).select().single();
                if (error) throw error;
                await db.from('logs').insert({
                    item_id: newItem.id, item_name: newItem.name, action_type: 'ADD_NEW', amount: parseInt(forms.add.qty), balance_after: parseInt(forms.add.qty),
                    report_date: new Date().toISOString().split('T')[0], user_name: 'Admin', branch: '-', note: 'เพิ่มของชำร่วยเข้าระบบ', cost_per_unit: forms.add.cost || 0
                });
                showToast('เพิ่มสินค้าใหม่สำเร็จ', 'success');
                modals.add = false;
                Object.assign(forms.add, { name: '', desc: '', qty: '', cost: '', file: null });
                loadItems();
            } catch (error) {
                showToast('เกิดข้อผิดพลาดในการบันทึก', 'error');
                console.error(error);
            } finally { isProcessing.value = false; }
        }

        function openEditModal(item) {
            forms.edit.id = item.id;
            forms.edit.name = item.name;
            forms.edit.desc = item.description || '';
            forms.edit.cost = item.cost_per_unit || '';
            modals.edit = true;
        }

        async function submitEdit() {
            if (isProcessing.value) return;
            isProcessing.value = true;
            try {
                let updateData = { name: forms.edit.name, description: forms.edit.desc, cost_per_unit: forms.edit.cost || 0 };
                if (forms.edit.file) {
                    const fileName = `edit-${Date.now()}.${forms.edit.file.name.split('.').pop()}`;
                    await db.storage.from('item-images').upload(fileName, forms.edit.file);
                    updateData.image_url = db.storage.from('item-images').getPublicUrl(fileName).data.publicUrl;
                }
                await db.from('items').update(updateData).eq('id', forms.edit.id);
                showToast('แก้ไขข้อมูลเรียบร้อย', 'success');
                modals.edit = false;
                loadItems();
            } catch (error) {
                showToast('แก้ไขไม่สำเร็จ', 'error');
            } finally { isProcessing.value = false; }
        }

        function deleteItem(item) {
            confirmMessage.value = `คุณต้องการลบ "${item.name}" ใช่หรือไม่?`;
            confirmCallback = async () => {
                if (isProcessing.value) return;
                isProcessing.value = true;
                try {
                    await db.from('logs').insert({
                        item_id: item.id, item_name: item.name, action_type: 'DELETE', amount: 0, balance_after: 0,
                        report_date: new Date().toISOString().split('T')[0], user_name: 'Admin', branch: '-', note: 'Archived', cost_per_unit: item.cost_per_unit || 0
                    });
                    await db.from('items').update({ is_active: false }).eq('id', item.id);
                    showToast(`ลบ "${item.name}" สำเร็จ`, 'success');
                    loadItems();
                    modals.confirm = false;
                } catch(err) {
                    showToast('ลบไม่สำเร็จ', 'error');
                } finally { isProcessing.value = false; }
            };
            modals.confirm = true;
        }

        function confirmAction() {
            if (confirmCallback) confirmCallback();
        }

        function openAction(item, type) {
            forms.action.itemId = item.id;
            forms.action.itemName = item.name;
            forms.action.type = type;
            forms.action.amount = ''; forms.action.note = ''; forms.action.date = new Date().toISOString().split('T')[0];
            forms.action.userName = ''; forms.action.branch = ''; forms.action.actName = ''; forms.action.actLoc = ''; forms.action.actDate = '';
            modals.action = true;
        }

        async function submitAction() {
            if (isProcessing.value) return;
            const { itemId, type, amount, date, branch, actName, actLoc, actDate, note, userName } = forms.action;
            if (!amount || !date) return showToast('กรุณากรอกข้อมูลวันที่และจำนวน', 'warning');
            if (type === 'WITHDRAW') {
                if (!branch || !actName || !actLoc || !actDate) return showToast('กรุณากรอกข้อมูลการเบิกให้ครบถ้วน', 'warning');
                const dReport = new Date(date); const dActivity = new Date(actDate); dReport.setHours(0,0,0,0); dActivity.setHours(0,0,0,0);
                if (dReport > dActivity && !isVip.value) return showToast('หากต้องการคีย์ย้อนหลัง โปรดติดต่อผู้ดูแลระบบ', 'error');
            }
            isProcessing.value = true;
            try {
                const { data: item } = await db.from('items').select('*').eq('id', itemId).single();
                let newQty = 0; let newTotal = item.total_quantity;
                if (type === 'WITHDRAW') {
                    if (item.quantity < amount) throw new Error('สต็อกไม่พอเบิก!');
                    newQty = item.quantity - amount;
                } else {
                    newQty = item.quantity + amount;
                    newTotal = item.total_quantity + amount;
                }
                await db.from('items').update({ quantity: newQty, total_quantity: newTotal }).eq('id', itemId);
                await db.from('logs').insert({
                    item_id: itemId, item_name: item.name, action_type: type, amount: amount, balance_after: newQty,
                    report_date: date, user_name: userName || 'Admin', branch: type === 'WITHDRAW' ? branch : '-',
                    note: note, activity_name: type === 'WITHDRAW' ? actName : null, activity_location: type === 'WITHDRAW' ? actLoc : null, activity_date: type === 'WITHDRAW' ? actDate : null,
                    cost_per_unit: item.cost_per_unit || 0
                });
                showToast('บันทึกรายการสำเร็จ', 'success');
                modals.action = false;
                loadItems();
            } catch (err) {
                showToast(err.message || 'บันทึกไม่สำเร็จ', 'error');
            } finally { isProcessing.value = false; }
        }

        async function loadLogs() {
            loadingLogs.value = true;
            let query = db.from('logs').select('*, items(name)', { count: 'exact' });
            const { logMonth, logBranch, logItemName } = filters;
            
            const applyFilters = (q) => {
                if (logMonth) { const year = new Date().getFullYear(); q = q.gte('report_date', `${year}-${logMonth}-01`).lte('report_date', `${year}-${logMonth}-31`); }
                if (logBranch) q = q.ilike('branch', `%${logBranch}%`);
                if (logItemName) q = q.ilike('item_name', `%${logItemName}%`);
                return q;
            };

            query = applyFilters(query);
            const from = pagination.currentPage * pagination.pageSize;
            const to = from + pagination.pageSize - 1;

            let { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);
            
            if (error) {
                let fbQuery = db.from('logs').select('*', { count: 'exact' });
                fbQuery = applyFilters(fbQuery);
                const res = await fbQuery.order('created_at', { ascending: false }).range(from, to);
                data = res.data; count = res.count;
            }

            logs.value = data || [];
            pagination.totalCount = count || 0;
            pagination.totalPages = Math.ceil((count || 0) / pagination.pageSize) || 1;
            loadingLogs.value = false;
        }

        async function exportLogsToCSV() {
            showToast('กำลังประมวลผลข้อมูล...', 'info');
            let query = db.from('logs').select('*, items(name)');
            const { logMonth, logBranch, logItemName } = filters;
            const applyFilters = (q) => {
                if (logMonth) { const year = new Date().getFullYear(); q = q.gte('report_date', `${year}-${logMonth}-01`).lte('report_date', `${year}-${logMonth}-31`); }
                if (logBranch) q = q.ilike('branch', `%${logBranch}%`);
                if (logItemName) q = q.ilike('item_name', `%${logItemName}%`);
                return q;
            };
            query = applyFilters(query);
            let { data, error } = await query.order('created_at', { ascending: false });
            if (error) {
                let fbQuery = db.from('logs').select('*');
                fbQuery = applyFilters(fbQuery);
                const res = await fbQuery.order('created_at', { ascending: false });
                data = res.data;
            }
            if (!data || data.length === 0) return showToast('ไม่พบข้อมูลที่จะ Export', 'warning');
            let csvContent = "\uFEFFวันที่ทำรายการ,รายการสินค้า,ประเภทรายการ,ผู้ทำรายการ,สาขา,ชื่อกิจกรรม,สถานที่,วันที่จัดกิจกรรม,หมายเหตุ,จำนวน,ยอดคงเหลือ,ต้นทุนต่อชิ้น,มูลค่ารวม\n";
            data.forEach(log => {
                const date = log.report_date ? new Date(log.report_date).toLocaleDateString('th-TH') : '-';
                const itemName = log.items ? log.items.name : log.item_name;
                let typeThai = '';
                switch(log.action_type) { case 'WITHDRAW': typeThai = 'เบิกออก'; break; case 'RESTOCK': typeThai = 'เติมสต็อก'; break; case 'ADD_NEW': typeThai = 'เพิ่มของใหม่'; break; case 'DELETE': typeThai = 'ลบสินค้า'; break; default: typeThai = 'ทั่วไป'; }
                const amount = (log.action_type === 'WITHDRAW' ? '-' : '+') + log.amount;
                const totalVal = (log.cost_per_unit || 0) * log.amount;
                const cleanNote = (log.note || '-').replace(/"/g, '""'); 
                csvContent += `"${date}","${itemName}","${typeThai}","${log.user_name || '-'}","${log.branch || '-'}","${log.activity_name || '-'}","${log.activity_location || '-'}","${log.activity_date || '-'}","${cleanNote}","${amount}","${log.balance_after}","${log.cost_per_unit || 0}","${totalVal}"\n`;
            });
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url; link.download = `StockReport_${new Date().toISOString().slice(0,10)}.csv`;
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
            showToast(`ดาวน์โหลดเรียบร้อย (${data.length} รายการ)`, 'success');
        }

        function showToast(message, type = 'success') {
            const colors = { 'success': 'bg-green-600', 'error': 'bg-red-600', 'warning': 'bg-yellow-500', 'info': 'bg-blue-600' };
            const icons = { 'success': 'fa-circle-check', 'error': 'fa-circle-xmark', 'warning': 'fa-triangle-exclamation', 'info': 'fa-circle-info' };
            const id = Date.now();
            toasts.value.push({ id, message, bgClass: colors[type], icon: icons[type] });
            setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id); }, 3000);
        }

        function formatDate(dateStr) { return !dateStr ? '-' : new Date(dateStr).toLocaleDateString('th-TH'); }
        function getLogBadge(type) { 
            switch(type) { 
                case 'WITHDRAW': return `<span class="bg-red-100 text-red-700 px-2 py-1 rounded-md text-xs font-bold border border-red-200"><i class="fa-solid fa-minus"></i> เบิกออก</span>`; 
                case 'RESTOCK': return `<span class="bg-green-100 text-green-700 px-2 py-1 rounded-md text-xs font-bold border border-green-200"><i class="fa-solid fa-plus"></i> เติมสต็อก</span>`; 
                case 'ADD_NEW': return `<span class="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs font-bold border border-blue-200"><i class="fa-solid fa-star"></i> เพิ่มของใหม่</span>`; 
                case 'DELETE': return `<span class="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs font-bold border border-gray-200"><i class="fa-solid fa-trash"></i> ลบสินค้า</span>`; 
                default: return `<span class="bg-gray-100 text-gray-500 px-2 py-1 rounded text-xs">ทั่วไป</span>`; 
            } 
        }
        function getAmountClass(type) { return type === 'WITHDRAW' ? 'text-red-600' : (type === 'DELETE' ? 'text-gray-400' : 'text-green-600'); }
        function getAmountPrefix(type) { return type === 'WITHDRAW' ? '-' : (type === 'DELETE' ? '' : '+'); }
        function changePage(dir) { 
            const newPage = pagination.currentPage + dir; 
            if (newPage >= 0 && newPage < pagination.totalPages) { pagination.currentPage = newPage; loadLogs(); } 
        }
        function jumpToPage(val) {
            const page = parseInt(val) - 1;
            if (page >= 0 && page < pagination.totalPages) { pagination.currentPage = page; loadLogs(); }
        }

        return {
            currentView, viewMode, currentUser, items, logs,
            modals, forms, filters, pagination,
            loadingItems, loadingLogs, toasts, confirmMessage,
            filteredItems, isProcessing,
            loadItems, loadLogs, addItem, submitEdit, deleteItem,
            openAction, openEditModal, submitAction, confirmAction,
            handleLogin, logout, changePage, jumpToPage, exportLogsToCSV,
            formatDate, getLogBadge, getAmountClass, getAmountPrefix
        };
    }
}).mount('#app');