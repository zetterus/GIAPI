document.addEventListener('DOMContentLoaded', () => {
    const bagSelect = document.getElementById('bag-select');
    const activateBagBtn = document.getElementById('activate-bag-btn');
    const createBagBtn = document.getElementById('create-bag-btn');
    const inventoryTable = document.querySelector('#inventory-table tbody');
    const addItemBtn = document.getElementById('add-item-btn');
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
    const addItemQuantity = document.getElementById('add-item-quantity');
    const addItemSearch = document.getElementById('add-item-search');
    const addItemSuggestions = document.getElementById('add-item-suggestions');
    let token = localStorage.getItem('token');
    let role = localStorage.getItem('role') || 'Player';

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

    const rarityMap = {
        0: 'Common',
        1: 'Rare',
        2: 'Epic',
        3: 'Legendary',
        4: 'Mythical'
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
            ? bags.map(b => `<option value="${b.id}">${b.name} (${rarityMap[b.rarity] || 'Unknown'})</option>`).join('')
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
            const accessLevel = bag.isOwner ? 'Owner' : (bag.accessLevel || 'ViewOnly');
            activeBagDisplay.textContent = `[Active Bag: ${bag.name}; Access Level: ${accessLevel}]`;
            inventoryTableTitle.textContent = `Items in ${bag.name} (${accessLevel})`;

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

    async function loadItems(query = '') {
        try {
            const response = await fetch(`/api/item${query ? `?query=${encodeURIComponent(query)}` : ''}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                console.error(`Server returned ${response.status}: ${await response.text()}`);
                return [];
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Fetch error:', error);
            return [];
        }
    }

    async function searchItems(query, suggestionsDiv, input) {
        if (query.length < 1) {
            suggestionsDiv.style.display = 'none';
            console.log('Query too short, hiding suggestions');
            return;
        }
        try {
            const items = await loadItems(query);
            console.log('Items received:', items);
            if (!Array.isArray(items) || items.length === 0) {
                console.log('No items found or invalid response:', items);
                suggestionsDiv.innerHTML = '<div class="suggestion-item">No items found</div>';
                suggestionsDiv.style.display = 'block';
                return;
            }
            suggestionsDiv.innerHTML = items.map(i => `
                <div class="suggestion-item" data-item-id="${i.id}">${i.name}</div>
            `).join('');
            console.log('Suggestions updated, showing div');
            suggestionsDiv.style.display = 'block';
            suggestionsDiv.querySelectorAll('.suggestion-item').forEach(item => {
                item.addEventListener('click', () => {
                    input.value = item.textContent;
                    input.dataset.itemId = item.dataset.itemId;
                    suggestionsDiv.style.display = 'none';
                    console.log('Item selected:', item.textContent);
                });
            });
        } catch (error) {
            console.error('Search error:', error);
            suggestionsDiv.innerHTML = '<div class="suggestion-item">Network error</div>';
            suggestionsDiv.style.display = 'block';
        }
    }

    async function addItem() {
        const itemId = parseInt(addItemSearch.dataset.itemId);
        const quantity = parseInt(addItemQuantity.value);
        const bagId = parseInt(bagSelect.value);
        if (!bagId) return alert('Please select a bag');
        if (!itemId || isNaN(itemId)) return alert('Please select an item');
        if (quantity <= 0 || isNaN(quantity)) return alert('Please enter a valid quantity');

        const response = await fetch('/api/inventory/add', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ inventoryBagId: bagId, itemId, quantity })
        });
        if (response.ok) {
            addItemSearch.value = '';
            delete addItemSearch.dataset.itemId;
            loadInventory(bagId);
        } else {
            const errorText = await response.text();
            alert(`Failed to add item: ${errorText}`);
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

    addItemBtn.addEventListener('click', addItem);

    addItemSearch.addEventListener('input', () => {
        searchItems(addItemSearch.value.trim(), addItemSuggestions, addItemSearch);
    });

    document.addEventListener('click', (e) => {
        if (!addItemSuggestions.contains(e.target) && e.target !== addItemSearch) {
            addItemSuggestions.style.display = 'none';
        }
    });

    shareBagBtn.addEventListener('click', async () => {
        const userId = parseInt(shareUserSearch.dataset.userId);
        const accessLevel = shareAccessLevelSelect.value;
        const bagId = parseInt(bagSelect.value);
        if (!bagId) return alert('Please select a bag');
        if (!userId || isNaN(userId)) return alert('Please select a valid user');
        if (!accessLevel) return alert('Please select an access level');
        try {
            const response = await fetch('/api/inventory/share', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ inventoryBagId: bagId, targetUserId: userId, accessLevel })
            });
            if (response.ok) {
                alert('Bag shared!');
                shareUserSearch.value = '';
                delete shareUserSearch.dataset.userId;
                loadBags();
            } else {
                const errorText = await response.text();
                console.error(`Share failed: ${response.status} ${errorText}`);
                alert(`Failed to share bag: ${errorText}`);
            }
        } catch (error) {
            console.error('Network error:', error);
            alert('Network error while sharing bag');
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
        try {
            const response = await fetch('/api/inventory/move', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ fromBagId: bagId, toBagId, itemId, quantity })
            });
            if (response.ok) {
                loadInventory(bagId);
            } else if (response.status === 403) {
                alert('You have limited access to this bag and cannot move items.');
            } else {
                const errorText = await response.text();
                console.error(`Move failed: ${response.status} ${errorText}`);
                alert(`Failed to move item: ${errorText}`);
            }
        } catch (error) {
            console.error('Network error:', error);
            alert('Network error while moving item');
        }
    };

    window.removeItem = async (bagId, itemId) => {
        const qtyInput = document.getElementById(`qty-${itemId}`);
        const quantity = parseInt(qtyInput.value);
        if (quantity <= 0 || isNaN(quantity)) return alert('Please enter a valid quantity');
        try {
            const response = await fetch(`/api/inventory/remove/${bagId}/${itemId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity })
            });
            if (response.ok) {
                loadInventory(bagId);
            } else if (response.status === 403) {
                alert('You have limited access to this bag and cannot remove items.');
            } else {
                const errorText = await response.text();
                console.error(`Remove failed: ${response.status} ${errorText}`);
                alert(`Failed to remove item: ${errorText}`);
            }
        } catch (error) {
            console.error('Network error:', error);
            alert('Network error while removing item');
        }
    };

    function checkAuthState() {
        const newToken = localStorage.getItem('token');
        const newRole = localStorage.getItem('role') || 'Player';
        if (newToken !== token || newRole !== role) {
            token = newToken;
            role = newRole;
            location.reload();
        }
    }

    setInterval(checkAuthState, 500);

    loadRarityOptions();
    loadBags();
});