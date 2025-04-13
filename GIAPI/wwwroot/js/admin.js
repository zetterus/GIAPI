document.addEventListener('DOMContentLoaded', () => {
    const bagSearch = document.getElementById('bag-search');
    const bagSuggestions = document.getElementById('bag-suggestions');
    const bagsTableBody = document.querySelector('#bags-table tbody');
    const activeBagDisplay = document.getElementById('active-bag-display');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');
    const token = localStorage.getItem('token');
    let currentPage = 1;
    const pageSize = 10;

    if (!token) {
        alert('Please log in as admin');
        return;
    }

    // Функция для преобразования accessLevel
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
                <div class="admin-suggestion-item" data-bag-id="${b.id}">[${b.name}] (${b.ownerUsername})</div>
            `).join('');
            bagSuggestions.style.display = 'block';
            bagSuggestions.querySelectorAll('.admin-suggestion-item').forEach(item => {
                item.addEventListener('click', () => {
                    selectBag(item.dataset.bagId, item.textContent);
                    bagSearch.value = '';
                    bagSuggestions.style.display = 'none';
                });
            });
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
            const bags = data.bags;
            const totalPages = data.totalPages;

            bagsTableBody.innerHTML = bags.map(b => `
                <tr>
                    <td>${b.name}</td>
                    <td>${b.ownerUsername}</td>
                    <td>${b.accesses.map(a => `${a.username}: ${getAccessLevelDisplay(a.accessLevel)}`).join(', ') || 'None'}</td>
                    <td>
                        <button onclick="deleteBag(${b.id})">Delete</button>
                        <button onclick="transferBag(${b.id})">Transfer</button>
                        <button onclick="openEditBagForm(${b.id})">Edit Bag</button>
                        <button onclick="selectBag(${b.id}, '[${b.name}] (${b.ownerUsername})')">Select</button>
                    </td>
                </tr>
            `).join('');

            pageInfo.textContent = `Page ${page}`;
            prevPageBtn.disabled = page === 1;
            nextPageBtn.disabled = page >= totalPages;
            currentPage = page;
        } catch (error) {
            console.error('Load bags error:', error);
            bagsTableBody.innerHTML = '<tr><td colspan="4">Network error</td></tr>';
        }
    }

    async function selectBag(bagId, displayText) {
        activeBagDisplay.textContent = `Selected: ${displayText}`;
        activeBagDisplay.dataset.bagId = bagId;
        try {
            const response = await fetch(`/api/inventory/admin/bag-contents/${bagId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                console.error(`Server returned ${response.status}: ${await response.text()}`);
                document.querySelector('#bag-contents-table tbody').innerHTML = '<tr><td colspan="2">Error loading contents</td></tr>';
                return;
            }
            const bag = await response.json();
            document.querySelector('#bag-contents-table tbody').innerHTML = bag.items.map(i => `
                <tr>
                    <td>${i.name}</td>
                    <td>${i.quantity}</td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Load bag contents error:', error);
            document.querySelector('#bag-contents-table tbody').innerHTML = '<tr><td colspan="2">Network error</td></tr>';
        }
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

    // Функция для поиска пользователей
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

    // Функция для открытия формы редактирования сумки
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

            // Создаём модальное окно
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <h2>Edit Bag</h2>
                    <form id="edit-bag-form">
                        <label>Bag Name:</label>
                        <input type="text" id="bag-name" value="${bag.name}" required>
                        
                        <label>Rarity:</label>
                        <select id="bag-rarity" required>
                            <option value="Common" ${bag.rarity === 'Common' ? 'selected' : ''}>Common</option>
                            <option value="Rare" ${bag.rarity === 'Rare' ? 'selected' : ''}>Rare</option>
                            <option value="Epic" ${bag.rarity === 'Epic' ? 'selected' : ''}>Epic</option>
                            <option value="Legendary" ${bag.rarity === 'Legendary' ? 'selected' : ''}>Legendary</option>
                        </select>
                        
                        <label>Owner:</label>
                        <input type="text" id="owner-search" placeholder="Search for owner..." value="${bag.ownerUsername}">
                        <div id="owner-suggestions" class="admin-suggestions"></div>
                        
                        <label>Accesses:</label>
                        <div id="access-list"></div>
                        <input type="text" id="access-search" placeholder="Add user to access...">
                        <div id="access-suggestions" class="admin-suggestions"></div>
                        
                        <button type="button" id="add-access-btn">Add Access</button>
                        <button type="submit">Save</button>
                        <button type="button" id="close-modal">Cancel</button>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);

            const form = modal.querySelector('#edit-bag-form');
            const ownerSearch = modal.querySelector('#owner-search');
            const ownerSuggestions = modal.querySelector('#owner-suggestions');
            const accessSearch = modal.querySelector('#access-search');
            const accessSuggestions = modal.querySelector('#access-suggestions');
            const accessList = modal.querySelector('#access-list');
            const addAccessBtn = modal.querySelector('#add-access-btn');
            const closeModal = modal.querySelector('#close-modal');

            let selectedOwner = { id: null, username: bag.ownerUsername };
            let accesses = bag.accesses.map(a => ({
                userId: null,
                username: a.username,
                accessLevel: getAccessLevelDisplay(a.accessLevel)
            }));

            // Обновление списка доступов
            function updateAccessList() {
                accessList.innerHTML = accesses.map((a, index) => `
                    <div class="access-item">
                        <span>${a.username}</span>
                        <select data-index="${index}">
                            <option value="FullEdit" ${a.accessLevel === 'FullEdit' ? 'selected' : ''}>FullEdit</option>
                            <option value="ViewOnly" ${a.accessLevel === 'ViewOnly' ? 'selected' : ''}>ViewOnly</option>
                        </select>
                        <button type="button" onclick="removeAccess(${index})">Remove</button>
                    </div>
                `).join('');
            }

            window.removeAccess = (index) => {
                accesses.splice(index, 1);
                updateAccessList();
            };

            updateAccessList();

            // Поиск владельца
            ownerSearch.addEventListener('input', () => {
                searchUsers(ownerSearch.value.trim(), ownerSuggestions, (userId, username) => {
                    selectedOwner = { id: userId, username };
                    ownerSearch.value = username;
                    ownerSuggestions.style.display = 'none';
                });
            });

            // Поиск пользователей для доступа
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

            // Добавление доступа через кнопку
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

            // Изменение уровня доступа
            accessList.addEventListener('change', (e) => {
                if (e.target.tagName === 'SELECT') {
                    const index = e.target.dataset.index;
                    accesses[index].accessLevel = e.target.value;
                }
            });

            // Отправка формы
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                try {
                    // Обновление названия и редкости
                    const name = modal.querySelector('#bag-name').value;
                    const rarity = modal.querySelector('#bag-rarity').value;
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

                    // Обновление владельца
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

                    // Обновление доступов
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
                    modal.remove();
                } catch (error) {
                    console.error('Update bag error:', error);
                    alert('Network error while updating bag');
                }
            });

            // Закрытие формы
            closeModal.addEventListener('click', () => modal.remove());
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
        } catch (error) {
            console.error('Load bag error:', error);
            alert('Network error while loading bag');
        }
    }

    bagSearch.addEventListener('input', () => {
        searchBags(bagSearch.value.trim());
    });

    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) loadBags(currentPage - 1);
    });

    nextPageBtn.addEventListener('click', () => {
        loadBags(currentPage + 1);
    });

    document.addEventListener('click', (e) => {
        if (!bagSuggestions.contains(e.target) && e.target !== bagSearch) {
            bagSuggestions.style.display = 'none';
        }
    });

    window.deleteBag = deleteBag;
    window.transferBag = transferBag;
    window.openEditBagForm = openEditBagForm;
    window.selectBag = selectBag;

    loadBags();
});