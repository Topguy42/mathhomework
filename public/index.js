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

	// Initialize with proxy tab active
	switchTab('proxy');
});
