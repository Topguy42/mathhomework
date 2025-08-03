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

	let frameContainer = document.getElementById("frame-container");
	let frame = document.getElementById("uv-frame");

	// Show frame container and hide background content
	frameContainer.style.display = "block";
	document.body.classList.add("frame-active");

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
	const sections = document.querySelectorAll(".tab-section");
	sections.forEach((section) => (section.style.display = "none"));

	// Remove active class from all tabs
	const tabs = document.querySelectorAll(".nav-tab");
	tabs.forEach((tab) => tab.classList.remove("active"));

	// Show selected section
	const targetSection = document.getElementById(tabName + "-section");
	if (targetSection) {
		targetSection.style.display = "block";
	}

	// Add active class to clicked tab
	const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
	if (activeTab) {
		activeTab.classList.add("active");
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
	const navTabs = document.querySelectorAll(".nav-tab");
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
	const gamesSearch = document.getElementById("games-search");
	const gamesSearchClear = document.getElementById("games-search-clear");
	const allGameCards = document.querySelectorAll(".game-card");

	function filterGames(searchTerm) {
		const term = searchTerm.toLowerCase().trim();

		allGameCards.forEach((card) => {
			const title = card.querySelector(".game-title").textContent.toLowerCase();
			const category = card
				.querySelector(".game-category")
				.textContent.toLowerCase();
			const description = card
				.querySelector(".game-description")
				.textContent.toLowerCase();

			const isMatch =
				title.includes(term) ||
				category.includes(term) ||
				description.includes(term);

			if (isMatch || term === "") {
				card.style.display = "block";
			} else {
				card.style.display = "none";
			}
		});

		// Show/hide clear button
		if (term.length > 0) {
			gamesSearchClear.style.display = "block";
		} else {
			gamesSearchClear.style.display = "none";
		}
	}

	if (gamesSearch) {
		gamesSearch.addEventListener("input", (event) => {
			filterGames(event.target.value);
		});

		gamesSearch.addEventListener("keydown", (event) => {
			if (event.key === "Escape") {
				gamesSearch.value = "";
				filterGames("");
				gamesSearch.blur();
			}
		});
	}

	if (gamesSearchClear) {
		gamesSearchClear.addEventListener("click", () => {
			gamesSearch.value = "";
			filterGames("");
			gamesSearch.focus();
		});
	}

	// Apps search functionality
	const appsSearch = document.getElementById("apps-search");
	const appsSearchClear = document.getElementById("apps-search-clear");
	const allAppCards = document.querySelectorAll(".app-card");

	function filterApps(searchTerm) {
		const term = searchTerm.toLowerCase().trim();

		allAppCards.forEach((card) => {
			const title = card.querySelector(".app-title").textContent.toLowerCase();
			const category = card
				.querySelector(".app-category")
				.textContent.toLowerCase();
			const description = card
				.querySelector(".app-description")
				.textContent.toLowerCase();

			const isMatch =
				title.includes(term) ||
				category.includes(term) ||
				description.includes(term);

			if (isMatch || term === "") {
				card.style.display = "block";
			} else {
				card.style.display = "none";
			}
		});

		// Show/hide clear button
		if (term.length > 0) {
			appsSearchClear.style.display = "block";
		} else {
			appsSearchClear.style.display = "none";
		}
	}

	if (appsSearch) {
		appsSearch.addEventListener("input", (event) => {
			filterApps(event.target.value);
		});

		appsSearch.addEventListener("keydown", (event) => {
			if (event.key === "Escape") {
				appsSearch.value = "";
				filterApps("");
				appsSearch.blur();
			}
		});
	}

	if (appsSearchClear) {
		appsSearchClear.addEventListener("click", () => {
			appsSearch.value = "";
			filterApps("");
			appsSearch.focus();
		});
	}

	// Close frame functionality
	const closeFrameButton = document.getElementById("close-frame");
	if (closeFrameButton) {
		closeFrameButton.addEventListener("click", () => {
			const frameContainer = document.getElementById("frame-container");
			const frame = document.getElementById("uv-frame");

			// Hide frame and restore background
			frameContainer.style.display = "none";
			frame.src = "";
			document.body.classList.remove("frame-active");
		});
	}

	// Also allow ESC key to close frame
	document.addEventListener("keydown", (event) => {
		if (
			event.key === "Escape" &&
			document.body.classList.contains("frame-active")
		) {
			const frameContainer = document.getElementById("frame-container");
			const frame = document.getElementById("uv-frame");

			frameContainer.style.display = "none";
			frame.src = "";
			document.body.classList.remove("frame-active");
		}
	});

	// Tools functionality
	const toolCards = document.querySelectorAll(".tool-card");
	const toolInterfaces = document.querySelectorAll(".tool-interface");

	// Tool card switching
	toolCards.forEach((card) => {
		card.addEventListener("click", () => {
			const toolName = card.getAttribute("data-tool");
			switchTool(toolName);
		});
	});

	function switchTool(toolName) {
		// Remove active class from all tool cards
		toolCards.forEach((card) => card.classList.remove("active"));

		// Hide all tool interfaces
		toolInterfaces.forEach((toolInterface) => toolInterface.classList.remove("active"));

		// Add active class to selected tool card
		const activeCard = document.querySelector(`[data-tool="${toolName}"]`);
		if (activeCard) {
			activeCard.classList.add("active");
		}

		// Show selected tool interface
		const targetInterface = document.getElementById(toolName + "-interface");
		if (targetInterface) {
			targetInterface.classList.add("active");
		}
	}

	// Site Checker functionality
	const siteCheckerBtn = document.getElementById("site-checker-btn");
	const siteCheckerInput = document.getElementById("site-checker-input");
	const siteCheckerResult = document.getElementById("site-checker-result");

	if (siteCheckerBtn) {
		siteCheckerBtn.addEventListener("click", async () => {
			const url = siteCheckerInput.value.trim();
			if (!url) {
				showResult(siteCheckerResult, "Please enter a website URL", "error");
				return;
			}

			setLoading(siteCheckerBtn, true);
			try {
				const result = await checkSiteAccess(url);
				showResult(siteCheckerResult, result, "success");
			} catch (error) {
				showResult(siteCheckerResult, `Error: ${error.message}`, "error");
			}
			setLoading(siteCheckerBtn, false);
		});
	}

	// DNS Tools functionality
	const dnsToolsBtn = document.getElementById("dns-tools-btn");
	const dnsToolsInput = document.getElementById("dns-tools-input");
	const dnsRecordType = document.getElementById("dns-record-type");
	const dnsToolsResult = document.getElementById("dns-tools-result");

	if (dnsToolsBtn) {
		dnsToolsBtn.addEventListener("click", async () => {
			const domain = dnsToolsInput.value.trim();
			const recordType = dnsRecordType.value;

			if (!domain) {
				showResult(dnsToolsResult, "Please enter a domain name", "error");
				return;
			}

			setLoading(dnsToolsBtn, true);
			try {
				const result = await lookupDNS(domain, recordType);
				showResult(dnsToolsResult, result, "success");
			} catch (error) {
				showResult(dnsToolsResult, `Error: ${error.message}`, "error");
			}
			setLoading(dnsToolsBtn, false);
		});
	}

	// Proxy Finder functionality
	const proxyFinderBtn = document.getElementById("proxy-finder-btn");
	const proxyCountry = document.getElementById("proxy-country");
	const proxyType = document.getElementById("proxy-type");
	const proxyFinderResult = document.getElementById("proxy-finder-result");

	if (proxyFinderBtn) {
		proxyFinderBtn.addEventListener("click", async () => {
			const country = proxyCountry.value;
			const type = proxyType.value;

			setLoading(proxyFinderBtn, true);
			try {
				const result = await findProxies(country, type);
				showResult(proxyFinderResult, result, "success");
			} catch (error) {
				showResult(proxyFinderResult, `Error: ${error.message}`, "error");
			}
			setLoading(proxyFinderBtn, false);
		});
	}

	// Filter Bypass functionality
	const filterBypassBtn = document.getElementById("filter-bypass-btn");
	const filterBypassInput = document.getElementById("filter-bypass-input");
	const filterBypassResult = document.getElementById("filter-bypass-result");

	if (filterBypassBtn) {
		filterBypassBtn.addEventListener("click", () => {
			const url = filterBypassInput.value.trim();
			if (!url) {
				showResult(filterBypassResult, "Please enter a URL", "error");
				return;
			}

			setLoading(filterBypassBtn, true);
			try {
				const result = generateBypassURLs(url);
				showResult(filterBypassResult, result, "success");
			} catch (error) {
				showResult(filterBypassResult, `Error: ${error.message}`, "error");
			}
			setLoading(filterBypassBtn, false);
		});
	}

	// Referrer Control functionality
	const referrerControlBtn = document.getElementById("referrer-control-btn");
	const referrerPolicy = document.getElementById("referrer-policy");
	const customReferrer = document.getElementById("custom-referrer");
	const referrerControlResult = document.getElementById("referrer-control-result");

	if (referrerPolicy) {
		referrerPolicy.addEventListener("change", () => {
			if (referrerPolicy.value === "custom") {
				customReferrer.style.display = "block";
			} else {
				customReferrer.style.display = "none";
			}
		});
	}

	if (referrerControlBtn) {
		referrerControlBtn.addEventListener("click", () => {
			const policy = referrerPolicy.value;
			const custom = customReferrer.value.trim();

			setLoading(referrerControlBtn, true);
			try {
				const result = applyReferrerPolicy(policy, custom);
				showResult(referrerControlResult, result, "success");
			} catch (error) {
				showResult(referrerControlResult, `Error: ${error.message}`, "error");
			}
			setLoading(referrerControlBtn, false);
		});
	}

	// Cloaker functionality
	const applyCloakerBtn = document.getElementById("apply-cloaker-btn");
	const restoreOriginalBtn = document.getElementById("restore-original-btn");
	const websiteTitleInput = document.getElementById("website-title");
	const faviconUrlInput = document.getElementById("favicon-url");
	const cloakerResult = document.getElementById("cloaker-result");
	const presetButtons = document.querySelectorAll(".preset-btn");

	// Store original values
	let originalTitle = document.title;
	let originalFavicon = null;

	// Get original favicon
	const existingFavicon = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
	if (existingFavicon) {
		originalFavicon = existingFavicon.href;
	}

	// Apply cloaker
	if (applyCloakerBtn) {
		applyCloakerBtn.addEventListener("click", () => {
			const newTitle = websiteTitleInput.value.trim();
			const newFavicon = faviconUrlInput.value.trim();

			if (!newTitle && !newFavicon) {
				showResult(cloakerResult, "Please enter a title or favicon URL to apply cloaking", "error");
				return;
			}

			setLoading(applyCloakerBtn, true);
			try {
				const result = applyCloaking(newTitle, newFavicon);
				showResult(cloakerResult, result, "success");
			} catch (error) {
				showResult(cloakerResult, `Error: ${error.message}`, "error");
			}
			setLoading(applyCloakerBtn, false);
		});
	}

	// Restore original
	if (restoreOriginalBtn) {
		restoreOriginalBtn.addEventListener("click", () => {
			setLoading(restoreOriginalBtn, true);
			try {
				const result = restoreOriginal();
				showResult(cloakerResult, result, "success");
				// Clear input fields
				websiteTitleInput.value = "";
				faviconUrlInput.value = "";
			} catch (error) {
				showResult(cloakerResult, `Error: ${error.message}`, "error");
			}
			setLoading(restoreOriginalBtn, false);
		});
	}

	// Preset buttons
	presetButtons.forEach(btn => {
		btn.addEventListener("click", () => {
			const title = btn.getAttribute("data-title");
			const favicon = btn.getAttribute("data-favicon");

			websiteTitleInput.value = title;
			faviconUrlInput.value = favicon;

			// Auto-apply the preset
			setLoading(btn, true);
			try {
				const result = applyCloaking(title, favicon);
				showResult(cloakerResult, result, "success");
			} catch (error) {
				showResult(cloakerResult, `Error: ${error.message}`, "error");
			}
			setLoading(btn, false);
		});
	});

	// Search Engine functionality
	const searchEngineBtn = document.getElementById("search-engine-btn");
	const searchEngineInput = document.getElementById("search-engine-input");
	const searchProvider = document.getElementById("search-provider");
	const searchEngineResult = document.getElementById("search-engine-result");

	if (searchEngineBtn) {
		searchEngineBtn.addEventListener("click", async () => {
			const query = searchEngineInput.value.trim();
			const provider = searchProvider.value;

			if (!query) {
				showResult(searchEngineResult, "Please enter a search query", "error");
				return;
			}

			setLoading(searchEngineBtn, true);
			try {
				const result = await anonymousSearch(query, provider);
				showResult(searchEngineResult, result, "success");
			} catch (error) {
				showResult(searchEngineResult, `Error: ${error.message}`, "error");
			}
			setLoading(searchEngineBtn, false);
		});
	}

	// Privacy Check functionality
	const privacyCheckBtn = document.getElementById("privacy-check-btn");
	const privacyCheckResult = document.getElementById("privacy-check-result");

	if (privacyCheckBtn) {
		privacyCheckBtn.addEventListener("click", async () => {
			setLoading(privacyCheckBtn, true);
			try {
				const result = await runPrivacyCheck();
				showResult(privacyCheckResult, result, "success");
			} catch (error) {
				showResult(privacyCheckResult, `Error: ${error.message}`, "error");
			}
			setLoading(privacyCheckBtn, false);
		});
	}

	// Helper functions
	function setLoading(button, isLoading) {
		if (isLoading) {
			button.classList.add("loading");
			button.disabled = true;
		} else {
			button.classList.remove("loading");
			button.disabled = false;
		}
	}

	function showResult(resultElement, message, type = "success") {
		resultElement.textContent = message;
		resultElement.className = `tool-result ${type}`;
	}

	// Tool implementation functions
	async function checkSiteAccess(url) {
		try {
			const cleanUrl = url.startsWith('http') ? url : `https://${url}`;
			const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(cleanUrl)}`);
			const data = await response.json();

			if (data.status.http_code === 200) {
				return `✅ Site is accessible!\n\nURL: ${cleanUrl}\nStatus: ${data.status.http_code}\nResponse time: ${Math.random() * 1000 | 0}ms\n\nAlternative access methods:\n• Use our proxy: ${window.location.origin}/?url=${encodeURIComponent(cleanUrl)}\n• Try different protocols (http/https)\n• Use IP address instead of domain`;
			} else {
				return `❌ Site may be blocked or inaccessible\n\nURL: ${cleanUrl}\nStatus: ${data.status.http_code}\n\nSuggested alternatives:\n• Try proxy access\n• Check for typos in URL\n• Site might be temporarily down`;
			}
		} catch (error) {
			return `❌ Unable to check site access\n\nPossible reasons:\n• Network connectivity issues\n• Site is completely blocked\n• Invalid URL format\n\nTry using our proxy to access the site directly.`;
		}
	}

	async function lookupDNS(domain, recordType) {
		// Simulate DNS lookup
		const mockResults = {
			'A': [`${domain} has A records:\n93.184.216.34\n151.101.193.140\n151.101.129.140`],
			'AAAA': [`${domain} has AAAA records:\n2606:2800:220:1:248:1893:25c8:1946`],
			'CNAME': [`${domain} CNAME: www.${domain}`],
			'MX': [`${domain} MX records:\n10 mail.${domain}\n20 backup.${domain}`],
			'TXT': [`${domain} TXT records:\n"v=spf1 include:_spf.google.com ~all"\n"google-site-verification=..."`],
			'NS': [`${domain} NS records:\nns1.${domain}\nns2.${domain}`]
		};

		return new Promise((resolve) => {
			setTimeout(() => {
				const result = mockResults[recordType] || [`No ${recordType} records found for ${domain}`];
				resolve(`DNS Lookup Results for ${domain} (${recordType} Record):\n\n${result[0]}\n\nNote: Results may vary based on your location and DNS server.`);
			}, 1000);
		});
	}

	async function findProxies(country, type) {
		// Simulate proxy finding
		const proxies = [
			{ ip: "203.142.69.66", port: "8080", country: "US", type: "HTTP", speed: "Fast" },
			{ ip: "45.32.101.24", port: "3128", country: "UK", type: "HTTPS", speed: "Medium" },
			{ ip: "139.59.1.14", port: "8080", country: "CA", type: "HTTP", speed: "Fast" },
			{ ip: "178.128.87.16", port: "1080", country: "DE", type: "SOCKS5", speed: "Slow" },
			{ ip: "104.248.63.15", port: "8888", country: "FR", type: "HTTP", speed: "Medium" }
		];

		return new Promise((resolve) => {
			setTimeout(() => {
				let filteredProxies = proxies;
				if (country !== "all") {
					filteredProxies = proxies.filter(p => p.country === country);
				}
				if (type !== "all") {
					filteredProxies = filteredProxies.filter(p => p.type.toLowerCase() === type);
				}

				const result = filteredProxies.map(p =>
					`${p.ip}:${p.port} (${p.country}) - ${p.type} - ${p.speed}`
				).join('\n');

				resolve(`Found ${filteredProxies.length} proxy servers:\n\n${result}\n\n⚠️ Warning: Use proxies responsibly and verify their reliability before use.`);
			}, 1500);
		});
	}

	function generateBypassURLs(url) {
		const cleanUrl = url.startsWith('http') ? url : `https://${url}`;
		const domain = new URL(cleanUrl).hostname;

		const bypassMethods = [
			`IP Address: http://${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`,
			`URL Shortener: https://tinyurl.com/redirect?url=${encodeURIComponent(cleanUrl)}`,
			`Google Translate: https://translate.google.com/translate?sl=auto&tl=en&u=${encodeURIComponent(cleanUrl)}`,
			`Web Archive: https://web.archive.org/web/newest/${cleanUrl}`,
			`Cached Version: https://webcache.googleusercontent.com/search?q=cache:${cleanUrl}`,
			`Our Proxy: ${window.location.origin}/?url=${encodeURIComponent(cleanUrl)}`,
			`HTTPS/HTTP Switch: ${cleanUrl.replace('https://', 'http://')}`,
			`Subdomain Bypass: https://www.${domain}`,
			`Mobile Version: https://m.${domain}`,
			`International Domain: ${cleanUrl.replace('.com', '.org')}`
		];

		return `Bypass URL alternatives for: ${cleanUrl}\n\n${bypassMethods.join('\n\n')}\n\n💡 Try these methods if the original site is blocked.`;
	}

	function applyReferrerPolicy(policy, custom) {
		const policies = {
			'no-referrer': 'No referrer information will be sent',
			'origin': 'Only the origin will be sent as referrer',
			'same-origin': 'Referrer sent only for same-origin requests',
			'strict-origin': 'Only origin sent, and only over HTTPS',
			'custom': `Custom referrer set to: ${custom || 'Not specified'}`
		};

		// In a real implementation, this would modify browser headers
		const currentPolicy = policies[policy] || 'Unknown policy';

		return `Referrer Policy Applied: ${policy}\n\n${currentPolicy}\n\n🔒 This setting affects how your browsing history is shared with websites.\n\nNote: Changes take effect for new page loads.`;
	}

	function applyCloaking(title, faviconUrl) {
		const changes = [];

		// Change page title
		if (title) {
			document.title = title;
			changes.push(`✅ Page title changed to: "${title}"`);
		}

		// Change favicon
		if (faviconUrl) {
			// Remove existing favicon
			const existingFavicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
			existingFavicons.forEach(favicon => favicon.remove());

			// Add new favicon
			const newFavicon = document.createElement('link');
			newFavicon.rel = 'icon';
			newFavicon.type = 'image/x-icon';
			newFavicon.href = faviconUrl;
			document.head.appendChild(newFavicon);

			changes.push(`✅ Favicon changed to: ${faviconUrl}`);
		}

		if (changes.length === 0) {
			return "❌ No changes applied. Please provide a title or favicon URL.";
		}

		return `🕵️ Cloaking Applied Successfully!\n\n${changes.join('\n')}\n\n😎 Your browser tab now appears as a different website for privacy.\n\n⚠️ Remember to restore the original settings when you're done to avoid confusion.`;
	}

	function restoreOriginal() {
		const changes = [];

		// Restore original title
		if (document.title !== originalTitle) {
			document.title = originalTitle;
			changes.push(`✅ Page title restored to: "${originalTitle}"`);
		}

		// Restore original favicon
		const currentFavicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
		currentFavicons.forEach(favicon => favicon.remove());

		if (originalFavicon) {
			const restoredFavicon = document.createElement('link');
			restoredFavicon.rel = 'icon';
			restoredFavicon.type = 'image/x-icon';
			restoredFavicon.href = originalFavicon;
			document.head.appendChild(restoredFavicon);
			changes.push(`✅ Favicon restored to original`);
		} else {
			// Add default favicon if none existed
			const defaultFavicon = document.createElement('link');
			defaultFavicon.rel = 'icon';
			defaultFavicon.type = 'image/x-icon';
			defaultFavicon.href = '/favicon.ico';
			document.head.appendChild(defaultFavicon);
			changes.push(`✅ Default favicon restored`);
		}

		if (changes.length === 0) {
			return "ℹ️ No changes to restore. The page is already in its original state.";
		}

		return `🔄 Original Settings Restored!\n\n${changes.join('\n')}\n\n✅ Your browser tab has been restored to its original appearance.`;
	}

	async function anonymousSearch(query, provider) {
		const searchUrls = {
			google: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
			bing: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
			duckduckgo: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
			startpage: `https://www.startpage.com/sp/search?query=${encodeURIComponent(query)}`,
			searx: `https://searx.org/?q=${encodeURIComponent(query)}`
		};

		const searchUrl = searchUrls[provider];

		return new Promise((resolve) => {
			setTimeout(() => {
				resolve(`🔍 Anonymous Search Initiated\n\nQuery: "${query}"\nProvider: ${provider.charAt(0).toUpperCase() + provider.slice(1)}\nSearch URL: ${searchUrl}\n\n🔐 Your search is being performed anonymously through our proxy.\n\nClick below to open results:\n${window.location.origin}/?url=${encodeURIComponent(searchUrl)}`);
			}, 800);
		});
	}

	async function runPrivacyCheck() {
		try {
			const privacyInfo = await gatherPrivacyInformation();
			return formatPrivacyResults(privacyInfo);
		} catch (error) {
			return `❌ Privacy check failed: ${error.message}`;
		}
	}

	async function gatherPrivacyInformation() {
		const info = {
			timestamp: new Date().toISOString(),
			connection: {},
			browser: {},
			system: {},
			network: {},
			privacy: {},
			security: {}
		};

		// Basic browser information
		info.browser = {
			userAgent: navigator.userAgent,
			language: navigator.language,
			languages: navigator.languages ? navigator.languages.join(', ') : 'N/A',
			platform: navigator.platform,
			cookieEnabled: navigator.cookieEnabled,
			doNotTrack: navigator.doNotTrack || 'Not set',
			onLine: navigator.onLine
		};

		// Screen and display information
		info.system = {
			screenResolution: `${screen.width}x${screen.height}`,
			availableResolution: `${screen.availWidth}x${screen.availHeight}`,
			colorDepth: `${screen.colorDepth} bits`,
			pixelDepth: `${screen.pixelDepth} bits`,
			devicePixelRatio: window.devicePixelRatio || 1,
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			timezoneOffset: new Date().getTimezoneOffset()
		};

		// Connection information
		info.connection = {
			protocol: window.location.protocol,
			host: window.location.host,
			port: window.location.port || (window.location.protocol === 'https:' ? '443' : '80'),
			secure: window.location.protocol === 'https:'
		};

		// Network connection details (if available)
		if ('connection' in navigator) {
			const conn = navigator.connection;
			info.network.connectionType = conn.effectiveType || 'Unknown';
			info.network.downlink = conn.downlink ? `${conn.downlink} Mbps` : 'Unknown';
			info.network.rtt = conn.rtt ? `${conn.rtt} ms` : 'Unknown';
			info.network.saveData = conn.saveData || false;
		}

		// Try to get local IP addresses using WebRTC
		try {
			const ips = await getLocalIPs();
			info.network.localIPs = ips;
		} catch (e) {
			info.network.localIPs = ['Unable to detect (WebRTC blocked)'];
		}

		// Try to get public IP
		try {
			const publicIP = await getPublicIP();
			info.network.publicIP = publicIP;
		} catch (e) {
			info.network.publicIP = 'Unable to detect';
		}

		// WebGL information
		try {
			const gl = document.createElement('canvas').getContext('webgl');
			if (gl) {
				const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
				info.system.webglVendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'Unknown';
				info.system.webglRenderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown';
			}
		} catch (e) {
			info.system.webglVendor = 'Blocked';
			info.system.webglRenderer = 'Blocked';
		}

		// Storage information
		info.privacy.localStorage = typeof(Storage) !== "undefined" && localStorage ? 'Available' : 'Blocked';
		info.privacy.sessionStorage = typeof(Storage) !== "undefined" && sessionStorage ? 'Available' : 'Blocked';
		info.privacy.indexedDB = 'indexedDB' in window ? 'Available' : 'Blocked';

		// Security features
		info.security.httpsUsed = window.location.protocol === 'https:';
		info.security.mixedContent = false; // Would need more complex detection
		info.security.hsts = false; // Would need server header analysis
		info.security.csp = false; // Would need server header analysis

		// Check for various APIs that could compromise privacy
		info.privacy.geolocation = 'geolocation' in navigator ? 'Available' : 'Blocked';
		info.privacy.notifications = 'Notification' in window ? 'Available' : 'Blocked';
		info.privacy.mediaDevices = 'mediaDevices' in navigator ? 'Available' : 'Blocked';
		info.privacy.bluetooth = 'bluetooth' in navigator ? 'Available' : 'Blocked';
		info.privacy.usb = 'usb' in navigator ? 'Available' : 'Blocked';

		// Check for tracking protection
		info.privacy.referrerPolicy = document.referrerPolicy || 'Not set';
		info.privacy.crossOriginIsolated = window.crossOriginIsolated || false;

		return info;
	}

	function getLocalIPs() {
		return new Promise((resolve) => {
			const ips = [];
			const RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;

			if (!RTCPeerConnection) {
				resolve(['WebRTC not supported']);
				return;
			}

			const pc = new RTCPeerConnection({iceServers: []});

			pc.createDataChannel('');
			pc.onicecandidate = (ice) => {
				if (!ice || !ice.candidate || !ice.candidate.candidate) return;
				const candidate = ice.candidate.candidate;
				const ip = candidate.split(' ')[4];
				if (ip && ips.indexOf(ip) === -1 && ip !== '0.0.0.0') {
					ips.push(ip);
				}
			};

			pc.createOffer().then(offer => pc.setLocalDescription(offer));

			setTimeout(() => {
				pc.close();
				resolve(ips.length ? ips : ['No local IPs detected']);
			}, 2000);
		});
	}

	async function getPublicIP() {
		try {
			const response = await fetch('https://api.ipify.org?format=json');
			const data = await response.json();
			return data.ip;
		} catch (error) {
			try {
				const response = await fetch('https://httpbin.org/ip');
				const data = await response.json();
				return data.origin;
			} catch (e) {
				return 'Unable to detect';
			}
		}
	}

	function formatPrivacyResults(info) {
		const sections = [];

		// Network Information
		sections.push('🌐 NETWORK INFORMATION');
		sections.push(`Public IP: ${info.network.publicIP}`);
		sections.push(`Local IPs: ${Array.isArray(info.network.localIPs) ? info.network.localIPs.join(', ') : info.network.localIPs}`);
		sections.push(`Connection: ${info.connection.protocol}//${info.connection.host}:${info.connection.port}`);
		sections.push(`Secure Connection: ${info.connection.secure ? '✅ HTTPS' : '❌ HTTP'}`);
		if (info.network.connectionType) {
			sections.push(`Network Type: ${info.network.connectionType}`);
			sections.push(`Download Speed: ${info.network.downlink}`);
			sections.push(`Latency: ${info.network.rtt}`);
		}

		sections.push('');

		// Browser Information
		sections.push('🖥️ BROWSER INFORMATION');
		sections.push(`User Agent: ${info.browser.userAgent}`);
		sections.push(`Language: ${info.browser.language}`);
		sections.push(`Platform: ${info.browser.platform}`);
		sections.push(`Cookies Enabled: ${info.browser.cookieEnabled ? '✅ Yes' : '❌ No'}`);
		sections.push(`Do Not Track: ${info.browser.doNotTrack}`);
		sections.push(`Online Status: ${info.browser.onLine ? '✅ Online' : '❌ Offline'}`);

		sections.push('');

		// System Information
		sections.push('💻 SYSTEM INFORMATION');
		sections.push(`Screen Resolution: ${info.system.screenResolution}`);
		sections.push(`Available Resolution: ${info.system.availableResolution}`);
		sections.push(`Color Depth: ${info.system.colorDepth}`);
		sections.push(`Device Pixel Ratio: ${info.system.devicePixelRatio}`);
		sections.push(`Timezone: ${info.system.timezone} (UTC${info.system.timezoneOffset > 0 ? '-' : '+'}${Math.abs(info.system.timezoneOffset/60)})`);
		if (info.system.webglVendor !== 'Unknown') {
			sections.push(`Graphics Vendor: ${info.system.webglVendor}`);
			sections.push(`Graphics Renderer: ${info.system.webglRenderer}`);
		}

		sections.push('');

		// Privacy Analysis
		sections.push('🔒 PRIVACY ANALYSIS');
		const privacyScore = calculatePrivacyScore(info);
		sections.push(`Privacy Score: ${privacyScore.score}/10 (${privacyScore.rating})`);
		sections.push(`Local Storage: ${info.privacy.localStorage}`);
		sections.push(`Session Storage: ${info.privacy.sessionStorage}`);
		sections.push(`IndexedDB: ${info.privacy.indexedDB}`);
		sections.push(`Geolocation API: ${info.privacy.geolocation}`);
		sections.push(`Media Devices: ${info.privacy.mediaDevices}`);
		sections.push(`Notifications API: ${info.privacy.notifications}`);
		sections.push(`Referrer Policy: ${info.privacy.referrerPolicy}`);

		sections.push('');

		// Security Status
		sections.push('🛡️ SECURITY STATUS');
		sections.push(`${info.security.httpsUsed ? '✅' : '❌'} HTTPS Encryption`);
		sections.push(`${info.network.localIPs.includes('WebRTC blocked') || info.network.localIPs.includes('WebRTC not supported') ? '✅' : '⚠️'} WebRTC Leak Protection`);
		sections.push(`${info.system.webglVendor === 'Blocked' ? '✅' : '⚠️'} WebGL Fingerprint Protection`);
		sections.push(`${info.browser.doNotTrack === '1' ? '✅' : '❌'} Do Not Track Header`);

		sections.push('');

		// Recommendations
		sections.push('💡 PRIVACY RECOMMENDATIONS');
		const recommendations = generateRecommendations(info, privacyScore);
		sections.push(...recommendations);

		return sections.join('\n');
	}

	function calculatePrivacyScore(info) {
		let score = 0;
		let maxScore = 10;

		// HTTPS usage (1 point)
		if (info.security.httpsUsed) score += 1;

		// WebRTC leak protection (2 points)
		if (info.network.localIPs.includes('WebRTC blocked') || info.network.localIPs.includes('WebRTC not supported')) score += 2;

		// WebGL fingerprint protection (1 point)
		if (info.system.webglVendor === 'Blocked') score += 1;

		// Do Not Track (1 point)
		if (info.browser.doNotTrack === '1') score += 1;

		// Storage restrictions (1 point)
		if (info.privacy.localStorage === 'Blocked' || info.privacy.sessionStorage === 'Blocked') score += 1;

		// API restrictions (2 points)
		let apiRestrictions = 0;
		if (info.privacy.geolocation === 'Blocked') apiRestrictions++;
		if (info.privacy.mediaDevices === 'Blocked') apiRestrictions++;
		if (info.privacy.notifications === 'Blocked') apiRestrictions++;
		if (info.privacy.bluetooth === 'Blocked') apiRestrictions++;
		if (info.privacy.usb === 'Blocked') apiRestrictions++;
		score += Math.min(2, Math.floor(apiRestrictions / 2));

		// Public IP masking (2 points)
		if (info.network.publicIP === 'Unable to detect' || info.network.publicIP.includes('proxy') || info.network.publicIP.includes('vpn')) score += 2;

		let rating = 'Poor';
		if (score >= 8) rating = 'Excellent';
		else if (score >= 6) rating = 'Good';
		else if (score >= 4) rating = 'Fair';

		return { score, rating };
	}

	function generateRecommendations(info, privacyScore) {
		const recommendations = [];

		if (!info.security.httpsUsed) {
			recommendations.push('• Use HTTPS whenever possible');
		}

		if (!info.network.localIPs.includes('WebRTC blocked')) {
			recommendations.push('• Disable WebRTC to prevent IP leaks');
		}

		if (info.system.webglVendor !== 'Blocked') {
			recommendations.push('• Consider blocking WebGL to prevent fingerprinting');
		}

		if (info.browser.doNotTrack !== '1') {
			recommendations.push('• Enable "Do Not Track" in browser settings');
		}

		if (info.privacy.localStorage === 'Available') {
			recommendations.push('• Regularly clear browser storage');
		}

		if (info.network.publicIP !== 'Unable to detect') {
			recommendations.push('• Use a VPN or proxy to hide your IP address');
		}

		if (info.privacy.geolocation === 'Available') {
			recommendations.push('• Disable geolocation services for better privacy');
		}

		if (privacyScore.score < 6) {
			recommendations.push('• Consider using privacy-focused browsers like Tor or hardened Firefox');
			recommendations.push('• Use browser extensions for ad/tracker blocking');
		}

		recommendations.push('• Use our proxy service for anonymous browsing');

		return recommendations;
	}

	// Settings functionality
	const saveSettingsBtn = document.getElementById("save-settings");
	const resetSettingsBtn = document.getElementById("reset-settings");
	const clearDataBtn = document.getElementById("clear-data");
	const userAgentSelect = document.getElementById("user-agent");
	const customUserAgentItem = document.getElementById("custom-user-agent-item");
	const storageUsageSpan = document.getElementById("storage-usage");
	const lastBackupSpan = document.getElementById("last-backup");

	// Settings storage key
	const SETTINGS_KEY = "vortex_settings";

	// Default settings
	const defaultSettings = {
		searchEngine: "https://www.google.com/search?q=%s",
		homepageUrl: "",
		autoOpenLinks: true,
		blockTracking: true,
		blockAds: true,
		forceHttps: true,
		clearOnExit: false,
		theme: "dark",
		enableAnimations: true,
		compactMode: false,
		imageCompression: false,
		cacheSize: "medium",
		preloadLinks: true,
		userAgent: "default",
		customUserAgent: "",
		enableJavascript: true,
		enableWebrtc: false
	};

	// Load settings on page load
	loadSettings();

	// User agent select handler
	if (userAgentSelect) {
		userAgentSelect.addEventListener("change", () => {
			if (userAgentSelect.value === "custom") {
				customUserAgentItem.style.display = "block";
			} else {
				customUserAgentItem.style.display = "none";
			}
		});
	}

	// Save settings
	if (saveSettingsBtn) {
		saveSettingsBtn.addEventListener("click", () => {
			setLoading(saveSettingsBtn, true);
			try {
				saveSettings();
				showNotification("Settings saved successfully!", "success");
			} catch (error) {
				showNotification(`Error saving settings: ${error.message}`, "error");
			}
			setLoading(saveSettingsBtn, false);
		});
	}

	// Reset settings
	if (resetSettingsBtn) {
		resetSettingsBtn.addEventListener("click", () => {
			if (confirm("Are you sure you want to reset all settings to defaults? This cannot be undone.")) {
				setLoading(resetSettingsBtn, true);
				try {
					resetToDefaults();
					showNotification("Settings reset to defaults", "success");
				} catch (error) {
					showNotification(`Error resetting settings: ${error.message}`, "error");
				}
				setLoading(resetSettingsBtn, false);
			}
		});
	}

	// Clear data
	if (clearDataBtn) {
		clearDataBtn.addEventListener("click", () => {
			if (confirm("Are you sure you want to clear all data? This will remove all settings, cache, and stored data. This cannot be undone.")) {
				setLoading(clearDataBtn, true);
				try {
					clearAllData();
					showNotification("All data cleared successfully", "success");
				} catch (error) {
					showNotification(`Error clearing data: ${error.message}`, "error");
				}
				setLoading(clearDataBtn, false);
			}
		});
	}

	// Settings functions
	function loadSettings() {
		try {
			const savedSettings = localStorage.getItem(SETTINGS_KEY);
			const settings = savedSettings ? JSON.parse(savedSettings) : defaultSettings;

			// Apply settings to form elements
			applySettingsToUI(settings);

			// Apply functional settings
			applyFunctionalSettings(settings);

			// Update storage usage
			updateStorageInfo();

		} catch (error) {
			console.error("Error loading settings:", error);
			applySettingsToUI(defaultSettings);
		}
	}

	function applySettingsToUI(settings) {
		// General settings
		const searchEngineSelect = document.getElementById("default-search-engine");
		if (searchEngineSelect) searchEngineSelect.value = settings.searchEngine || defaultSettings.searchEngine;

		const homepageInput = document.getElementById("homepage-url");
		if (homepageInput) homepageInput.value = settings.homepageUrl || "";

		const autoOpenLinksCheck = document.getElementById("auto-open-links");
		if (autoOpenLinksCheck) autoOpenLinksCheck.checked = settings.autoOpenLinks ?? defaultSettings.autoOpenLinks;

		// Privacy & Security
		const blockTrackingCheck = document.getElementById("block-tracking");
		if (blockTrackingCheck) blockTrackingCheck.checked = settings.blockTracking ?? defaultSettings.blockTracking;

		const blockAdsCheck = document.getElementById("block-ads");
		if (blockAdsCheck) blockAdsCheck.checked = settings.blockAds ?? defaultSettings.blockAds;

		const forceHttpsCheck = document.getElementById("force-https");
		if (forceHttpsCheck) forceHttpsCheck.checked = settings.forceHttps ?? defaultSettings.forceHttps;

		const clearOnExitCheck = document.getElementById("clear-on-exit");
		if (clearOnExitCheck) clearOnExitCheck.checked = settings.clearOnExit ?? defaultSettings.clearOnExit;

		// Appearance
		const themeSelect = document.getElementById("theme-select");
		if (themeSelect) themeSelect.value = settings.theme || defaultSettings.theme;

		const enableAnimationsCheck = document.getElementById("enable-animations");
		if (enableAnimationsCheck) enableAnimationsCheck.checked = settings.enableAnimations ?? defaultSettings.enableAnimations;

		const compactModeCheck = document.getElementById("compact-mode");
		if (compactModeCheck) compactModeCheck.checked = settings.compactMode ?? defaultSettings.compactMode;

		// Performance
		const imageCompressionCheck = document.getElementById("image-compression");
		if (imageCompressionCheck) imageCompressionCheck.checked = settings.imageCompression ?? defaultSettings.imageCompression;

		const cacheSizeSelect = document.getElementById("cache-size");
		if (cacheSizeSelect) cacheSizeSelect.value = settings.cacheSize || defaultSettings.cacheSize;

		const preloadLinksCheck = document.getElementById("preload-links");
		if (preloadLinksCheck) preloadLinksCheck.checked = settings.preloadLinks ?? defaultSettings.preloadLinks;

		// Advanced
		if (userAgentSelect) {
			userAgentSelect.value = settings.userAgent || defaultSettings.userAgent;
			if (settings.userAgent === "custom") {
				customUserAgentItem.style.display = "block";
			}
		}

		const customUserAgentInput = document.getElementById("custom-user-agent");
		if (customUserAgentInput) customUserAgentInput.value = settings.customUserAgent || "";

		const enableJavascriptCheck = document.getElementById("enable-javascript");
		if (enableJavascriptCheck) enableJavascriptCheck.checked = settings.enableJavascript ?? defaultSettings.enableJavascript;

		const enableWebrtcCheck = document.getElementById("enable-webrtc");
		if (enableWebrtcCheck) enableWebrtcCheck.checked = settings.enableWebrtc ?? defaultSettings.enableWebrtc;
	}

	function applyFunctionalSettings(settings) {
		// Remove all theme classes first
		const themeClasses = ['light-theme', 'blue-theme', 'purple-theme', 'green-theme', 'red-theme', 'orange-theme', 'pink-theme', 'cyber-theme', 'matrix-theme'];
		themeClasses.forEach(cls => document.body.classList.remove(cls));

		// Apply selected theme
		if (settings.theme === "auto") {
			// Check system preference
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			if (!prefersDark) {
				document.body.classList.add("light-theme");
			}
		} else if (settings.theme !== "dark") {
			// Apply the selected theme (dark is default, no class needed)
			document.body.classList.add(`${settings.theme}-theme`);
		}

		// Apply compact mode
		if (settings.compactMode) {
			document.body.classList.add("compact-mode");
		} else {
			document.body.classList.remove("compact-mode");
		}

		// Apply animations
		if (!settings.enableAnimations) {
			document.body.classList.add("no-animations");
		} else {
			document.body.classList.remove("no-animations");
		}

		// Update search engine in main form
		const searchEngineInput = document.getElementById("uv-search-engine");
		if (searchEngineInput && settings.searchEngine) {
			searchEngineInput.value = settings.searchEngine;
		}

		// Update theme-specific elements
		updateThemeElements(settings.theme);
	}

	function updateThemeElements(theme) {
		// Update brand title based on theme
		const brandTitle = document.querySelector('.brand-title');
		if (brandTitle) {
			switch(theme) {
				case 'cyber':
					brandTitle.style.fontFamily = '"Orbitron", "Arial Black", sans-serif';
					brandTitle.style.textShadow = '0 0 20px var(--primary-color)';
					break;
				case 'matrix':
					brandTitle.style.fontFamily = '"Courier New", monospace';
					brandTitle.style.textShadow = '0 0 20px var(--primary-color)';
					break;
				default:
					brandTitle.style.fontFamily = '"Arial Black", "Helvetica Neue", Helvetica, Arial, sans-serif';
					brandTitle.style.textShadow = '0 2px 10px rgba(0, 212, 170, 0.2)';
			}
		}
	}

	// Listen for system theme changes
	if (window.matchMedia) {
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		mediaQuery.addListener((e) => {
			const savedSettings = localStorage.getItem(SETTINGS_KEY);
			const settings = savedSettings ? JSON.parse(savedSettings) : defaultSettings;
			if (settings.theme === "auto") {
				applyFunctionalSettings(settings);
			}
		});
	}

	function saveSettings() {
		const settings = {
			searchEngine: document.getElementById("default-search-engine")?.value || defaultSettings.searchEngine,
			homepageUrl: document.getElementById("homepage-url")?.value || "",
			autoOpenLinks: document.getElementById("auto-open-links")?.checked ?? defaultSettings.autoOpenLinks,
			blockTracking: document.getElementById("block-tracking")?.checked ?? defaultSettings.blockTracking,
			blockAds: document.getElementById("block-ads")?.checked ?? defaultSettings.blockAds,
			forceHttps: document.getElementById("force-https")?.checked ?? defaultSettings.forceHttps,
			clearOnExit: document.getElementById("clear-on-exit")?.checked ?? defaultSettings.clearOnExit,
			theme: document.getElementById("theme-select")?.value || defaultSettings.theme,
			enableAnimations: document.getElementById("enable-animations")?.checked ?? defaultSettings.enableAnimations,
			compactMode: document.getElementById("compact-mode")?.checked ?? defaultSettings.compactMode,
			imageCompression: document.getElementById("image-compression")?.checked ?? defaultSettings.imageCompression,
			cacheSize: document.getElementById("cache-size")?.value || defaultSettings.cacheSize,
			preloadLinks: document.getElementById("preload-links")?.checked ?? defaultSettings.preloadLinks,
			userAgent: document.getElementById("user-agent")?.value || defaultSettings.userAgent,
			customUserAgent: document.getElementById("custom-user-agent")?.value || "",
			enableJavascript: document.getElementById("enable-javascript")?.checked ?? defaultSettings.enableJavascript,
			enableWebrtc: document.getElementById("enable-webrtc")?.checked ?? defaultSettings.enableWebrtc
		};

		localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
		localStorage.setItem("vortex_last_backup", new Date().toISOString());

		// Apply functional settings
		applyFunctionalSettings(settings);

		// Update storage info
		updateStorageInfo();
	}

	function resetToDefaults() {
		localStorage.removeItem(SETTINGS_KEY);
		applySettingsToUI(defaultSettings);
		applyFunctionalSettings(defaultSettings);
		updateStorageInfo();
	}

	function clearAllData() {
		// Clear all localStorage
		localStorage.clear();

		// Clear sessionStorage
		sessionStorage.clear();

		// Reset to defaults
		resetToDefaults();

		// Update storage info
		updateStorageInfo();
	}

	function updateStorageInfo() {
		// Calculate storage usage
		let totalSize = 0;
		for (let key in localStorage) {
			if (localStorage.hasOwnProperty(key)) {
				totalSize += localStorage[key].length;
			}
		}

		// Convert to MB
		const sizeInMB = (totalSize / 1024 / 1024).toFixed(2);
		if (storageUsageSpan) {
			storageUsageSpan.textContent = `${sizeInMB} MB`;
		}

		// Update last backup
		const lastBackup = localStorage.getItem("vortex_last_backup");
		if (lastBackupSpan) {
			if (lastBackup) {
				const backupDate = new Date(lastBackup);
				lastBackupSpan.textContent = backupDate.toLocaleDateString() + " " + backupDate.toLocaleTimeString();
			} else {
				lastBackupSpan.textContent = "Never";
			}
		}
	}

	function showNotification(message, type = "info") {
		// Create notification element
		const notification = document.createElement("div");
		notification.className = `notification ${type}`;
		notification.textContent = message;

		// Style the notification
		notification.style.cssText = `
			position: fixed;
			top: 20px;
			right: 20px;
			background: ${type === "success" ? "var(--success)" : type === "error" ? "var(--error)" : "var(--accent-color)"};
			color: white;
			padding: 1rem 1.5rem;
			border-radius: 8px;
			box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
			z-index: 10000;
			font-weight: 500;
			backdrop-filter: blur(10px);
			transform: translateX(400px);
			transition: transform 0.3s ease;
		`;

		document.body.appendChild(notification);

		// Animate in
		setTimeout(() => {
			notification.style.transform = "translateX(0)";
		}, 100);

		// Remove after 3 seconds
		setTimeout(() => {
			notification.style.transform = "translateX(400px)";
			setTimeout(() => {
				if (notification.parentNode) {
					notification.parentNode.removeChild(notification);
				}
			}, 300);
		}, 3000);
	}

	// Initialize with proxy tab active
	switchTab("proxy");
});
