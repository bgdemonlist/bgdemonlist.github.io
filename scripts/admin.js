import {
	get,
	orderByChild,
	query,
	ref,
	remove,
	set,
	update,
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js';
import {
	onAuthStateChanged,
	signInWithEmailAndPassword,
	signOut,
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';
import { auth, byId, db, initAuthNavigation, normalizeKey, setText } from './app-common.js';

// Auth elements
const loginSection = byId('admin-login-section');
const dashboardSection = byId('admin-dashboard-section');
const loginForm = byId('login-form');
const loginEmail = byId('login-email');
const loginPassword = byId('login-password');
const loginError = byId('login-error');
const loginBtn = byId('login-btn');
const signOutBtn = byId('sign-out-btn');

// Form elements
const packForm = byId('pack-form');
const packFormTitle = byId('pack-form-title');
const packIdInput = byId('pack-id');
const packNameInput = byId('pack-name');
const packTierSelect = byId('pack-tier');
const packColorInput = byId('pack-color');
const packColorHexInput = byId('pack-color-hex');
const colorPreviewChip = byId('color-preview-chip');
const packBonusPercentInput = byId('pack-bonus-percent');
const packBonusFlatInput = byId('pack-bonus-flat');
const levelSearchInput = byId('level-search-input');
const levelCheckboxesContainer = byId('level-checkboxes-container');
const selectedLevelsCount = byId('selected-levels-count');
const packSubmitBtn = byId('pack-submit-btn');
const packCancelBtn = byId('pack-cancel-btn');
const packsListContainer = byId('packs-list-container');

// Tier form elements
const tierForm = byId('tier-form');
const tierFormTitle = byId('tier-form-title');
const tierIdInput = byId('tier-id');
const tierNameInput = byId('tier-name');
const tierColorInput = byId('tier-color');
const tierColorHexInput = byId('tier-color-hex');
const tierColorPreviewChip = byId('tier-color-preview-chip');
const tierSubmitBtn = byId('tier-submit-btn');
const tierCancelBtn = byId('tier-cancel-btn');
const tiersListContainer = byId('tiers-list-container');

let levelsList = [];
let packsList = [];
let tiersList = [];

// Initialize shared nav auth listener
initAuthNavigation();

// Main auth listener for page section toggle
onAuthStateChanged(auth, (user) => {
	if (user) {
		loginSection?.classList.add('hide');
		dashboardSection?.classList.remove('hide');
		loadAdminData();
	} else {
		loginSection?.classList.remove('hide');
		dashboardSection?.classList.add('hide');
	}
});

// Setup event listeners
if (loginForm) {
	loginForm.addEventListener('submit', handleLogin);
}

if (signOutBtn) {
	signOutBtn.addEventListener('click', () => {
		signOut(auth);
	});
}

if (packColorInput && packColorHexInput && colorPreviewChip) {
	packColorInput.addEventListener('input', (e) => {
		const val = e.target.value.toUpperCase();
		packColorHexInput.value = val;
		colorPreviewChip.style.backgroundColor = val;
	});

	packColorHexInput.addEventListener('input', (e) => {
		let val = e.target.value.trim();
		if (!val.startsWith('#')) {
			val = '#' + val;
		}
		if (/^#[0-9A-FA-F]{6}$/.test(val)) {
			packColorInput.value = val;
			colorPreviewChip.style.backgroundColor = val;
		}
	});
}

if (tierColorInput && tierColorHexInput && tierColorPreviewChip) {
	tierColorInput.addEventListener('input', (e) => {
		const val = e.target.value.toUpperCase();
		tierColorHexInput.value = val;
		tierColorPreviewChip.style.backgroundColor = val;
	});

	tierColorHexInput.addEventListener('input', (e) => {
		let val = e.target.value.trim();
		if (!val.startsWith('#')) {
			val = '#' + val;
		}
		if (/^#[0-9A-FA-F]{6}$/.test(val)) {
			tierColorInput.value = val;
			tierColorPreviewChip.style.backgroundColor = val;
		}
	});
}

if (packTierSelect) {
	packTierSelect.addEventListener('change', () => {
		const selectedTierId = packTierSelect.value;
		const tier = tiersList.find((t) => t.key === selectedTierId);
		if (tier && tier.color) {
			if (packColorInput) packColorInput.value = tier.color;
			if (packColorHexInput) packColorHexInput.value = tier.color.toUpperCase();
			if (colorPreviewChip) colorPreviewChip.style.backgroundColor = tier.color;
		}
	});
}

if (levelSearchInput) {
	levelSearchInput.addEventListener('input', filterLevelCheckboxes);
}

if (packForm) {
	packForm.addEventListener('submit', handlePackFormSubmit);
}

if (packCancelBtn) {
	packCancelBtn.addEventListener('click', resetPackForm);
}

if (tierForm) {
	tierForm.addEventListener('submit', handleTierFormSubmit);
}

if (tierCancelBtn) {
	tierCancelBtn.addEventListener('click', resetTierForm);
}

async function handleLogin(e) {
	e.preventDefault();
	if (!loginEmail || !loginPassword) return;

	const email = loginEmail.value.trim();
	const password = loginPassword.value;

	if (loginError) {
		loginError.classList.add('hide');
		loginError.textContent = '';
	}

	if (loginBtn) loginBtn.disabled = true;

	try {
		await signInWithEmailAndPassword(auth, email, password);
		loginForm.reset();
	} catch (err) {
		if (loginError) {
			loginError.textContent = err.message || 'Invalid email or password.';
			loginError.classList.remove('hide');
		}
	} finally {
		if (loginBtn) loginBtn.disabled = false;
	}
}

async function loadAdminData() {
	await Promise.all([loadLevels(), loadTiers(), loadPacks()]);
}

async function loadLevels() {
	if (!levelCheckboxesContainer) return;
	levelCheckboxesContainer.innerHTML = '<div class="loading-text">Loading levels...</div>';

	try {
		const levelsSnapshot = await get(query(ref(db, 'levels'), orderByChild('pos')));
		levelsList = [];
		levelsSnapshot.forEach((snap) => {
			const val = snap.val();
			if (val && val.name && typeof val.pos === 'number') {
				levelsList.push(val);
			}
		});

		// Sort by position ascending
		levelsList.sort((a, b) => a.pos - b.pos);
		renderLevelCheckboxes();
	} catch (err) {
		console.error('Failed to load levels:', err);
		levelCheckboxesContainer.innerHTML = '<div class="error-msg">Failed to load levels.</div>';
	}
}

function renderLevelCheckboxes() {
	if (!levelCheckboxesContainer) return;
	levelCheckboxesContainer.innerHTML = '';

	if (!levelsList.length) {
		levelCheckboxesContainer.innerHTML = '<div class="loading-text">No levels available.</div>';
		return;
	}

	levelsList.forEach((lvl) => {
		const label = document.createElement('label');
		label.className = 'level-checkbox-item';
		label.dataset.name = lvl.name.toLowerCase();

		const checkbox = document.createElement('input');
		checkbox.type = 'checkbox';
		checkbox.value = lvl.name;
		checkbox.className = 'pack-level-checkbox';
		checkbox.addEventListener('change', updateSelectedLevelsCount);

		const posSpan = document.createElement('span');
		posSpan.className = 'level-pos';
		setText(posSpan, `#${lvl.pos}`);

		const titleSpan = document.createElement('span');
		titleSpan.className = 'level-title';
		setText(titleSpan, lvl.name);

		label.append(checkbox, posSpan, titleSpan);
		levelCheckboxesContainer.append(label);
	});

	updateSelectedLevelsCount();
}

function filterLevelCheckboxes() {
	const queryStr = (levelSearchInput?.value || '').toLowerCase().trim();
	const items = levelCheckboxesContainer?.querySelectorAll('.level-checkbox-item');
	items?.forEach((item) => {
		const name = item.dataset.name || '';
		item.style.display = name.includes(queryStr) ? 'flex' : 'none';
	});
}

function updateSelectedLevelsCount() {
	if (!selectedLevelsCount || !levelCheckboxesContainer) return;
	const checked = levelCheckboxesContainer.querySelectorAll('.pack-level-checkbox:checked');
	setText(selectedLevelsCount, `${checked.length} level${checked.length === 1 ? '' : 's'} selected`);
}

function getSelectedLevelNames() {
	if (!levelCheckboxesContainer) return [];
	const checked = levelCheckboxesContainer.querySelectorAll('.pack-level-checkbox:checked');
	return Array.from(checked).map((cb) => cb.value);
}

function setSelectedLevelNames(names = []) {
	if (!levelCheckboxesContainer) return;
	const setNames = new Set(names.map((n) => normalizeKey(n)));
	const checkboxes = levelCheckboxesContainer.querySelectorAll('.pack-level-checkbox');
	checkboxes.forEach((cb) => {
		cb.checked = setNames.has(normalizeKey(cb.value));
	});
	updateSelectedLevelsCount();
}

function sanitizePackKey(name) {
	return String(name || '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '_');
}

async function handlePackFormSubmit(e) {
	e.preventDefault();

	const name = packNameInput?.value.trim();
	const tierId = packTierSelect?.value.trim() || null;
	const selectedTier = tiersList.find((t) => t.key === tierId);
	const color = selectedTier ? selectedTier.color : (packColorInput?.value || '#e2495c');
	const selectedLevels = getSelectedLevelNames();
	const existingId = packIdInput?.value.trim();

	const bonusPercentRaw = packBonusPercentInput?.value.trim();
	const bonusFlatRaw = packBonusFlatInput?.value.trim();

	const bonusPercent = bonusPercentRaw !== '' && bonusPercentRaw !== undefined && !isNaN(parseFloat(bonusPercentRaw))
		? parseFloat(bonusPercentRaw)
		: null;
	const bonusFlat = bonusFlatRaw !== '' && bonusFlatRaw !== undefined && !isNaN(parseFloat(bonusFlatRaw))
		? parseFloat(bonusFlatRaw)
		: null;

	if (!name) {
		alert('Please enter a pack name.');
		return;
	}

	if (!selectedLevels.length) {
		alert('Please select at least one level to include in this pack.');
		return;
	}

	if (packSubmitBtn) packSubmitBtn.disabled = true;

	try {
		const packKey = existingId || sanitizePackKey(name);
		const existingPack = packsList.find((p) => p.key === packKey);
		const pos = existingPack && typeof existingPack.pos === 'number'
			? existingPack.pos
			: packsList.length + 1;

		const packData = {
			id: packKey,
			name,
			tierId: tierId || null,
			color,
			bonusPercent: bonusPercent !== null ? bonusPercent : null,
			bonusFlat: bonusFlat !== null ? bonusFlat : null,
			levels: selectedLevels,
			pos,
			updatedAt: Date.now(),
		};

		await set(ref(db, `packs/${packKey}`), packData);

		resetPackForm();
		await loadPacks();
	} catch (err) {
		console.error('Failed to save level pack:', err);
		alert('Error saving level pack: ' + err.message);
	} finally {
		if (packSubmitBtn) packSubmitBtn.disabled = false;
	}
}

function resetPackForm() {
	if (packForm) packForm.reset();
	if (packIdInput) packIdInput.value = '';
	if (packFormTitle) setText(packFormTitle, 'Create Level Pack');
	if (packSubmitBtn) setText(packSubmitBtn, 'Create Pack');
	if (packCancelBtn) packCancelBtn.classList.add('hide');
	if (packTierSelect) packTierSelect.value = '';
	if (packColorInput) packColorInput.value = '#e2495c';
	if (packColorHexInput) packColorHexInput.value = '#E2495C';
	if (colorPreviewChip) colorPreviewChip.style.backgroundColor = '#e2495c';
	if (packBonusPercentInput) packBonusPercentInput.value = '';
	if (packBonusFlatInput) packBonusFlatInput.value = '';
	if (levelSearchInput) levelSearchInput.value = '';

	setSelectedLevelNames([]);
	filterLevelCheckboxes();
}

async function loadTiers() {
	if (!tiersListContainer) return;
	tiersListContainer.innerHTML = '<div class="loading-text">Loading tiers...</div>';

	try {
		const tiersSnapshot = await get(ref(db, 'tiers'));
		tiersList = [];
		tiersSnapshot.forEach((snap) => {
			const val = snap.val();
			if (val && val.name) {
				tiersList.push({
					key: snap.key,
					...val,
				});
			}
		});

		tiersList.sort(
			(a, b) =>
				(typeof a.pos === 'number' ? a.pos : 9999) -
				(typeof b.pos === 'number' ? b.pos : 9999),
		);

		populatePackTierSelect();
		renderTiersList();
	} catch (err) {
		console.error('Failed to load tiers:', err);
		tiersListContainer.innerHTML = '<div class="error-msg">Failed to load pack tiers.</div>';
	}
}

function populatePackTierSelect() {
	if (!packTierSelect) return;
	const currentVal = packTierSelect.value;
	packTierSelect.innerHTML = '<option value="">No Tier (Use Custom Color)</option>';

	tiersList.forEach((tier) => {
		const opt = document.createElement('option');
		opt.value = tier.key;
		setText(opt, tier.name);
		packTierSelect.append(opt);
	});

	packTierSelect.value = currentVal;
}

function renderTiersList() {
	if (!tiersListContainer) return;
	tiersListContainer.innerHTML = '';

	if (!tiersList.length) {
		tiersListContainer.innerHTML = '<div class="loading-text">No pack tiers created yet.</div>';
		return;
	}

	tiersList.forEach((tier, index) => {
		const item = document.createElement('div');
		item.className = 'pack-card-item';
		item.style.setProperty('--pack-color', tier.color || '#ffd700');

		const topRow = document.createElement('div');
		topRow.className = 'pack-item-top';

		const titleBadge = document.createElement('div');
		titleBadge.className = 'pack-title-badge';

		const colorDot = document.createElement('span');
		colorDot.className = 'pack-color-dot';
		colorDot.style.backgroundColor = tier.color || '#ffd700';

		const nameText = document.createElement('span');
		nameText.className = 'pack-name-text';
		setText(nameText, `#${index + 1} - ${tier.name}`);

		titleBadge.append(colorDot, nameText);

		const actions = document.createElement('div');
		actions.className = 'pack-item-actions';

		const orderControls = document.createElement('div');
		orderControls.className = 'pack-order-controls';

		if (index > 0) {
			const upBtn = document.createElement('button');
			upBtn.className = 'btn-order';
			upBtn.type = 'button';
			upBtn.setAttribute('aria-label', 'Move Tier Up');
			upBtn.innerHTML = '<i class="fa-solid fa-angle-up"></i>';
			upBtn.addEventListener('click', () => moveTier(index, -1));
			orderControls.append(upBtn);
		}

		if (index < tiersList.length - 1) {
			const downBtn = document.createElement('button');
			downBtn.className = 'btn-order';
			downBtn.type = 'button';
			downBtn.setAttribute('aria-label', 'Move Tier Down');
			downBtn.innerHTML = '<i class="fa-solid fa-angle-down"></i>';
			downBtn.addEventListener('click', () => moveTier(index, 1));
			orderControls.append(downBtn);
		}

		const editBtn = document.createElement('button');
		editBtn.className = 'btn-edit';
		editBtn.type = 'button';
		setText(editBtn, 'Edit');
		editBtn.addEventListener('click', () => editTier(tier));

		const deleteBtn = document.createElement('button');
		deleteBtn.className = 'btn-danger';
		deleteBtn.type = 'button';
		setText(deleteBtn, 'Delete');
		deleteBtn.addEventListener('click', () => deleteTier(tier));

		actions.append(orderControls, editBtn, deleteBtn);
		topRow.append(titleBadge, actions);
		item.append(topRow);
		tiersListContainer.append(item);
	});
}

async function moveTier(currentIndex, direction) {
	const targetIndex = currentIndex + direction;
	if (currentIndex < 0 || targetIndex < 0 || targetIndex >= tiersList.length) {
		return;
	}

	const currentTier = tiersList[currentIndex];
	const targetTier = tiersList[targetIndex];

	const currentPos = targetIndex + 1;
	const targetPos = currentIndex + 1;

	try {
		await Promise.all([
			update(ref(db, `tiers/${currentTier.key}`), { pos: currentPos }),
			update(ref(db, `tiers/${targetTier.key}`), { pos: targetPos }),
		]);
		await loadTiers();
		await loadPacks();
	} catch (err) {
		console.error('Failed to move tier:', err);
		alert('Failed to re-order tier: ' + err.message);
	}
}

async function handleTierFormSubmit(e) {
	e.preventDefault();

	const name = tierNameInput?.value.trim();
	const color = tierColorInput?.value || '#ffd700';
	const existingId = tierIdInput?.value.trim();

	if (!name) {
		alert('Please enter a tier name.');
		return;
	}

	if (tierSubmitBtn) tierSubmitBtn.disabled = true;

	try {
		const tierKey = existingId || sanitizePackKey(name);
		const existingTier = tiersList.find((t) => t.key === tierKey);
		const pos = existingTier && typeof existingTier.pos === 'number'
			? existingTier.pos
			: tiersList.length + 1;

		const tierData = {
			id: tierKey,
			name,
			color,
			pos,
			updatedAt: Date.now(),
		};

		await set(ref(db, `tiers/${tierKey}`), tierData);

		resetTierForm();
		await loadTiers();
		await loadPacks();
	} catch (err) {
		console.error('Failed to save tier:', err);
		alert('Error saving pack tier: ' + err.message);
	} finally {
		if (tierSubmitBtn) tierSubmitBtn.disabled = false;
	}
}

function resetTierForm() {
	if (tierForm) tierForm.reset();
	if (tierIdInput) tierIdInput.value = '';
	if (tierFormTitle) setText(tierFormTitle, 'Create Pack Tier');
	if (tierSubmitBtn) setText(tierSubmitBtn, 'Create Tier');
	if (tierCancelBtn) tierCancelBtn.classList.add('hide');
	if (tierColorInput) tierColorInput.value = '#ffd700';
	if (tierColorHexInput) tierColorHexInput.value = '#FFD700';
	if (tierColorPreviewChip) tierColorPreviewChip.style.backgroundColor = '#ffd700';
}

function editTier(tier) {
	if (!tier) return;
	if (tierIdInput) tierIdInput.value = tier.key || tier.id || '';
	if (tierNameInput) tierNameInput.value = tier.name || '';

	const color = tier.color || '#ffd700';
	if (tierColorInput) tierColorInput.value = color;
	if (tierColorHexInput) tierColorHexInput.value = color.toUpperCase();
	if (tierColorPreviewChip) tierColorPreviewChip.style.backgroundColor = color;

	if (tierFormTitle) setText(tierFormTitle, 'Edit Pack Tier');
	if (tierSubmitBtn) setText(tierSubmitBtn, 'Save Tier');
	if (tierCancelBtn) tierCancelBtn.classList.remove('hide');

	tierForm?.scrollIntoView({ behavior: 'smooth' });
}

async function deleteTier(tier) {
	if (!tier || !tier.key) return;
	if (!confirm(`Are you sure you want to delete pack tier "${tier.name}"?`)) {
		return;
	}

	try {
		await remove(ref(db, `tiers/${tier.key}`));
		await loadTiers();
		await loadPacks();
		if (tierIdInput?.value === tier.key) {
			resetTierForm();
		}
	} catch (err) {
		console.error('Failed to delete tier:', err);
		alert('Error deleting pack tier: ' + err.message);
	}
}

async function loadPacks() {
	if (!packsListContainer) return;
	packsListContainer.innerHTML = '<div class="loading-text">Loading packs...</div>';

	try {
		const packsSnapshot = await get(ref(db, 'packs'));
		packsList = [];
		packsSnapshot.forEach((snap) => {
			const val = snap.val();
			if (val && val.name) {
				const assignedTier = val.tierId ? tiersList.find((t) => t.key === val.tierId) : null;
				packsList.push({
					key: snap.key,
					...val,
					color: assignedTier ? assignedTier.color : (val.color || '#e2495c'),
					tierName: assignedTier ? assignedTier.name : null,
				});
			}
		});

		packsList.sort((a, b) => {
			const tierA = a.tierId ? tiersList.find((t) => t.key === a.tierId) : null;
			const tierB = b.tierId ? tiersList.find((t) => t.key === b.tierId) : null;

			const tierPosA = tierA && typeof tierA.pos === 'number' ? tierA.pos : Infinity;
			const tierPosB = tierB && typeof tierB.pos === 'number' ? tierB.pos : Infinity;

			if (tierPosA !== tierPosB) {
				return tierPosA - tierPosB;
			}

			const packPosA = typeof a.pos === 'number' ? a.pos : 9999;
			const packPosB = typeof b.pos === 'number' ? b.pos : 9999;
			return packPosA - packPosB;
		});

		renderPacksList();
	} catch (err) {
		console.error('Failed to load packs:', err);
		packsListContainer.innerHTML = '<div class="error-msg">Failed to load level packs.</div>';
	}
}

async function movePack(currentIndex, direction) {
	const targetIndex = currentIndex + direction;
	if (currentIndex < 0 || targetIndex < 0 || targetIndex >= packsList.length) {
		return;
	}

	const currentPack = packsList[currentIndex];
	const targetPack = packsList[targetIndex];

	const currentPos = targetIndex + 1;
	const targetPos = currentIndex + 1;

	try {
		await Promise.all([
			update(ref(db, `packs/${currentPack.key}`), { pos: currentPos }),
			update(ref(db, `packs/${targetPack.key}`), { pos: targetPos }),
		]);
		await loadPacks();
	} catch (err) {
		console.error('Failed to move pack:', err);
		alert('Failed to re-order level pack: ' + err.message);
	}
}

function renderPacksList() {
	if (!packsListContainer) return;
	packsListContainer.innerHTML = '';

	if (!packsList.length) {
		packsListContainer.innerHTML = '<div class="loading-text">No level packs created yet.</div>';
		return;
	}

	packsList.forEach((pack, index) => {
		const item = document.createElement('div');
		item.className = 'pack-card-item';
		item.style.setProperty('--pack-color', pack.color || '#e2495c');

		const topRow = document.createElement('div');
		topRow.className = 'pack-item-top';

		const titleBadge = document.createElement('div');
		titleBadge.className = 'pack-title-badge';

		const colorDot = document.createElement('span');
		colorDot.className = 'pack-color-dot';
		colorDot.style.backgroundColor = pack.color || '#e2495c';
		colorDot.style.color = pack.color || '#e2495c';

		const nameText = document.createElement('span');
		nameText.className = 'pack-name-text';
		const tierLabel = pack.tierName ? ` [${pack.tierName}]` : '';
		setText(nameText, `#${index + 1} - ${pack.name}${tierLabel}`);

		titleBadge.append(colorDot, nameText);

		const actions = document.createElement('div');
		actions.className = 'pack-item-actions';

		const orderControls = document.createElement('div');
		orderControls.className = 'pack-order-controls';

		if (index > 0) {
			const upBtn = document.createElement('button');
			upBtn.className = 'btn-order';
			upBtn.type = 'button';
			upBtn.setAttribute('aria-label', 'Move Pack Up');
			upBtn.innerHTML = '<i class="fa-solid fa-angle-up"></i>';
			upBtn.addEventListener('click', () => movePack(index, -1));
			orderControls.append(upBtn);
		}

		if (index < packsList.length - 1) {
			const downBtn = document.createElement('button');
			downBtn.className = 'btn-order';
			downBtn.type = 'button';
			downBtn.setAttribute('aria-label', 'Move Pack Down');
			downBtn.innerHTML = '<i class="fa-solid fa-angle-down"></i>';
			downBtn.addEventListener('click', () => movePack(index, 1));
			orderControls.append(downBtn);
		}

		const editBtn = document.createElement('button');
		editBtn.className = 'btn-edit';
		editBtn.type = 'button';
		setText(editBtn, 'Edit');
		editBtn.addEventListener('click', () => editPack(pack));

		const deleteBtn = document.createElement('button');
		deleteBtn.className = 'btn-danger';
		deleteBtn.type = 'button';
		setText(deleteBtn, 'Delete');
		deleteBtn.addEventListener('click', () => deletePack(pack));

		actions.append(orderControls, editBtn, deleteBtn);
		topRow.append(titleBadge, actions);

		const chipsRow = document.createElement('div');
		chipsRow.className = 'pack-levels-chips';

		const levels = Array.isArray(pack.levels) ? pack.levels : [];
		levels.forEach((lvlName) => {
			const chip = document.createElement('span');
			chip.className = 'level-chip';
			setText(chip, lvlName);
			chipsRow.append(chip);
		});

		item.append(topRow, chipsRow);
		packsListContainer.append(item);
	});
}

function editPack(pack) {
	if (!pack) return;
	if (packIdInput) packIdInput.value = pack.key || pack.id || '';
	if (packNameInput) packNameInput.value = pack.name || '';
	if (packTierSelect) packTierSelect.value = pack.tierId || '';

	const color = pack.color || '#e2495c';
	if (packColorInput) packColorInput.value = color;
	if (packColorHexInput) packColorHexInput.value = color.toUpperCase();
	if (colorPreviewChip) colorPreviewChip.style.backgroundColor = color;

	if (packBonusPercentInput) packBonusPercentInput.value = typeof pack.bonusPercent === 'number' ? pack.bonusPercent : '';
	if (packBonusFlatInput) packBonusFlatInput.value = typeof pack.bonusFlat === 'number' ? pack.bonusFlat : '';

	if (packFormTitle) setText(packFormTitle, 'Edit Level Pack');
	if (packSubmitBtn) setText(packSubmitBtn, 'Save Pack');
	if (packCancelBtn) packCancelBtn.classList.remove('hide');

	setSelectedLevelNames(pack.levels || []);

	// Scroll to form on mobile/small screens
	packForm?.scrollIntoView({ behavior: 'smooth' });
}

async function deletePack(pack) {
	if (!pack || !pack.key) return;
	if (!confirm(`Are you sure you want to delete level pack "${pack.name}"?`)) {
		return;
	}

	try {
		await remove(ref(db, `packs/${pack.key}`));
		await loadPacks();
		if (packIdInput?.value === pack.key) {
			resetPackForm();
		}
	} catch (err) {
		console.error('Failed to delete pack:', err);
		alert('Error deleting level pack: ' + err.message);
	}
}
