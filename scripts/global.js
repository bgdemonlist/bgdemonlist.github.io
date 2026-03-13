import { byId } from './app-common.js';

const logo = byId('logo');

if (logo) {
	logo.addEventListener('click', () => {
		location.href = 'index.html';
	});
}
