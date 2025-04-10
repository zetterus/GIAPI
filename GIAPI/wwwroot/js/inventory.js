document.addEventListener('DOMContentLoaded', () => {
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
    const shareUserSearch = document.getElementById('share-user-search');
    const shareUserSuggestions = document.getElementById('share-user-suggestions');
    const shareAccessLevelSelect = document.getElementById('share-access-level');
    const transferUserSearch = document.getElementById('transfer-user-search');
    const transferUserSuggestions = document.getElementById('transfer-user-suggestions');
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role') || 'Player';

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
                        <input type="text" placeholder="Search all bags..." id="search-${i.itemId}">
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
                    const response = await fetch(`/api/inventory/search-all-bags?query=${encodeURIComponent(query)}`, {
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
                            searchInput.value = `[${item.textContent}]`;
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

    async function searchUsers(query, suggestionsDiv, input) {
        if (query.length < 1) {
            suggestionsDiv.style.display = 'none';
            return;
        }
        try {
            const response = await fetch(`/api/user/search?query=${encodeURIComponent(query)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                console.error(`Server error: ${response.status} ${response.statusText}`);
                const text = await response.text();
                console.error('Response body:', text);
                suggestionsDiv.innerHTML = '<div class="suggestion-item">Error loading users</div>';
                suggestionsDiv.style.display = 'block';
                return;
            }
            const users = await response.json();
            if (!Array.isArray(users)) {
                console.error('Expected array, got:', users);
                return;
            }
            suggestionsDiv.innerHTML = users.map(u => `
            <div class="suggestion-item" data-user-id="${u.id}">${u.username}</div>
        `).join('');
            suggestionsDiv.style.display = 'block';
            suggestionsDiv.querySelectorAll('.suggestion-item').forEach(item => {
                item.addEventListener('click', () => {
                    input.value = item.textContent;
                    input.dataset.userId = item.dataset.userId;
                    suggestionsDiv.style.display = 'none';
                });
            });
        } catch (error) {
            console.error('Fetch error:', error);
            suggestionsDiv.innerHTML = '<div class="suggestion-item">Network error</div>';
            suggestionsDiv.style.display = 'block';
        }
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
        const userId = parseInt(shareUserSearch.dataset.userId);
        const accessLevel = shareAccessLevelSelect.value;
        const bagId = parseInt(bagSelect.value);
        if (!bagId) return alert('Please select a bag');
        if (!userId || isNaN(userId)) return alert('Please select a valid user');
        if (!accessLevel) return alert('Please select an access level');
        const response = await fetch('/api/inventory/share', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ inventoryBagId: bagId, targetUserId: userId, accessLevel })
        });
        if (response.ok) {
            alert('Bag shared!');
            shareUserSearch.value = '';
            delete shareUserSearch.dataset.userId;
        }
    });

    transferBagBtn.addEventListener('click', async () => {
        const newOwnerId = parseInt(transferUserSearch.dataset.userId);
        const bagId = parseInt(bagSelect.value);
        if (!bagId) return alert('Please select a bag');
        if (!newOwnerId || isNaN(newOwnerId)) return alert('Please select a valid user');
        const response = await fetch('/api/inventory/transfer', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ inventoryBagId: bagId, newOwnerId })
        });
        if (response.ok) {
            alert('Ownership transferred!');
            transferUserSearch.value = '';
            delete transferUserSearch.dataset.userId;
            loadBags();
        }
    });

    shareUserSearch.addEventListener('input', () => searchUsers(shareUserSearch.value.trim(), shareUserSuggestions, shareUserSearch));
    transferUserSearch.addEventListener('input', () => searchUsers(transferUserSearch.value.trim(), transferUserSuggestions, transferUserSearch));

    document.addEventListener('click', (e) => {
        if (!shareUserSuggestions.contains(e.target) && e.target !== shareUserSearch) {
            shareUserSuggestions.style.display = 'none';
        }
        if (!transferUserSuggestions.contains(e.target) && e.target !== transferUserSearch) {
            transferUserSuggestions.style.display = 'none';
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