"use strict";
/**
 * @type {HTMLFormElement}
 */
const form = document.getElementById("uv-form");
/**
 * @type {HTMLInputElement}
 */
const address = document.getElementById("uv-address");
/**
 * @type {HTMLInputElement}
 */
const searchEngine = document.getElementById("uv-search-engine");
/**
 * @type {HTMLParagraphElement}
 */
const error = document.getElementById("uv-error");
/**
 * @type {HTMLPreElement}
 */
const errorCode = document.getElementById("uv-error-code");
const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

async function loadUrl(url) {
	try {
		await registerSW();
	} catch (err) {
		error.textContent = "Failed to register service worker.";
		errorCode.textContent = err.toString();
		throw err;
	}

	let frame = document.getElementById("uv-frame");
	frame.style.display = "block";
	let wispUrl =
		(location.protocol === "https:" ? "wss" : "ws") +
		"://" +
		location.host +
		"/wisp/";
	if ((await connection.getTransport()) !== "/epoxy/index.mjs") {
		await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
	}
	frame.src = __uv$config.prefix + __uv$config.encodeUrl(url);
}

form.addEventListener("submit", async (event) => {
	event.preventDefault();
	const url = search(address.value, searchEngine.value);
	await loadUrl(url);
});

// Tab switching functionality
function switchTab(tabName) {
	// Hide all sections
	const sections = document.querySelectorAll('.tab-section');
	sections.forEach(section => section.style.display = 'none');

	// Remove active class from all tabs
	const tabs = document.querySelectorAll('.nav-tab');
	tabs.forEach(tab => tab.classList.remove('active'));

	// Show selected section
	const targetSection = document.getElementById(tabName + '-section');
	if (targetSection) {
		targetSection.style.display = 'block';
	}

	// Add active class to clicked tab
	const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
	if (activeTab) {
		activeTab.classList.add('active');
	}
}

// Quick Access functionality
document.addEventListener("DOMContentLoaded", () => {
	const quickAccessItems = document.querySelectorAll(".quick-access-item");
	const gameItems = document.querySelectorAll(".game-item");

	quickAccessItems.forEach((item) => {
		item.addEventListener("click", async (event) => {
			event.preventDefault();
			const url = item.getAttribute("data-url");
			if (url) {
				await loadUrl(url);
			}
		});
	});

	// Game cards functionality
	const gameCards = document.querySelectorAll(".game-card");
	gameCards.forEach((card) => {
		card.addEventListener("click", async (event) => {
			event.preventDefault();
			const url = card.getAttribute("data-url");
			if (url) {
				await loadUrl(url);
			}
		});
	});

	// Play button functionality
	const playButtons = document.querySelectorAll(".play-button");
	playButtons.forEach((button) => {
		button.addEventListener("click", async (event) => {
			event.preventDefault();
			event.stopPropagation();
			const card = button.closest(".game-card");
			const url = card.getAttribute("data-url");
			if (url) {
				await loadUrl(url);
			}
		});
	});

	// Tab navigation
	const navTabs = document.querySelectorAll('.nav-tab');
	navTabs.forEach((tab) => {
		tab.addEventListener("click", (event) => {
			event.preventDefault();
			const tabName = tab.getAttribute("data-tab");
			if (tabName) {
				switchTab(tabName);
			}
		});
	});

	// App cards functionality
	const appCards = document.querySelectorAll(".app-card");
	appCards.forEach((card) => {
		card.addEventListener("click", async (event) => {
			event.preventDefault();
			const url = card.getAttribute("data-url");
			if (url) {
				await loadUrl(url);
			}
		});
	});

	// Launch button functionality
	const launchButtons = document.querySelectorAll(".launch-button");
	launchButtons.forEach((button) => {
		button.addEventListener("click", async (event) => {
			event.preventDefault();
			event.stopPropagation();
			const card = button.closest(".app-card");
			const url = card.getAttribute("data-url");
			if (url) {
				await loadUrl(url);
			}
		});
	});

	// Games search functionality
	const gamesSearch = document.getElementById('games-search');
	const gamesSearchClear = document.getElementById('games-search-clear');
	const allGameCards = document.querySelectorAll('.game-card');

	function filterGames(searchTerm) {
		const term = searchTerm.toLowerCase().trim();

		allGameCards.forEach(card => {
			const title = card.querySelector('.game-title').textContent.toLowerCase();
			const category = card.querySelector('.game-category').textContent.toLowerCase();
			const description = card.querySelector('.game-description').textContent.toLowerCase();

			const isMatch = title.includes(term) ||
							category.includes(term) ||
							description.includes(term);

			if (isMatch || term === '') {
				card.style.display = 'block';
			} else {
				card.style.display = 'none';
			}
		});

		// Show/hide clear button
		if (term.length > 0) {
			gamesSearchClear.style.display = 'block';
		} else {
			gamesSearchClear.style.display = 'none';
		}
	}

	if (gamesSearch) {
		gamesSearch.addEventListener('input', (event) => {
			filterGames(event.target.value);
		});

		gamesSearch.addEventListener('keydown', (event) => {
			if (event.key === 'Escape') {
				gamesSearch.value = '';
				filterGames('');
				gamesSearch.blur();
			}
		});
	}

	if (gamesSearchClear) {
		gamesSearchClear.addEventListener('click', () => {
			gamesSearch.value = '';
			filterGames('');
			gamesSearch.focus();
		});
	}

	// Apps search functionality
	const appsSearch = document.getElementById('apps-search');
	const appsSearchClear = document.getElementById('apps-search-clear');
	const allAppCards = document.querySelectorAll('.app-card');

	function filterApps(searchTerm) {
		const term = searchTerm.toLowerCase().trim();

		allAppCards.forEach(card => {
			const title = card.querySelector('.app-title').textContent.toLowerCase();
			const category = card.querySelector('.app-category').textContent.toLowerCase();
			const description = card.querySelector('.app-description').textContent.toLowerCase();

			const isMatch = title.includes(term) ||
							category.includes(term) ||
							description.includes(term);

			if (isMatch || term === '') {
				card.style.display = 'block';
			} else {
				card.style.display = 'none';
			}
		});

		// Show/hide clear button
		if (term.length > 0) {
			appsSearchClear.style.display = 'block';
		} else {
			appsSearchClear.style.display = 'none';
		}
	}

	if (appsSearch) {
		appsSearch.addEventListener('input', (event) => {
			filterApps(event.target.value);
		});

		appsSearch.addEventListener('keydown', (event) => {
			if (event.key === 'Escape') {
				appsSearch.value = '';
				filterApps('');
				appsSearch.blur();
			}
		});
	}

	if (appsSearchClear) {
		appsSearchClear.addEventListener('click', () => {
			appsSearch.value = '';
			filterApps('');
			appsSearch.focus();
		});
	}

	// Initialize with proxy tab active
	switchTab('proxy');
});
