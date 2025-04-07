document.addEventListener('DOMContentLoaded', () => {
    console.log('inventory.js loaded');

    const bagSelect = document.getElementById('bag-select');
    const activateBagBtn = document.getElementById('activate-bag-btn');
    const createBagBtn = document.getElementById('create-bag-btn');
    const inventoryTable = document.querySelector('#inventory-table tbody');
    const addItemBtn = document.getElementById('add-item-btn');
    const itemSelect = document.getElementById('item-select');
    const shareBagBtn = document.getElementById('share-bag-btn');
    const transferBagBtn = document.getElementById('transfer-bag-btn');
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role') || 'Player'; // Получаем роль из localStorage

    // Проверка на наличие элементов
    if (!bagSelect) console.error('bag-select not found');
    if (!activateBagBtn) console.error('activate-bag-btn not found');
    if (!createBagBtn) console.error('create-bag-btn not found');

    // Доступные редкости в зависимости от роли
    const rarityOptions = {
        'Player': [
            { value: 'Common', text: 'Common' },
            { value: 'Rare', text: 'Rare' },
            { value: 'Epic', text: 'Epic' }
        ],
        'Moderator': [
            { value: 'Common', text: 'Common' },
            { value: 'Rare', text: 'Rare' },
            { value: 'Epic', text: 'Epic' },
            { value: 'Legendary', text: 'Legendary' }
        ],
        'Admin': [
            { value: 'Common', text: 'Common' },
            { value: 'Rare', text: 'Rare' },
            { value: 'Epic', text: 'Epic' },
            { value: 'Legendary', text: 'Legendary' },
            { value: 'Mythical', text: 'Mythical' }
        ]
    };

    // Заполняем select для редкости
    function loadRarityOptions() {
        const options = rarityOptions[role] || rarityOptions['Player']; // Используем роль из localStorage
        bagRaritySelect.innerHTML = options.map(opt => `<option value="${opt.value}">${opt.text}</option>`).join('');
    }

    // Загрузка сумок
    async function loadBags() {
        const response = await fetch('/api/inventory/bags', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            console.error('Error:', await response.text());
            return;
        }
        const bags = await response.json();
        bagSelect.innerHTML = bags.map(b => `<option value="${b.id}">${b.name} (${b.rarity})</option>`).join('');
    }

    // Загрузка содержимого сумки
    async function loadInventory(bagId) {
        const response = await fetch('/api/inventory/bags', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            console.error('Error:', await response.text());
            return;
        }
        const bags = await response.json();
        const bag = bags.find(b => b.id === bagId);
        inventoryTable.innerHTML = bag.items.map(i => `
            <tr>
                <td>${i.name}</td>
                <td>${i.quantity}</td>
                <td>
                    <button onclick="moveItem(${bagId}, ${i.itemId})">Move</button>
                    <button onclick="removeItem(${bagId}, ${i.itemId})">Remove</button>
                </td>
            </tr>
        `).join('');
    }

    async function loadItems() {
        const response = await fetch('/api/item', { headers: { 'Authorization': `Bearer ${token}` } });
        const items = await response.json();
        itemSelect.innerHTML = items.map(i => `<option value="${i.id}">${i.name}</option>`).join('');
        itemSelect.addEventListener('change', async (e) => {
            const itemId = parseInt(e.target.value);
            const bagId = parseInt(bagSelect.value);
            const response = await fetch('/api/inventory/add', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ inventoryBagId: bagId, itemId })
            });
            if (response.ok) {
                itemSelect.classList.add('hidden');
                loadInventory(bagId);
            }
        }, { once: true });
    }

    async function updateRarityOptions() {
        const response = await fetch('/api/user/role', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            console.error('Failed to get role:', response.status);
            return;
        }
        const { role } = await response.json();
        const options = {
            'Player': ['Common', 'Rare', 'Epic'],
            'Moderator': ['Common', 'Rare', 'Epic', 'Legendary'],
            'Admin': ['Common', 'Rare', 'Epic', 'Legendary', 'Mythical']
        };
        const raritySelect = document.getElementById('bag-rarity');
        raritySelect.innerHTML = options[role].map(r => `<option value="${r}">${r}</option>`).join('');
    }

    // Создание сумки
    createBagBtn.addEventListener('click', async () => {
        const name = document.getElementById('bag-name').value;
        const rarity = document.getElementById('bag-rarity').value;
        if (!name) return alert('Please enter a bag name');
        const response = await fetch('/api/inventory/create', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, rarity })
        });
        if (response.ok) {
            document.getElementById('bag-name').value = '';
            loadBags();
        } else {
            console.error('Create bag failed:', await response.text());
        }
    });

    // Выбор сумки
    //bagSelect.addEventListener('change', (e) => loadInventory(parseInt(e.target.value)));

    // Добавление предмета
    addItemBtn.addEventListener('click', () => {
        itemSelect.classList.toggle('hidden');
        if (!itemSelect.children.length) loadItems();
    });

    // Поделиться сумкой
    shareBagBtn.addEventListener('click', async () => {
        const userId = parseInt(prompt('Enter user ID to share with:'));
        const accessLevel = prompt('Enter access level (ViewOnly, FullEdit):');
        const bagId = parseInt(bagSelect.value);
        const response = await fetch('/api/inventory/share', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ inventoryBagId: bagId, targetUserId: userId, accessLevel })
        });
        if (response.ok) alert('Bag shared!');
    });

    // Обработчик для кнопки Activate
    activateBagBtn.addEventListener('click', () => {
        const bagId = parseInt(bagSelect.value);
        if (!bagId) return alert('Please select a bag');
        loadInventory(bagId);
    });

    // Передать сумку другому пользователю
    transferBagBtn.addEventListener('click', async () => {
        const newOwnerId = parseInt(prompt('Enter new owner ID:'));
        const bagId = parseInt(bagSelect.value);
        const response = await fetch('/api/inventory/transfer', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ inventoryBagId: bagId, newOwnerId })
        });
        if (response.ok) {
            alert('Ownership transferred!');
            loadBags();
        } else {
            alert('Failed to transfer ownership');
        }
    });

    // Перемещение предмета
    window.moveItem = async (bagId, itemId) => {
        const toBagId = parseInt(prompt('Enter target bag ID:'));
        const response = await fetch('/api/inventory/move', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fromBagId: bagId, toBagId, itemId })
        });
        if (response.ok) loadInventory(bagId);
    };

    // Удаление предмета
    window.removeItem = async (bagId, itemId) => {
        const response = await fetch(`/api/inventory/remove/${bagId}/${itemId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) loadInventory(bagId);
    };

    // Загрузка сумок при старте
    loadBags();
    loadRarityOptions();
});