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
const packColorInput = byId('pack-color');
const packColorHexInput = byId('pack-color-hex');
const colorPreviewChip = byId('color-preview-chip');
const levelSearchInput = byId('level-search-input');
const levelCheckboxesContainer = byId('level-checkboxes-container');
const selectedLevelsCount = byId('selected-levels-count');
const packSubmitBtn = byId('pack-submit-btn');
const packCancelBtn = byId('pack-cancel-btn');
const packsListContainer = byId('packs-list-container');

let levelsList = [];
let packsList = [];

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

if (levelSearchInput) {
	levelSearchInput.addEventListener('input', filterLevelCheckboxes);
}

if (packForm) {
	packForm.addEventListener('submit', handlePackFormSubmit);
}

if (packCancelBtn) {
	packCancelBtn.addEventListener('click', resetPackForm);
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
	await Promise.all([loadLevels(), loadPacks()]);
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
	const color = packColorInput?.value || '#e2495c';
	const selectedLevels = getSelectedLevelNames();
	const existingId = packIdInput?.value.trim();

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
			color,
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
	if (packColorInput) packColorInput.value = '#e2495c';
	if (packColorHexInput) packColorHexInput.value = '#E2495C';
	if (colorPreviewChip) colorPreviewChip.style.backgroundColor = '#e2495c';
	if (levelSearchInput) levelSearchInput.value = '';

	setSelectedLevelNames([]);
	filterLevelCheckboxes();
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
				packsList.push({
					key: snap.key,
					...val,
				});
			}
		});

		packsList.sort(
			(a, b) =>
				(typeof a.pos === 'number' ? a.pos : 9999) -
				(typeof b.pos === 'number' ? b.pos : 9999),
		);

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
		setText(nameText, `#${index + 1} - ${pack.name}`);

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

	const color = pack.color || '#e2495c';
	if (packColorInput) packColorInput.value = color;
	if (packColorHexInput) packColorHexInput.value = color.toUpperCase();
	if (colorPreviewChip) colorPreviewChip.style.backgroundColor = color;

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
