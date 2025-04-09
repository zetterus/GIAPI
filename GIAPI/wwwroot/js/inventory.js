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
    const bagRaritySelect = document.getElementById('bag-rarity');
    const activeBagDisplay = document.getElementById('active-bag');
    const inventoryTableTitle = document.getElementById('inventory-table-title');
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role') || 'Player';

    const rarityOptions = {
        'Player': [
            { value: 'Common', text: 'Common' },
            { value: 'Rare', text: 'Rare' }
        ],
        'Moderator': [
            { value: 'Common', text: 'Common' },
            { value: 'Rare', text: 'Rare' },
            { value: 'Epic', text: 'Epic' }
        ],
        'Admin': [
            { value: 'Common', text: 'Common' },
            { value: 'Rare', text: 'Rare' },
            { value: 'Epic', text: 'Epic' },
            { value: 'Legendary', text: 'Legendary' },
            { value: 'Mythical', text: 'Mythical' }
        ]
    };

    function loadRarityOptions() {
        const options = rarityOptions[role] || rarityOptions['Player'];
        bagRaritySelect.innerHTML = options.map(opt => `<option value="${opt.value}">${opt.text}</option>`).join('');
    }

    async function loadBags() {
        if (!token) {
            bagSelect.innerHTML = '<option value="">Please log in</option>';
            return;
        }
        const response = await fetch('/api/inventory/bags', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) {
            bagSelect.innerHTML = '<option value="">Error loading bags</option>';
            return;
        }
        const bags = await response.json();
        bagSelect.innerHTML = bags.length > 0
            ? bags.map(b => `<option value="${b.id}">${b.name} (${b.rarity})</option>`).join('')
            : '<option value="">No bags available</option>';
    }

    async function loadInventory(bagId) {
        const response = await fetch('/api/inventory/bags', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) return;
        const bags = await response.json();
        const bag = bags.find(b => b.id === bagId);
        if (bag) {
            inventoryTable.innerHTML = bag.items.map(i => `
                <tr>
                    <td>${i.name}</td>
                    <td>${i.quantity}</td>
                    <td>
                        <input type="number" min="1" max="${i.quantity}" value="1" id="qty-${i.itemId}">
                        <input type="text" placeholder="Search bag..." id="search-${i.itemId}">
                        <div class="suggestions" id="suggestions-${i.itemId}"></div>
                        <button onclick="moveItem(${bagId}, ${i.itemId})">Move</button>
                        <button onclick="removeItem(${bagId}, ${i.itemId})">Remove</button>
                    </td>
                </tr>
            `).join('');
            activeBagDisplay.textContent = `[Active Bag: ${bag.name}]`;
            inventoryTableTitle.textContent = `Items in ${bag.name}`;

            bag.items.forEach(i => {
                const searchInput = document.getElementById(`search-${i.itemId}`);
                const suggestionsDiv = document.getElementById(`suggestions-${i.itemId}`);
                searchInput.addEventListener('input', async () => {
                    const query = searchInput.value.trim();
                    if (query.length < 1) {
                        suggestionsDiv.style.display = 'none';
                        return;
                    }
                    const response = await fetch(`/api/inventory/search-bags?query=${encodeURIComponent(query)}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!response.ok) return;
                    const suggestions = await response.json();
                    suggestionsDiv.innerHTML = suggestions.map(b => `
                        <div class="suggestion-item" data-bag-id="${b.id}">[${b.name}] (${b.ownerUsername})</div>
                    `).join('');
                    suggestionsDiv.style.display = 'block';
                    suggestionsDiv.querySelectorAll('.suggestion-item').forEach(item => {
                        item.addEventListener('click', () => {
                            searchInput.value = item.textContent;
                            searchInput.dataset.toBagId = item.dataset.bagId;
                            suggestionsDiv.style.display = 'none';
                        });
                    });
                });
                document.addEventListener('click', (e) => {
                    if (!suggestionsDiv.contains(e.target) && e.target !== searchInput) {
                        suggestionsDiv.style.display = 'none';
                    }
                });
            });
        } else {
            inventoryTable.innerHTML = '<tr><td colspan="3">Bag not found</td></tr>';
            activeBagDisplay.textContent = 'No bag active';
            inventoryTableTitle.textContent = 'Items in Selected Bag';
        }
    }

    async function loadItems() {
        const response = await fetch('/api/item', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) return;
        const items = await response.json();
        itemSelect.innerHTML = items.map(i => `<option value="${i.id}">${i.name}</option>`).join('');
        itemSelect.addEventListener('change', async (e) => {
            const itemId = parseInt(e.target.value);
            const bagId = parseInt(bagSelect.value);
            const response = await fetch('/api/inventory/add', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ inventoryBagId: bagId, itemId })
            });
            if (response.ok) {
                itemSelect.classList.add('hidden');
                loadInventory(bagId);
            }
        }, { once: true });
    }

    createBagBtn.addEventListener('click', async () => {
        const name = document.getElementById('bag-name').value;
        const rarity = bagRaritySelect.value;
        if (!name) return alert('Please enter a bag name');
        const response = await fetch('/api/inventory/create', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, rarity })
        });
        if (response.ok) {
            document.getElementById('bag-name').value = '';
            loadBags();
        }
    });

    activateBagBtn.addEventListener('click', () => {
        const bagId = parseInt(bagSelect.value);
        if (!bagId) return alert('Please select a bag');
        loadInventory(bagId);
    });

    addItemBtn.addEventListener('click', () => {
        itemSelect.classList.toggle('hidden');
        if (!itemSelect.children.length) loadItems();
    });

    shareBagBtn.addEventListener('click', async () => {
        const userId = parseInt(prompt('Enter user ID to share with:'));
        const accessLevel = prompt('Enter access level (ViewOnly, FullEdit):');
        const bagId = parseInt(bagSelect.value);
        if (!bagId) return alert('Please select a bag');
        const response = await fetch('/api/inventory/share', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ inventoryBagId: bagId, targetUserId: userId, accessLevel })
        });
        if (response.ok) alert('Bag shared!');
    });

    transferBagBtn.addEventListener('click', async () => {
        const newOwnerId = parseInt(prompt('Enter new owner ID:'));
        const bagId = parseInt(bagSelect.value);
        if (!bagId) return alert('Please select a bag');
        const response = await fetch('/api/inventory/transfer', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ inventoryBagId: bagId, newOwnerId })
        });
        if (response.ok) {
            alert('Ownership transferred!');
            loadBags();
        }
    });

    window.moveItem = async (bagId, itemId) => {
        const qtyInput = document.getElementById(`qty-${itemId}`);
        const searchInput = document.getElementById(`search-${itemId}`);
        const quantity = parseInt(qtyInput.value);
        const toBagId = parseInt(searchInput.dataset.toBagId);
        if (!toBagId || isNaN(toBagId)) return alert('Please select a valid bag');
        if (quantity <= 0 || isNaN(quantity)) return alert('Please enter a valid quantity');
        const response = await fetch('/api/inventory/move', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ fromBagId: bagId, toBagId, itemId, quantity })
        });
        if (response.ok) loadInventory(bagId);
    };

    window.removeItem = async (bagId, itemId) => {
        const qtyInput = document.getElementById(`qty-${itemId}`);
        const quantity = parseInt(qtyInput.value);
        if (quantity <= 0 || isNaN(quantity)) return alert('Please enter a valid quantity');
        const response = await fetch(`/api/inventory/remove/${bagId}/${itemId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity })
        });
        if (response.ok) loadInventory(bagId);
    };

    loadRarityOptions();
    loadBags();
});