document.addEventListener('DOMContentLoaded', () => {
    // Проверка смены дня и очистка localStorage
    const lastLoginDate = localStorage.getItem('lastLoginDate');
    const today = new Date().toISOString().split('T')[0];

    if (lastLoginDate && lastLoginDate !== today) {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        window.location.href = '/auth.html';
        return;
    }

    localStorage.setItem('lastLoginDate', today);

    const bagSearch = document.getElementById('bag-search');
    const bagSuggestions = document.getElementById('bag-suggestions');
    const bagsTableBody = document.querySelector('#bags-table tbody');
    const activeBagDisplay = document.getElementById('active-bag-display');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');
    const contentsPrevPageBtn = document.getElementById('contents-prev-page');
    const contentsNextPageBtn = document.getElementById('contents-next-page');
    const contentsPageInfo = document.getElementById('contents-page-info');
    const createItemForm = document.getElementById('create-item-form');
    const addItemForm = document.getElementById('add-item-form');
    const addItemSearch = document.getElementById('add-item-search');
    const addItemSuggestions = document.getElementById('add-item-suggestions');
    const addItemSubmit = document.getElementById('add-item-submit');
    const token = localStorage.getItem('token');
    let currentPage = 1;
    let contentsCurrentPage = 1;
    const pageSize = 10;
    let selectedItemId = null;

    if (!token) {
        alert('Please log in as admin');
        window.location.href = '/auth.html';
        return;
    }

    // Преобразование accessLevel
    function getAccessLevelDisplay(accessLevel) {
        const level = String(accessLevel).toLowerCase();
        switch (level) {
            case 'fulledit':
            case '1':
                return 'FullEdit';
            case 'viewonly':
            case '0':
                return 'ViewOnly';
            default:
                return 'Unknown';
        }
    }

    async function searchBags(query) {
        if (query.length < 1) {
            bagSuggestions.style.display = 'none';
            return;
        }
        try {
            const response = await fetch(`/api/inventory/admin/search-bags?query=${encodeURIComponent(query)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                console.error(`Server returned ${response.status}: ${await response.text()}`);
                bagSuggestions.innerHTML = '<div class="admin-suggestion-item">Error loading bags</div>';
                bagSuggestions.style.display = 'block';
                return;
            }
            const bags = await response.json();
            if (!Array.isArray(bags) || bags.length === 0) {
                bagSuggestions.innerHTML = '<div class="admin-suggestion-item">No bags found</div>';
                bagSuggestions.style.display = 'block';
                return;
            }
            bagSuggestions.innerHTML = bags.map(b => `
                <div class="admin-suggestion-item" data-bag-id="${b.id}" data-bag-name="[${b.name}] (${b.ownerUsername})">[${b.name}] (${b.ownerUsername})</div>
            `).join('');
            bagSuggestions.style.display = 'block';
        } catch (error) {
            console.error('Search error:', error);
            bagSuggestions.innerHTML = '<div class="admin-suggestion-item">Network error</div>';
            bagSuggestions.style.display = 'block';
        }
    }

    async function loadBags(page = 1) {
        try {
            const response = await fetch(`/api/inventory/admin/list-bags?page=${page}&pageSize=${pageSize}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                console.error(`Server returned ${response.status}: ${await response.text()}`);
                bagsTableBody.innerHTML = '<tr><td colspan="4">Error loading bags</td></tr>';
                return;
            }
            const data = await response.json();
            const bags = data.bags || [];
            bagsTableBody.innerHTML = bags.map(b => `
                <tr>
                    <td>${b.name}</td>
                    <td>${b.ownerUsername || 'Unknown'}</td>
                    <td>${b.accesses.map(a => `${a.username}: ${getAccessLevelDisplay(a.accessLevel)}`).join(', ') || 'None'}</td>
                    <td>
                        <button class="button delete-bag-btn" data-bag-id="${b.id}">Delete</button>
                        <button class="button transfer-bag-btn" data-bag-id="${b.id}">Transfer</button>
                        <button class="button edit-bag-btn" data-bag-id="${b.id}">Edit Bag</button>
                        <button class="button select-bag-btn" data-bag-id="${b.id}" data-bag-name="[${b.name}] (${b.ownerUsername})">Select</button>
                    </td>
                </tr>
            `).join('');
            pageInfo.textContent = `Page ${page}`;
            prevPageBtn.style.display = page === 1 ? 'none' : 'inline-block';
            nextPageBtn.style.display = page >= data.totalPages ? 'none' : 'inline-block';
            currentPage = page;
        } catch (error) {
            console.error('Load bags error:', error);
            bagsTableBody.innerHTML = '<tr><td colspan="4">Network error</td></tr>';
        }
    }

    async function loadBagContents(bagId, page = 1) {
        try {
            console.log(`Loading contents for bagId: ${bagId}, page: ${page}`);
            const response = await fetch(`/api/inventory/admin/bag-contents/${bagId}?page=${page}&pageSize=${pageSize}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                console.error(`Server returned ${response.status}: ${await response.text()}`);
                document.querySelector('#bag-contents-table tbody').innerHTML = '<tr><td colspan="2">Error loading contents</td></tr>';
                contentsPrevPageBtn.style.display = 'none';
                contentsNextPageBtn.style.display = 'none';
                return;
            }
            const data = await response.json();
            console.log('API response:', data);
            const items = data.items || [];
            const totalPages = data.totalPages || 1;
            document.querySelector('#bag-contents-table tbody').innerHTML = items.map(i => `
                <tr>
                    <td>${i.name}</td>
                    <td>${i.quantity}</td>
                </tr>
            `).join('');
            contentsPageInfo.textContent = `Page ${page}`;
            contentsPrevPageBtn.style.display = page === 1 ? 'none' : 'inline-block';
            contentsNextPageBtn.style.display = page >= totalPages ? 'none' : 'inline-block';
            contentsCurrentPage = page;
        } catch (error) {
            console.error('Load bag contents error:', error);
            document.querySelector('#bag-contents-table tbody').innerHTML = '<tr><td colspan="2">Network error</td></tr>';
            contentsPrevPageBtn.style.display = 'none';
            contentsNextPageBtn.style.display = 'none';
        }
    }

    async function selectBag(bagId, displayText) {
        activeBagDisplay.textContent = `Selected: ${displayText}`;
        activeBagDisplay.dataset.bagId = bagId;
        await loadBagContents(bagId, 1);
        addItemSubmit.disabled = !(selectedItemId && bagId);
    }

    async function deleteBag(bagId) {
        if (!confirm('Are you sure you want to delete this bag?')) return;
        try {
            const response = await fetch(`/api/inventory/admin/delete-bag/${bagId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                loadBags(currentPage);
                if (activeBagDisplay.dataset.bagId == bagId) {
                    activeBagDisplay.textContent = 'No bag selected';
                    delete activeBagDisplay.dataset.bagId;
                    document.querySelector('#bag-contents-table tbody').innerHTML = '';
                    contentsPrevPageBtn.style.display = 'none';
                    contentsNextPageBtn.style.display = 'none';
                    addItemSubmit.disabled = true;
                }
            } else {
                const errorText = await response.text();
                alert(`Failed to delete bag: ${errorText}`);
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Network error while deleting bag');
        }
    }

    async function transferBag(bagId) {
        const username = prompt('Enter username to transfer bag to:');
        if (!username) return;
        try {
            const response = await fetch(`/api/User/search?query=${encodeURIComponent(username)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                alert('User search failed');
                return;
            }
            const users = await response.json();
            const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
            if (!user) {
                alert('User not found');
                return;
            }
            const transferResponse = await fetch(`/api/inventory/admin/transfer-bag`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ inventoryBagId: bagId, newOwnerId: user.id })
            });
            if (transferResponse.ok) {
                loadBags(currentPage);
                if (activeBagDisplay.dataset.bagId == bagId) {
                    selectBag(bagId, `[${activeBagDisplay.textContent.split('Selected: [')[1].split(']')[0]}] (${username})`);
                }
            } else {
                const errorText = await transferResponse.text();
                alert(`Failed to transfer bag: ${errorText}`);
            }
        } catch (error) {
            console.error('Transfer error:', error);
            alert('Network error while transferring bag');
        }
    }

    async function openEditBagForm(bagId) {
        try {
            const response = await fetch(`/api/inventory/admin/list-bags?page=${currentPage}&pageSize=${pageSize}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                alert('Failed to load bag data');
                return;
            }
            const data = await response.json();
            const bag = data.bags.find(b => b.id === bagId);
            if (!bag) {
                alert('Bag not found');
                return;
            }

            const form = document.querySelector('#edit-bag-form');
            const popup = document.querySelector('#editBagForm');
            const bagName = form.querySelector('#bag-name');
            const bagRarity = form.querySelector('#bag-rarity');
            const ownerSearch = form.querySelector('#owner-search');
            const ownerSuggestions = form.querySelector('#owner-suggestions');
            const accessSearch = form.querySelector('#access-search');
            const accessSuggestions = form.querySelector('#access-suggestions');
            const accessList = form.querySelector('#access-list');
            const addAccessBtn = form.querySelector('#add-access-btn');
            const closePopup = form.querySelector('#close-popup');

            bagName.value = bag.name;
            bagRarity.value = bag.rarity || 'Common';
            ownerSearch.value = bag.ownerUsername;

            let selectedOwner = { id: null, username: bag.ownerUsername };
            let accesses = bag.accesses.map(a => ({
                userId: null,
                username: a.username,
                accessLevel: getAccessLevelDisplay(a.accessLevel)
            }));

            function updateAccessList() {
                accessList.innerHTML = accesses.map((a, index) => `
                    <div class="access-item">
                        <span>${a.username}</span>
                        <select class="input" data-index="${index}">
                            <option value="FullEdit" ${a.accessLevel === 'FullEdit' ? 'selected' : ''}>FullEdit</option>
                            <option value="ViewOnly" ${a.accessLevel === 'ViewOnly' ? 'selected' : ''}>ViewOnly</option>
                        </select>
                        <button type="button" class="button remove-access-btn" data-index="${index}">Remove</button>
                    </div>
                `).join('');
            }

            updateAccessList();

            async function searchUsers(query, suggestionsContainer, callback) {
                if (query.length < 1) {
                    suggestionsContainer.style.display = 'none';
                    return;
                }
                try {
                    const response = await fetch(`/api/User/search?query=${encodeURIComponent(query)}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!response.ok) {
                        console.error(`Search users failed: ${response.status}`);
                        suggestionsContainer.innerHTML = '<div class="admin-suggestion-item">Error loading users</div>';
                        suggestionsContainer.style.display = 'block';
                        return;
                    }
                    const users = await response.json();
                    if (!Array.isArray(users) || users.length === 0) {
                        suggestionsContainer.innerHTML = '<div class="admin-suggestion-item">No users found</div>';
                        suggestionsContainer.style.display = 'block';
                        return;
                    }
                    suggestionsContainer.innerHTML = users.map(u => `
                        <div class="admin-suggestion-item" data-user-id="${u.id}">${u.username}</div>
                    `).join('');
                    suggestionsContainer.style.display = 'block';
                    suggestionsContainer.querySelectorAll('.admin-suggestion-item').forEach(item => {
                        item.addEventListener('click', () => {
                            callback(item.dataset.userId, item.textContent);
                            suggestionsContainer.style.display = 'none';
                        });
                    });
                } catch (error) {
                    console.error('Search users error:', error);
                    suggestionsContainer.innerHTML = '<div class="admin-suggestion-item">Network error</div>';
                    suggestionsContainer.style.display = 'block';
                }
            }

            ownerSearch.addEventListener('input', () => {
                searchUsers(ownerSearch.value.trim(), ownerSuggestions, (userId, username) => {
                    selectedOwner = { id: userId, username };
                    ownerSearch.value = username;
                    ownerSuggestions.style.display = 'none';
                });
            });

            accessSearch.addEventListener('input', () => {
                searchUsers(accessSearch.value.trim(), accessSuggestions, (userId, username) => {
                    if (!accesses.some(a => a.username === username) && username !== selectedOwner.username) {
                        accesses.push({ userId, username, accessLevel: 'FullEdit' });
                        updateAccessList();
                        accessSearch.value = '';
                        accessSuggestions.style.display = 'none';
                    }
                });
            });

            addAccessBtn.addEventListener('click', () => {
                const username = accessSearch.value.trim();
                if (username && !accesses.some(a => a.username === username) && username !== selectedOwner.username) {
                    searchUsers(username, accessSuggestions, (userId, username) => {
                        accesses.push({ userId, username, accessLevel: 'FullEdit' });
                        updateAccessList();
                        accessSearch.value = '';
                        accessSuggestions.style.display = 'none';
                    });
                }
            });

            accessList.addEventListener('click', (e) => {
                if (e.target.classList.contains('remove-access-btn')) {
                    const index = e.target.dataset.index;
                    accesses.splice(index, 1);
                    updateAccessList();
                }
            });

            accessList.addEventListener('change', (e) => {
                if (e.target.tagName === 'SELECT') {
                    const index = e.target.dataset.index;
                    accesses[index].accessLevel = e.target.value;
                }
            });

            form.onsubmit = async (e) => {
                e.preventDefault();
                try {
                    const name = bagName.value;
                    const rarity = bagRarity.value;
                    const updateResponse = await fetch('/api/inventory/admin/update-bag', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ inventoryBagId: bagId, name, rarity })
                    });
                    if (!updateResponse.ok) {
                        const errorText = await updateResponse.text();
                        alert(`Failed to update bag: ${errorText}`);
                        return;
                    }

                    if (selectedOwner.id && selectedOwner.username !== bag.ownerUsername) {
                        const transferResponse = await fetch('/api/inventory/admin/transfer-bag', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ inventoryBagId: bagId, newOwnerId: selectedOwner.id })
                        });
                        if (!transferResponse.ok) {
                            const errorText = await transferResponse.text();
                            alert(`Failed to transfer bag: ${errorText}`);
                            return;
                        }
                    }

                    for (const access of accesses) {
                        if (!access.userId) {
                            const userResponse = await fetch(`/api/User/search?query=${encodeURIComponent(access.username)}`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (!userResponse.ok) continue;
                            const users = await userResponse.json();
                            const user = users.find(u => u.username.toLowerCase() === access.username.toLowerCase());
                            if (user) access.userId = user.id;
                        }
                        if (access.userId) {
                            const shareResponse = await fetch('/api/inventory/share', {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    inventoryBagId: bagId,
                                    targetUserId: access.userId,
                                    accessLevel: access.accessLevel
                                })
                            });
                            if (!shareResponse.ok) {
                                const errorText = await shareResponse.text();
                                alert(`Failed to update access for ${access.username}: ${errorText}`);
                            }
                        }
                    }

                    alert('Bag updated successfully');
                    loadBags(currentPage);
                    popup.classList.remove('show');
                } catch (error) {
                    console.error('Update bag error:', error);
                    alert('Network error while updating bag');
                }
            };

            closePopup.addEventListener('click', () => {
                popup.classList.remove('show');
            });

            popup.classList.add('show');
        } catch (error) {
            console.error('Load bag error:', error);
            alert('Network error while loading bag');
        }
    }

    // Логика создания вещи
    const properties = [];
    const addPropertyBtn = document.getElementById('add-property-btn');
    const propertyKeyInput = document.getElementById('property-key');
    const propertyValueInput = document.getElementById('property-value');
    const propertiesList = document.getElementById('properties-list');

    function updatePropertiesList() {
        propertiesList.innerHTML = properties.map((p, index) => `
            <div class="access-item">
                <span>${p.key}: ${p.value}</span>
                <button type="button" class="button remove-property-btn" data-index="${index}">Remove</button>
            </div>
        `).join('');
    }

    addPropertyBtn.addEventListener('click', () => {
        const key = propertyKeyInput.value.trim();
        const value = propertyValueInput.value.trim();
        if (key && value) {
            properties.push({ key, value });
            updatePropertiesList();
            propertyKeyInput.value = '';
            propertyValueInput.value = '';
        }
    });

    propertiesList.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-property-btn')) {
            const index = e.target.dataset.index;
            properties.splice(index, 1);
            updatePropertiesList();
        }
    });

    createItemForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('item-name').value.trim();
        const type = document.getElementById('item-type').value;
        const level = parseInt(document.getElementById('item-level').value) || 1;
        const rarity = document.getElementById('item-rarity').value;
        const attack = parseInt(document.getElementById('item-attack').value) || 0;
        const defense = parseInt(document.getElementById('item-defense').value) || 0;
        const health = parseInt(document.getElementById('item-health').value) || 0;

        if (!name) {
            alert('Name is required');
            return;
        }

        try {
            const response = await fetch('/api/Item/create', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    type,
                    level,
                    rarity,
                    attack,
                    defense,
                    health,
                    properties
                })
            });
            if (response.ok) {
                alert('Item created successfully');
                createItemForm.reset();
                properties.length = 0;
                updatePropertiesList();
            } else {
                const errorData = await response.json();
                alert(`Failed to create item: ${errorData.title || 'Unknown error'} - ${JSON.stringify(errorData.errors || {})}`);
            }
        } catch (error) {
            console.error('Create item error:', error);
            alert('Network error while creating item');
        }
    });

    // Логика добавления вещи
    async function searchItems(query) {
        if (query.length < 1) {
            addItemSuggestions.style.display = 'none';
            return;
        }
        try {
            const response = await fetch(`/api/Item/admin/search?query=${encodeURIComponent(query)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                console.error(`Server returned ${response.status}: ${await response.text()}`);
                addItemSuggestions.innerHTML = '<div class="admin-suggestion-item">Error loading items</div>';
                addItemSuggestions.style.display = 'block';
                return;
            }
            const items = await response.json();
            if (!Array.isArray(items) || items.length === 0) {
                addItemSuggestions.innerHTML = '<div class="admin-suggestion-item">No items found</div>';
                addItemSuggestions.style.display = 'block';
                return;
            }
            addItemSuggestions.innerHTML = items.map(i => `
                <div class="admin-suggestion-item" data-item-id="${i.id}">${i.name}</div>
            `).join('');
            addItemSuggestions.style.display = 'block';
        } catch (error) {
            console.error('Search items error:', error);
            addItemSuggestions.innerHTML = '<div class="admin-suggestion-item">Network error</div>';
            addItemSuggestions.style.display = 'block';
        }
    }

    addItemSearch.addEventListener('input', () => {
        searchItems(addItemSearch.value.trim());
    });

    addItemSuggestions.addEventListener('click', (e) => {
        const item = e.target.closest('.admin-suggestion-item');
        if (item) {
            selectedItemId = parseInt(item.dataset.itemId);
            addItemSearch.value = item.textContent;
            addItemSuggestions.style.display = 'none';
            addItemSubmit.disabled = !(selectedItemId && activeBagDisplay.dataset.bagId);
        }
    });

    addItemForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const bagId = parseInt(activeBagDisplay.dataset.bagId);
        const quantity = parseInt(document.getElementById('add-item-quantity').value);

        if (!bagId || !selectedItemId) {
            alert('Please select a bag and an item');
            return;
        }

        try {
            const response = await fetch('/api/inventory/admin/add-item', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    inventoryBagId: bagId,
                    itemId: selectedItemId,
                    quantity
                })
            });
            if (response.ok) {
                alert('Item added successfully');
                addItemForm.reset();
                addItemSearch.value = '';
                selectedItemId = null;
                addItemSubmit.disabled = true;
                loadBagContents(bagId, contentsCurrentPage);
            } else {
                const errorText = await response.text();
                alert(`Failed to add item: ${errorText}`);
            }
        } catch (error) {
            console.error('Add item error:', error);
            alert('Network error while adding item');
        }
    });

    // Делегирование событий для кнопок в таблице
    bagsTableBody.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const bagId = parseInt(btn.dataset.bagId);
        if (btn.classList.contains('delete-bag-btn')) {
            deleteBag(bagId);
        } else if (btn.classList.contains('transfer-bag-btn')) {
            transferBag(bagId);
        } else if (btn.classList.contains('edit-bag-btn')) {
            openEditBagForm(bagId);
        } else if (btn.classList.contains('select-bag-btn')) {
            selectBag(bagId, btn.dataset.bagName);
        }
    });

    // Поиск сумок
    bagSearch.addEventListener('input', () => {
        searchBags(bagSearch.value.trim());
    });

    // Выбор сумки из предложений
    bagSuggestions.addEventListener('click', (e) => {
        const item = e.target.closest('.admin-suggestion-item');
        if (item) {
            const bagId = parseInt(item.dataset.bagId);
            const bagName = item.dataset.bagName;
            bagSearch.value = '';
            bagSuggestions.style.display = 'none';
            selectBag(bagId, bagName);
        }
    });

    // Пагинация сумок
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) loadBags(currentPage - 1);
    });

    nextPageBtn.addEventListener('click', () => {
        loadBags(currentPage + 1);
    });

    // Пагинация содержимого
    contentsPrevPageBtn.addEventListener('click', () => {
        console.log(`Previous clicked, bagId: ${activeBagDisplay.dataset.bagId}, page: ${contentsCurrentPage - 1}`);
        if (activeBagDisplay.dataset.bagId && contentsCurrentPage > 1) {
            loadBagContents(parseInt(activeBagDisplay.dataset.bagId), contentsCurrentPage - 1);
        }
    });

    contentsNextPageBtn.addEventListener('click', () => {
        console.log(`Next clicked, bagId: ${activeBagDisplay.dataset.bagId}, page: ${contentsCurrentPage + 1}`);
        if (activeBagDisplay.dataset.bagId) {
            loadBagContents(parseInt(activeBagDisplay.dataset.bagId), contentsCurrentPage + 1);
        }
    });

    // Скрытие предложений при клике вне
    document.addEventListener('click', (e) => {
        if (!bagSuggestions.contains(e.target) && e.target !== bagSearch) {
            bagSuggestions.style.display = 'none';
        }
        if (!addItemSuggestions.contains(e.target) && e.target !== addItemSearch) {
            addItemSuggestions.style.display = 'none';
        }
    });

    // Начальная загрузка
    loadBags(1);
});