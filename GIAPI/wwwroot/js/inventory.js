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
    let role = localStorage.getItem('role') || '2'; // Player

    const rarityOptions = {
        '0': [
            { value: 'Common', text: 'Common' },
            { value: 'Rare', text: 'Rare' },
            { value: 'Epic', text: 'Epic' },
            { value: 'Legendary', text: 'Legendary' },
            { value: 'Mythical', text: 'Mythical' }
        ],
        '1': [
            { value: 'Common', text: 'Common' },
            { value: 'Rare', text: 'Rare' },
            { value: 'Epic', text: 'Epic' },
            { value: 'Legendary', text: 'Legendary' }
        ],
        '2': [
            { value: 'Common', text: 'Common' },
            { value: 'Rare', text: 'Rare' },
            { value: 'Epic', text: 'Epic' }
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
        const options = rarityOptions[role] || rarityOptions['2'];
        bagRaritySelect.innerHTML = options.map(opt => `<option value="${opt.value}">${opt.text}</option>`).join('');
    }

    async function loadBags() {
        if (!token) {
            alert('Please log in');
            console.error('No token found');
            return;
        }
        try {
            const response = await fetch('/api/inventory/bags', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Server returned ${response.status}: ${errorText}`);
                alert('Failed to load bags');
                return;
            }
            const bags = await response.json();
            displayBags(bags);
        } catch (error) {
            console.error('Load bags error:', error);
            alert('Network error');
        }
    }

    function displayBags(bags) {
        if (!bagSelect) {
            console.error('Bag select not found');
            return;
        }
        bagSelect.innerHTML = '<option value="">Select a bag</option>' +
            bags.map(b => `<option value="${b.id}">[${b.name}] (${rarityMap[b.rarity] || 'Unknown'}, ${b.isOwner ? 'Owner' : b.accessLevel || 'None'})</option>`).join('');
    }

    async function loadInventory(bagId) {
        if (!inventoryTable) {
            console.error('Inventory table not found');
            return;
        }
        try {
            const response = await fetch('/api/inventory/bags', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                console.error(`Server returned ${response.status}`);
                inventoryTable.innerHTML = '<tr><td colspan="3">Failed to load bag</td></tr>';
                return;
            }
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
                    if (!searchInput || !suggestionsDiv) return;
                    searchInput.addEventListener('input', async () => {
                        const query = searchInput.value.trim();
                        if (query.length < 1) {
                            suggestionsDiv.style.display = 'none';
                            return;
                        }
                        try {
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
                        } catch (error) {
                            console.error('Search error:', error);
                        }
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
        } catch (error) {
            console.error('Load inventory error:', error);
        }
    }

    async function loadItems(query = '') {
        try {
            const response = await fetch(`/api/item${query ? `?query=${encodeURIComponent(query)}` : ''}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                console.error(`Server returned ${response.status}`);
                return [];
            }
            return await response.json();
        } catch (error) {
            console.error('Fetch error:', error);
            return [];
        }
    }

    async function searchItems(query, suggestionsDiv, input) {
        if (query.length < 1) {
            suggestionsDiv.style.display = 'none';
            return;
        }
        try {
            const items = await loadItems(query);
            if (!Array.isArray(items) || items.length === 0) {
                suggestionsDiv.innerHTML = '<div class="suggestion-item">No items found</div>';
                suggestionsDiv.style.display = 'block';
                return;
            }
            suggestionsDiv.innerHTML = items.map(i => `
                <div class="suggestion-item" data-item-id="${i.id}">${i.name}</div>
            `).join('');
            suggestionsDiv.style.display = 'block';
            suggestionsDiv.querySelectorAll('.suggestion-item').forEach(item => {
                item.addEventListener('click', () => {
                    input.value = item.textContent;
                    input.dataset.itemId = item.dataset.itemId;
                    suggestionsDiv.style.display = 'none';
                });
            });
        } catch (error) {
            console.error('Search error:', error);
            suggestionsDiv.style.display = 'none';
        }
    }

    async function searchUsers(query, suggestionsDiv, input) {
        if (query.length < 1) {
            suggestionsDiv.style.display = 'none';
            return;
        }
        try {
            const response = await fetch(`/api/User/search?query=${encodeURIComponent(query)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) return;
            const users = await response.json();
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
            console.error('Search users error:', error);
        }
    }

    async function addItem() {
        const itemId = parseInt(addItemSearch.dataset.itemId);
        const quantity = parseInt(addItemQuantity.value);
        const bagId = parseInt(bagSelect.value);
        if (!bagId) return alert('Please select a bag');
        if (!itemId || isNaN(itemId)) return alert('Please select an item');
        if (quantity <= 0 || isNaN(quantity)) return alert('Please enter a valid quantity');

        try {
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
        } catch (error) {
            console.error('Add item error:', error);
            alert('Network error');
        }
    }

    createBagBtn.addEventListener('click', async () => {
        const name = document.getElementById('bag-name').value;
        const rarity = bagRaritySelect.value;
        if (!name) return alert('Please enter a bag name');
        try {
            const response = await fetch('/api/inventory/create', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, rarity })
            });
            if (response.ok) {
                document.getElementById('bag-name').value = '';
                loadBags();
            } else {
                alert('Failed to create bag');
            }
        } catch (error) {
            console.error('Create bag error:', error);
            alert('Network error');
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
                alert(`Failed to share bag: ${errorText}`);
            }
        } catch (error) {
            console.error('Share error:', error);
            alert('Network error');
        }
    });

    transferBagBtn.addEventListener('click', async () => {
        const newOwnerId = parseInt(transferUserSearch.dataset.userId);
        const bagId = parseInt(bagSelect.value);
        if (!bagId) return alert('Please select a bag');
        if (!newOwnerId || isNaN(newOwnerId)) return alert('Please select a valid user');
        try {
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
            } else {
                alert('Failed to transfer bag');
            }
        } catch (error) {
            console.error('Transfer error:', error);
            alert('Network error');
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
            } else {
                const errorText = await response.text();
                alert(`Failed to move item: ${errorText}`);
            }
        } catch (error) {
            console.error('Move error:', error);
            alert('Network error');
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
            } else {
                const errorText = await response.text();
                alert(`Failed to remove item: ${errorText}`);
            }
        } catch (error) {
            console.error('Remove error:', error);
            alert('Network error');
        }
    };

    function checkAuthState() {
        const newToken = localStorage.getItem('token');
        const newRole = localStorage.getItem('role') || '2';
        if (newToken !== token || newRole !== role) {
            console.log('Auth state changed:', { newToken, newRole });
            token = newToken;
            role = newRole;
            loadRarityOptions();
            loadBags();
        }
    }

    setInterval(checkAuthState, 500);

    loadRarityOptions();
    loadBags();
});