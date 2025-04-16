document.addEventListener('DOMContentLoaded', () => {
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
    const token = localStorage.getItem('token');
    let currentPage = 1;
    let contentsCurrentPage = 1;
    const pageSize = 10;

    if (!token) {
        alert('Please log in as moderator');
        window.location.href = '/auth.html';
        return;
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
                bagsTableBody.innerHTML = '<tr><td colspan="3">Error loading bags</td></tr>';
                return;
            }
            const data = await response.json();
            const bags = data.bags || [];
            bagsTableBody.innerHTML = bags.map(b => `
                <tr>
                    <td>${b.name}</td>
                    <td>${b.ownerUsername || 'Unknown'}</td>
                    <td>
                        <button class="button select-bag-btn" data-bag-id="${b.id}" data-bag-name="[${b.name}] (${b.ownerUsername})">Select</button>
                    </td>
                </tr>
            `).join('');
            pageInfo.textContent = `Page ${page}`;
            prevPageBtn.style.display = page === 1 ? 'none' : 'inline-block';
            nextPageBtn.style.display = page >= data.totalPages ? 'none' : 'inline-block';
            currentPage = page;
        } catch (error) {
            bagsTableBody.innerHTML = '<tr><td colspan="3">Network error</td></tr>';
        }
    }

    async function loadBagContents(bagId, page = 1) {
        try {
            const response = await fetch(`/api/inventory/admin/bag-contents/${bagId}?page=${page}&pageSize=${pageSize}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                document.querySelector('#bag-contents-table tbody').innerHTML = '<tr><td colspan="2">Error loading contents</td></tr>';
                contentsPrevPageBtn.style.display = 'none';
                contentsNextPageBtn.style.display = 'none';
                return;
            }
            const data = await response.json();
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
            document.querySelector('#bag-contents-table tbody').innerHTML = '<tr><td colspan="2">Network error</td></tr>';
            contentsPrevPageBtn.style.display = 'none';
            contentsNextPageBtn.style.display = 'none';
        }
    }

    async function selectBag(bagId, displayText) {
        activeBagDisplay.textContent = `Selected: ${displayText}`;
        activeBagDisplay.dataset.bagId = bagId;
        await loadBagContents(bagId, 1);
    }

    bagsTableBody.addEventListener('click', (e) => {
        const btn = e.target.closest('.select-bag-btn');
        if (btn) {
            const bagId = parseInt(btn.dataset.bagId);
            selectBag(bagId, btn.dataset.bagName);
        }
    });

    bagSearch.addEventListener('input', () => {
        searchBags(bagSearch.value.trim());
    });

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

    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) loadBags(currentPage - 1);
    });

    nextPageBtn.addEventListener('click', () => {
        loadBags(currentPage + 1);
    });

    contentsPrevPageBtn.addEventListener('click', () => {
        if (activeBagDisplay.dataset.bagId && contentsCurrentPage > 1) {
            loadBagContents(parseInt(activeBagDisplay.dataset.bagId), contentsCurrentPage - 1);
        }
    });

    contentsNextPageBtn.addEventListener('click', () => {
        if (activeBagDisplay.dataset.bagId) {
            loadBagContents(parseInt(activeBagDisplay.dataset.bagId), contentsCurrentPage + 1);
        }
    });

    document.addEventListener('click', (e) => {
        if (!bagSuggestions.contains(e.target) && e.target !== bagSearch) {
            bagSuggestions.style.display = 'none';
        }
    });

    loadBags(1);
});