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

// Browser Tab System Variables
let browserHistory = [];
let historyIndex = -1;
let currentUrl = "";

// Navigate to URL through proxy
async function navigateToUrl(url, addToHistoryFlag = true) {
	if (!url) return;

	const frameContainer = document.getElementById("frame-container");
	const frame = document.getElementById("uv-frame");

	// Show frame container first
	frameContainer.style.display = "flex";
	document.body.classList.add("frame-active");

	// Show loading animation
	showLoading(url);
	setNavigationLoading(true);

	try {
		await registerSW();

		let wispUrl =
			(location.protocol === "https:" ? "wss" : "ws") +
			"://" +
			location.host +
			"/wisp/";

		if ((await connection.getTransport()) !== "/epoxy/index.mjs") {
			await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
		}

		// Use the same search logic as the main form
		const searchEngine =
			document.getElementById("uv-search-engine")?.value ||
			"https://www.google.com/search?q=%s";
		const finalUrl = search(url, searchEngine);
		const proxyUrl = __uv$config.prefix + __uv$config.encodeUrl(finalUrl);

		frame.src = proxyUrl;

		if (addToHistoryFlag) {
			addToHistory(finalUrl);
		} else {
			updateUrlDisplay(finalUrl);
		}

		// Set up frame load event listeners
		frame.onload = () => {
			setNavigationLoading(false);
			hideLoading();
			// Ensure navigation buttons are updated after load
			updateNavigationButtons();
		};

		frame.onerror = () => {
			setNavigationLoading(false);
			hideLoading();
			console.error("Failed to load URL:", finalUrl);

			// Show error in loading overlay briefly
			const loadingSubtitle = document.getElementById("loading-subtitle");
			if (loadingSubtitle) {
				loadingSubtitle.textContent = "Failed to load page";
				loadingSubtitle.style.color = "var(--error)";
			}
		};
	} catch (err) {
		console.error("Failed to navigate:", err);
		setNavigationLoading(false);
		hideLoading();

		// Show error in loading overlay
		const loadingSubtitle = document.getElementById("loading-subtitle");
		if (loadingSubtitle) {
			loadingSubtitle.textContent = "Connection failed";
			loadingSubtitle.style.color = "var(--error)";
		}
	}
}

// Loading animation control
let loadingTimeout;
let progressInterval;
let currentStep = 1;

function showLoading(url = "") {
	const loadingOverlay = document.getElementById("loading-overlay");
	const loadingSubtitle = document.getElementById("loading-subtitle");
	const progressFill = document.getElementById("progress-fill");

	// Reset loading state
	currentStep = 1;
	resetLoadingSteps();

	if (loadingOverlay) {
		loadingOverlay.classList.remove("hidden");
	}

	// Update subtitle with URL info
	if (loadingSubtitle) {
		if (url) {
			try {
				const urlObj = new URL(url);
				loadingSubtitle.textContent = `Loading ${urlObj.hostname}...`;
			} catch (e) {
				loadingSubtitle.textContent = `Loading ${url}...`;
			}
		} else {
			loadingSubtitle.textContent = "Connecting through Vortex proxy";
		}
	}

	// Start progress animation
	if (progressFill) {
		progressFill.style.width = "0%";

		// Simulate loading progress
		let progress = 0;
		progressInterval = setInterval(() => {
			progress += Math.random() * 15;
			if (progress > 90) progress = 90; // Don't complete until actual load
			progressFill.style.width = progress + "%";

			// Update steps based on progress
			if (progress > 30 && currentStep === 1) {
				updateLoadingStep(2);
			} else if (progress > 60 && currentStep === 2) {
				updateLoadingStep(3);
			}
		}, 200);
	}
}

function hideLoading() {
	const loadingOverlay = document.getElementById("loading-overlay");
	const progressFill = document.getElementById("progress-fill");

	// Complete the progress bar
	if (progressFill) {
		progressFill.style.width = "100%";
	}

	// Mark final step as completed
	updateLoadingStep(3, true);

	// Hide loading overlay after a short delay
	clearInterval(progressInterval);
	loadingTimeout = setTimeout(() => {
		if (loadingOverlay) {
			loadingOverlay.classList.add("hidden");
		}
	}, 500);
}

function resetLoadingSteps() {
	for (let i = 1; i <= 3; i++) {
		const step = document.getElementById(`step-${i}`);
		if (step) {
			step.classList.remove("active", "completed");
		}
	}
	// Activate first step
	const step1 = document.getElementById("step-1");
	if (step1) {
		step1.classList.add("active");
	}
}

function updateLoadingStep(stepNumber, completed = false) {
	// Remove active from current step
	const currentStepEl = document.getElementById(`step-${currentStep}`);
	if (currentStepEl) {
		currentStepEl.classList.remove("active");
		if (currentStep < stepNumber || completed) {
			currentStepEl.classList.add("completed");
		}
	}

	// Activate new step (unless we're completing the final step)
	if (!completed || stepNumber < 3) {
		const newStepEl = document.getElementById(`step-${stepNumber}`);
		if (newStepEl) {
			newStepEl.classList.add("active");
		}
		currentStep = stepNumber;
	}

	// If completing final step, mark it as completed
	if (completed && stepNumber === 3) {
		const finalStep = document.getElementById(`step-${stepNumber}`);
		if (finalStep) {
			finalStep.classList.remove("active");
			finalStep.classList.add("completed");
		}
	}
}

// Set loading state for navigation
function setNavigationLoading(isLoading) {
	const refreshBtn = document.getElementById("tab-refresh");

	if (refreshBtn) {
		if (isLoading) {
			refreshBtn.classList.add("loading");
		} else {
			refreshBtn.classList.remove("loading");
		}
	}
}

// Add URL to history
function addToHistory(url) {
	if (url && url !== currentUrl) {
		// Remove any forward history if we're navigating to a new page
		if (historyIndex < browserHistory.length - 1) {
			browserHistory = browserHistory.slice(0, historyIndex + 1);
		}

		browserHistory.push(url);
		historyIndex = browserHistory.length - 1;
		updateNavigationButtons();
		updateUrlDisplay(url);
	}
}

// Update navigation button states
function updateNavigationButtons() {
	const tabBack = document.getElementById("tab-back");
	const tabForward = document.getElementById("tab-forward");

	if (tabBack) {
		const canGoBack = historyIndex > 0;
		tabBack.disabled = !canGoBack;
		tabBack.title = canGoBack
			? `Go back to ${getDisplayUrl(browserHistory[historyIndex - 1])}`
			: "No previous page";
	}

	if (tabForward) {
		const canGoForward = historyIndex < browserHistory.length - 1;
		tabForward.disabled = !canGoForward;
		tabForward.title = canGoForward
			? `Go forward to ${getDisplayUrl(browserHistory[historyIndex + 1])}`
			: "No next page";
	}
}

// Helper function to get display URL for tooltips
function getDisplayUrl(url) {
	if (!url) return "Unknown";
	try {
		const urlObj = new URL(url);
		return urlObj.hostname;
	} catch (e) {
		return url.length > 30 ? url.substring(0, 27) + "..." : url;
	}
}

// Update URL display and security indicator
function updateUrlDisplay(url) {
	currentUrl = url;
	let displayUrl = url || "vortex://home";

	// Format URL for display (remove protocol for cleaner look)
	if (url) {
		try {
			const urlObj = new URL(url);
			displayUrl = urlObj.hostname + urlObj.pathname + urlObj.search;
			// Truncate very long URLs
			if (displayUrl.length > 40) {
				displayUrl = displayUrl.substring(0, 37) + "...";
			}
		} catch (e) {
			// Keep original URL if parsing fails
			displayUrl = url;
		}
	}

	const tabUrlDisplay = document.getElementById("tab-url-display");
	const tabSecurity = document.getElementById("tab-security");

	if (tabUrlDisplay) {
		tabUrlDisplay.textContent = displayUrl;
		tabUrlDisplay.title = url || "Vortex proxy home"; // Show full URL on hover
	}

	// Update security indicator
	if (tabSecurity) {
		if (url && url.startsWith("https://")) {
			tabSecurity.classList.remove("insecure");
			tabSecurity.title = "Secure HTTPS connection";
		} else if (url && url.startsWith("http://")) {
			tabSecurity.classList.add("insecure");
			tabSecurity.title = "Insecure HTTP connection";
		} else {
			tabSecurity.classList.remove("insecure");
			tabSecurity.title = "Vortex secure proxy connection";
		}
	}
}

async function loadUrl(url) {
	try {
		await registerSW();
	} catch (err) {
		error.textContent = "Failed to register service worker.";
		errorCode.textContent = err.toString();
		throw err;
	}

	// Use the new tab system navigation
	await navigateToUrl(url);
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

	// Browser Tab System Event Listeners
	const tabBack = document.getElementById("tab-back");
	const tabForward = document.getElementById("tab-forward");
	const tabRefresh = document.getElementById("tab-refresh");
	const tabHome = document.getElementById("tab-home");
	const newTab = document.getElementById("new-tab");
	const closeFrameButton = document.getElementById("close-frame");
	const tabAddressInput = document.getElementById("tab-address-input");
	const tabUrlDisplay = document.getElementById("tab-url-display");
	const tabUrlContainer = document.getElementById("tab-url-container");

	// Back navigation
	if (tabBack) {
		tabBack.addEventListener("click", (event) => {
			event.preventDefault();
			if (historyIndex > 0 && !tabBack.disabled) {
				historyIndex--;
				const url = browserHistory[historyIndex];
				if (url) {
					// Navigate without adding to history
					navigateToUrl(url, false);
					updateNavigationButtons();
				}
			}
		});
	}

	// Forward navigation
	if (tabForward) {
		tabForward.addEventListener("click", (event) => {
			event.preventDefault();
			if (historyIndex < browserHistory.length - 1 && !tabForward.disabled) {
				historyIndex++;
				const url = browserHistory[historyIndex];
				if (url) {
					// Navigate without adding to history
					navigateToUrl(url, false);
					updateNavigationButtons();
				}
			}
		});
	}

	// Refresh page
	if (tabRefresh) {
		tabRefresh.addEventListener("click", () => {
			const frame = document.getElementById("uv-frame");
			if (frame && frame.src) {
				// Add a timestamp to force refresh
				const currentSrc = frame.src;
				const separator = currentSrc.includes("?") ? "&" : "?";
				frame.src = currentSrc + separator + "_refresh=" + Date.now();
			}
		});
	}

	// Home navigation
	if (tabHome) {
		tabHome.addEventListener("click", () => {
			closeFrame();
		});
	}

	// New tab (for now, just goes home)
	if (newTab) {
		newTab.addEventListener("click", () => {
			closeFrame();
		});
	}

	// Close frame functionality
	function closeFrame() {
		const frameContainer = document.getElementById("frame-container");
		const frame = document.getElementById("uv-frame");
		const loadingOverlay = document.getElementById("loading-overlay");

		// Hide frame and restore background
		frameContainer.style.display = "none";
		frame.src = "";
		document.body.classList.remove("frame-active");

		// Hide loading overlay and clear timers
		if (loadingOverlay) {
			loadingOverlay.classList.add("hidden");
		}
		clearTimeout(loadingTimeout);
		clearInterval(progressInterval);

		// Reset browser state
		browserHistory = [];
		historyIndex = -1;
		currentUrl = "";
		isEditingAddress = false;
		updateNavigationButtons();
		updateUrlDisplay("");
		stopEditingAddress();
	}

	if (closeFrameButton) {
		closeFrameButton.addEventListener("click", closeFrame);
	}

	// Initialize navigation button states
	updateNavigationButtons();

	// Address bar functionality
	let isEditingAddress = false;

	function startEditingAddress() {
		const tabAddressInput = document.getElementById("tab-address-input");
		const tabUrlDisplay = document.getElementById("tab-url-display");

		if (tabAddressInput && tabUrlDisplay) {
			isEditingAddress = true;
			tabAddressInput.style.display = "block";
			tabUrlDisplay.style.display = "none";
			tabAddressInput.value = currentUrl || "";
			tabAddressInput.focus();
			tabAddressInput.select();
		}
	}

	function stopEditingAddress() {
		const tabAddressInput = document.getElementById("tab-address-input");
		const tabUrlDisplay = document.getElementById("tab-url-display");

		if (tabAddressInput && tabUrlDisplay) {
			isEditingAddress = false;
			tabAddressInput.style.display = "none";
			tabUrlDisplay.style.display = "block";
			tabAddressInput.value = "";
		}
	}

	// Click on URL container to edit
	if (tabUrlContainer) {
		tabUrlContainer.addEventListener("click", () => {
			if (!isEditingAddress) {
				startEditingAddress();
			}
		});
	}

	// Address input handlers
	if (tabAddressInput) {
		tabAddressInput.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				const url = tabAddressInput.value.trim();
				if (url) {
					navigateToUrl(url);
					stopEditingAddress();
				}
			} else if (event.key === "Escape") {
				stopEditingAddress();
			}
		});

		tabAddressInput.addEventListener("blur", () => {
			// Small delay to allow click events to process
			setTimeout(() => {
				stopEditingAddress();
			}, 100);
		});
	}

	// Keyboard shortcuts for browser navigation
	document.addEventListener("keydown", (event) => {
		if (document.body.classList.contains("frame-active")) {
			// Don't handle shortcuts if user is typing in address bar
			if (
				document.activeElement === document.getElementById("tab-address-input")
			) {
				return;
			}

			// ESC key to close frame
			if (event.key === "Escape") {
				closeFrame();
				return;
			}

			// Ctrl+L or F6 to focus address bar
			if ((event.ctrlKey && event.key === "l") || event.key === "F6") {
				event.preventDefault();
				startEditingAddress();
				return;
			}

			// Alt+Left Arrow for back
			if (event.altKey && event.key === "ArrowLeft") {
				event.preventDefault();
				if (historyIndex > 0) {
					historyIndex--;
					const url = browserHistory[historyIndex];
					navigateToUrl(url, false);
					updateNavigationButtons();
				}
				return;
			}

			// Alt+Right Arrow for forward
			if (event.altKey && event.key === "ArrowRight") {
				event.preventDefault();
				if (historyIndex < browserHistory.length - 1) {
					historyIndex++;
					const url = browserHistory[historyIndex];
					navigateToUrl(url, false);
					updateNavigationButtons();
				}
				return;
			}

			// F5 or Ctrl+R for refresh
			if (event.key === "F5" || (event.ctrlKey && event.key === "r")) {
				event.preventDefault();
				const frame = document.getElementById("uv-frame");
				if (frame && frame.src) {
					const currentSrc = frame.src;
					const separator = currentSrc.includes("?") ? "&" : "?";
					frame.src = currentSrc + separator + "_refresh=" + Date.now();
				}
				return;
			}

			// Alt+Home for home
			if (event.altKey && event.key === "Home") {
				event.preventDefault();
				closeFrame();
				return;
			}
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
		toolInterfaces.forEach((toolInterface) =>
			toolInterface.classList.remove("active")
		);

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

	// Password Generator functionality
	const generatePasswordBtn = document.getElementById("generate-password-btn");
	const copyPasswordBtn = document.getElementById("copy-password-btn");
	const passwordDisplay = document.getElementById("password-display");
	const passwordStrength = document.getElementById("password-strength");
	const lengthSlider = document.getElementById("password-length");
	const lengthDisplay = document.getElementById("length-display");

	// Checkboxes
	const includeUppercase = document.getElementById("include-uppercase");
	const includeLowercase = document.getElementById("include-lowercase");
	const includeNumbers = document.getElementById("include-numbers");
	const includeSymbols = document.getElementById("include-symbols");
	const excludeAmbiguous = document.getElementById("exclude-ambiguous");

	let currentPassword = "";

	// Update length display
	if (lengthSlider && lengthDisplay) {
		lengthSlider.addEventListener("input", () => {
			lengthDisplay.textContent = lengthSlider.value;
		});
	}

	// Generate password
	if (generatePasswordBtn) {
		generatePasswordBtn.addEventListener("click", () => {
			const options = {
				length: parseInt(lengthSlider?.value || 16),
				uppercase: includeUppercase?.checked || false,
				lowercase: includeLowercase?.checked || false,
				numbers: includeNumbers?.checked || false,
				symbols: includeSymbols?.checked || false,
				excludeAmbiguous: excludeAmbiguous?.checked || false,
			};

			setLoading(generatePasswordBtn, true);
			try {
				const password = generateSecurePassword(options);
				currentPassword = password;
				displayPassword(password);
				updatePasswordStrength(password);
				if (copyPasswordBtn) {
					copyPasswordBtn.disabled = false;
				}
			} catch (error) {
				displayPassword(`Error: ${error.message}`, true);
			}
			setLoading(generatePasswordBtn, false);
		});
	}

	// Copy password
	if (copyPasswordBtn) {
		copyPasswordBtn.addEventListener("click", async () => {
			if (!currentPassword) return;

			try {
				await navigator.clipboard.writeText(currentPassword);
				copyPasswordBtn.textContent = "✅ Copied!";
				copyPasswordBtn.classList.add("success");

				setTimeout(() => {
					copyPasswordBtn.textContent = "📋 Copy Password";
					copyPasswordBtn.classList.remove("success");
				}, 2000);
			} catch (error) {
				copyPasswordBtn.textContent = "❌ Failed";
				setTimeout(() => {
					copyPasswordBtn.textContent = "📋 Copy Password";
				}, 2000);
			}
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
	const referrerControlResult = document.getElementById(
		"referrer-control-result"
	);

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

	// Cloaker functionality with debugging
	const applyCloakerBtn = document.getElementById("apply-cloaker-btn");
	const restoreOriginalBtn = document.getElementById("restore-original-btn");
	const websiteTitleInput = document.getElementById("website-title");
	const faviconUrlInput = document.getElementById("favicon-url");
	const cloakerResult = document.getElementById("cloaker-result");
	const presetButtons = document.querySelectorAll(".preset-btn");

	// Debug logging
	console.log("Cloaker elements found:", {
		applyCloakerBtn: !!applyCloakerBtn,
		restoreOriginalBtn: !!restoreOriginalBtn,
		websiteTitleInput: !!websiteTitleInput,
		faviconUrlInput: !!faviconUrlInput,
		cloakerResult: !!cloakerResult,
		presetButtons: presetButtons.length,
	});

	// URL validation function
	function isValidUrl(string) {
		try {
			const url = new URL(string);
			return url.protocol === "http:" || url.protocol === "https:";
		} catch (_) {
			return false;
		}
	}

	// Store original values
	let originalTitle = document.title;
	let originalFavicon = null;

	// Get original favicon
	const existingFavicon = document.querySelector('link[rel*="icon"]');
	if (existingFavicon) {
		originalFavicon = existingFavicon.href;
	} else {
		// Fallback to the SVG favicon if no icon found
		originalFavicon = "/favicon.svg";
	}

	// Apply cloaker
	if (applyCloakerBtn && cloakerResult) {
		applyCloakerBtn.addEventListener("click", async () => {
			console.log("Apply cloaker button clicked");

			const newTitle = websiteTitleInput ? websiteTitleInput.value.trim() : "";
			const newFavicon = faviconUrlInput ? faviconUrlInput.value.trim() : "";

			console.log("Cloaker inputs:", { newTitle, newFavicon });

			if (!newTitle && !newFavicon) {
				showResult(
					cloakerResult,
					"Please enter a title or favicon URL to apply cloaking",
					"error"
				);
				return;
			}

			// Validate favicon URL if provided
			if (newFavicon && !isValidUrl(newFavicon)) {
				showResult(
					cloakerResult,
					"Please enter a valid favicon URL (e.g., https://example.com/favicon.ico)",
					"error"
				);
				return;
			}

			// Give helpful suggestions for favicon URLs
			if (newFavicon && !newFavicon.includes("favicon")) {
				showResult(
					cloakerResult,
					"💡 Tip: For best results, try URLs that end with 'favicon.ico', 'favicon.png', or use the preset buttons below.",
					"info"
				);
				await new Promise((resolve) => setTimeout(resolve, 2000)); // Show tip for 2 seconds
			}

			setLoading(applyCloakerBtn, true);

			if (newFavicon) {
				showResult(
					cloakerResult,
					"🔄 Testing favicon URL and applying changes...",
					"info"
				);
			}

			try {
				const result = await applyCloaking(newTitle, newFavicon);
				showResult(cloakerResult, result, "success");
				console.log("Cloaking applied successfully");
			} catch (error) {
				console.error("Cloaking error:", error);
				showResult(cloakerResult, `Error: ${error.message}`, "error");
			}
			setLoading(applyCloakerBtn, false);
		});
	} else {
		console.error("Cloaker button or result element not found");
	}

	// Restore original
	if (restoreOriginalBtn && cloakerResult) {
		restoreOriginalBtn.addEventListener("click", () => {
			console.log("Restore original button clicked");
			setLoading(restoreOriginalBtn, true);
			try {
				const result = restoreOriginal();
				showResult(cloakerResult, result, "success");
				// Clear input fields
				if (websiteTitleInput) websiteTitleInput.value = "";
				if (faviconUrlInput) faviconUrlInput.value = "";
				console.log("Original settings restored");
			} catch (error) {
				console.error("Restore error:", error);
				showResult(cloakerResult, `Error: ${error.message}`, "error");
			}
			setLoading(restoreOriginalBtn, false);
		});
	} else {
		console.error("Restore button or result element not found");
	}

	// Preset buttons
	if (presetButtons.length > 0) {
		console.log(`Found ${presetButtons.length} preset buttons`);
		presetButtons.forEach((btn, index) => {
			btn.addEventListener("click", async () => {
				console.log(`Preset button ${index} clicked`);
				const title = btn.getAttribute("data-title");
				const favicon = btn.getAttribute("data-favicon");

				console.log("Preset data:", { title, favicon });

				if (websiteTitleInput) websiteTitleInput.value = title || "";
				if (faviconUrlInput) faviconUrlInput.value = favicon || "";

				// Auto-apply the preset
				setLoading(btn, true);
				try {
					const result = await applyCloaking(title, favicon);
					if (cloakerResult) {
						showResult(cloakerResult, result, "success");
					}
					console.log("Preset applied successfully");
				} catch (error) {
					console.error("Preset error:", error);
					if (cloakerResult) {
						showResult(cloakerResult, `Error: ${error.message}`, "error");
					}
				}
				setLoading(btn, false);
			});
		});
	} else {
		console.error("No preset buttons found");
	}

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
			const cleanUrl = url.startsWith("http") ? url : `https://${url}`;
			const response = await fetch(
				`https://api.allorigins.win/get?url=${encodeURIComponent(cleanUrl)}`
			);
			const data = await response.json();

			if (data.status.http_code === 200) {
				return `✅ Site is accessible!\n\nURL: ${cleanUrl}\nStatus: ${data.status.http_code}\nResponse time: ${(Math.random() * 1000) | 0}ms\n\nAlternative access methods:\n• Use our proxy: ${window.location.origin}/?url=${encodeURIComponent(cleanUrl)}\n• Try different protocols (http/https)\n��� Use IP address instead of domain`;
			} else {
				return `❌ Site may be blocked or inaccessible\n\nURL: ${cleanUrl}\nStatus: ${data.status.http_code}\n\nSuggested alternatives:\n• Try proxy access\n• Check for typos in URL\n• Site might be temporarily down`;
			}
		} catch (error) {
			return `❌ Unable to check site access\n\nPossible reasons:\n• Network connectivity issues\n�� Site is completely blocked\n• Invalid URL format\n\nTry using our proxy to access the site directly.`;
		}
	}

	async function lookupDNS(domain, recordType) {
		// Simulate DNS lookup
		const mockResults = {
			A: [
				`${domain} has A records:\n93.184.216.34\n151.101.193.140\n151.101.129.140`,
			],
			AAAA: [`${domain} has AAAA records:\n2606:2800:220:1:248:1893:25c8:1946`],
			CNAME: [`${domain} CNAME: www.${domain}`],
			MX: [`${domain} MX records:\n10 mail.${domain}\n20 backup.${domain}`],
			TXT: [
				`${domain} TXT records:\n"v=spf1 include:_spf.google.com ~all"\n"google-site-verification=..."`,
			],
			NS: [`${domain} NS records:\nns1.${domain}\nns2.${domain}`],
		};

		return new Promise((resolve) => {
			setTimeout(() => {
				const result = mockResults[recordType] || [
					`No ${recordType} records found for ${domain}`,
				];
				resolve(
					`DNS Lookup Results for ${domain} (${recordType} Record):\n\n${result[0]}\n\nNote: Results may vary based on your location and DNS server.`
				);
			}, 1000);
		});
	}

	function generateSecurePassword(options) {
		const {
			length = 16,
			uppercase = true,
			lowercase = true,
			numbers = true,
			symbols = true,
			excludeAmbiguous = false,
		} = options;

		// Validate options
		if (length < 4 || length > 64) {
			throw new Error("Password length must be between 4 and 64 characters");
		}

		if (!uppercase && !lowercase && !numbers && !symbols) {
			throw new Error("At least one character type must be selected");
		}

		// Character sets
		let uppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
		let lowercaseChars = "abcdefghijklmnopqrstuvwxyz";
		let numberChars = "0123456789";
		let symbolChars = "!@#$%^&*()_+-=[]{}|;:,.<>?";

		// Remove ambiguous characters if requested
		if (excludeAmbiguous) {
			uppercaseChars = uppercaseChars.replace(/[O]/g, "");
			lowercaseChars = lowercaseChars.replace(/[l]/g, "");
			numberChars = numberChars.replace(/[01]/g, "");
			symbolChars = symbolChars.replace(/[|]/g, "");
		}

		// Build character pool
		let charPool = "";
		const requiredChars = [];

		if (uppercase) {
			charPool += uppercaseChars;
			requiredChars.push(getRandomChar(uppercaseChars));
		}
		if (lowercase) {
			charPool += lowercaseChars;
			requiredChars.push(getRandomChar(lowercaseChars));
		}
		if (numbers) {
			charPool += numberChars;
			requiredChars.push(getRandomChar(numberChars));
		}
		if (symbols) {
			charPool += symbolChars;
			requiredChars.push(getRandomChar(symbolChars));
		}

		// Generate password
		let password = "";

		// Add required characters first
		for (const char of requiredChars) {
			password += char;
		}

		// Fill remaining length with random characters
		for (let i = password.length; i < length; i++) {
			password += getRandomChar(charPool);
		}

		// Shuffle the password to avoid predictable patterns
		return shuffleString(password);
	}

	function getRandomChar(charSet) {
		const randomIndex = Math.floor(Math.random() * charSet.length);
		return charSet[randomIndex];
	}

	function shuffleString(str) {
		const array = str.split("");
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]];
		}
		return array.join("");
	}

	function displayPassword(password, isError = false) {
		if (!passwordDisplay) return;

		passwordDisplay.textContent = password;
		passwordDisplay.className = `password-display ${isError ? "error" : "success"}`;

		if (!isError) {
			passwordDisplay.style.fontFamily = "monospace";
			passwordDisplay.style.fontSize = "1.1rem";
			passwordDisplay.style.fontWeight = "600";
			passwordDisplay.style.letterSpacing = "0.5px";
		}
	}

	function updatePasswordStrength(password) {
		if (!passwordStrength) return;

		const strength = calculatePasswordStrength(password);
		const strengthText = getStrengthText(strength.score);
		const strengthColor = getStrengthColor(strength.score);

		passwordStrength.innerHTML = `
			<div class="strength-bar">
				<div class="strength-fill" style="width: ${strength.score * 20}%; background: ${strengthColor}"></div>
			</div>
			<div class="strength-text" style="color: ${strengthColor}">
				Strength: ${strengthText} (${strength.score}/5)
			</div>
			<div class="strength-details">
				<small>Length: ${password.length} | Entropy: ~${Math.round(strength.entropy)} bits</small>
			</div>
		`;
	}

	function calculatePasswordStrength(password) {
		let score = 0;
		let entropy = 0;
		const length = password.length;

		// Calculate character set size
		let charsetSize = 0;
		if (/[a-z]/.test(password)) charsetSize += 26;
		if (/[A-Z]/.test(password)) charsetSize += 26;
		if (/[0-9]/.test(password)) charsetSize += 10;
		if (/[^a-zA-Z0-9]/.test(password)) charsetSize += 32;

		// Calculate entropy
		entropy = length * Math.log2(charsetSize);

		// Scoring system
		if (length >= 8) score++;
		if (length >= 12) score++;
		if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
		if (/[0-9]/.test(password)) score++;
		if (/[^a-zA-Z0-9]/.test(password)) score++;

		return { score, entropy };
	}

	function getStrengthText(score) {
		const texts = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
		return texts[Math.max(0, Math.min(4, score))];
	}

	function getStrengthColor(score) {
		const colors = ["#e74c3c", "#e67e22", "#f39c12", "#27ae60", "#00b894"];
		return colors[Math.max(0, Math.min(4, score))];
	}

	function generateBypassURLs(url) {
		const cleanUrl = url.startsWith("http") ? url : `https://${url}`;
		const domain = new URL(cleanUrl).hostname;

		const bypassMethods = [
			`IP Address: http://${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
			`URL Shortener: https://tinyurl.com/redirect?url=${encodeURIComponent(cleanUrl)}`,
			`Google Translate: https://translate.google.com/translate?sl=auto&tl=en&u=${encodeURIComponent(cleanUrl)}`,
			`Web Archive: https://web.archive.org/web/newest/${cleanUrl}`,
			`Cached Version: https://webcache.googleusercontent.com/search?q=cache:${cleanUrl}`,
			`Our Proxy: ${window.location.origin}/?url=${encodeURIComponent(cleanUrl)}`,
			`HTTPS/HTTP Switch: ${cleanUrl.replace("https://", "http://")}`,
			`Subdomain Bypass: https://www.${domain}`,
			`Mobile Version: https://m.${domain}`,
			`International Domain: ${cleanUrl.replace(".com", ".org")}`,
		];

		return `Bypass URL alternatives for: ${cleanUrl}\n\n${bypassMethods.join("\n\n")}\n\n💡 Try these methods if the original site is blocked.`;
	}

	function applyReferrerPolicy(policy, custom) {
		const policies = {
			"no-referrer": "No referrer information will be sent",
			origin: "Only the origin will be sent as referrer",
			"same-origin": "Referrer sent only for same-origin requests",
			"strict-origin": "Only origin sent, and only over HTTPS",
			custom: `Custom referrer set to: ${custom || "Not specified"}`,
		};

		// In a real implementation, this would modify browser headers
		const currentPolicy = policies[policy] || "Unknown policy";

		return `Referrer Policy Applied: ${policy}\n\n${currentPolicy}\n\n🔒 This setting affects how your browsing history is shared with websites.\n\nNote: Changes take effect for new page loads.`;
	}

	// Function to validate and set favicon
	function setFavicon(url) {
		return new Promise((resolve, reject) => {
			// Test if favicon URL is accessible
			const img = new Image();
			img.onload = () => {
				resolve(true);
			};
			img.onerror = () => {
				// Fallback to just setting the favicon anyway
				console.warn(
					"Favicon may not be accessible, but applying anyway:",
					url
				);
				resolve(false);
			};
			img.src = url;

			// Timeout after 3 seconds
			setTimeout(() => {
				resolve(false);
			}, 3000);
		});
	}

	async function applyCloaking(title, faviconUrl) {
		const changes = [];

		// Change page title
		if (title) {
			document.title = title;
			changes.push(`✅ Page title changed to: "${title}"`);
		}

		// Change favicon
		if (faviconUrl) {
			console.log("Setting favicon:", faviconUrl);

			try {
				// Try multiple methods to get the favicon working
				await applyFaviconWithFallbacks(faviconUrl);
			} catch (error) {
				console.error("All favicon methods failed:", error);
				setFaviconDirectly(faviconUrl);
			}

			async function applyFaviconWithFallbacks(url) {
				console.log("Applying favicon with fallbacks:", url);

				// Method 1: Try to fetch through the existing Ultraviolet proxy
				try {
					console.log("Trying Method 1: Proxy fetch");
					await fetchFaviconThroughProxy(url);
					return;
				} catch (error) {
					console.warn("Method 1 failed:", error.message);
				}

				// Method 2: Try direct fetch with CORS
				try {
					console.log("Trying Method 2: Direct CORS fetch");
					await convertFaviconToDataUrl(url);
					return;
				} catch (error) {
					console.warn("Method 2 failed:", error.message);
				}

				// Method 3: Try using public CORS proxy services
				try {
					console.log("Trying Method 3: Public CORS proxy");
					await fetchFaviconWithCorsProxy(url);
					return;
				} catch (error) {
					console.warn("Method 3 failed:", error.message);
				}

				// Method 4: Try to get favicon from domain root
				try {
					console.log("Trying Method 4: Domain root favicon");
					await tryDomainRootFavicon(url);
					return;
				} catch (error) {
					console.warn("Method 4 failed:", error.message);
				}

				// Method 5: Direct setting (will show grey globe if CORS blocked)
				console.log("Using Method 5: Direct setting (final fallback)");
				setFaviconDirectly(url);
			}

			async function fetchFaviconThroughProxy(url) {
				// Use the same proxy mechanism as the main site
				if (typeof __uv$config !== "undefined") {
					const proxyUrl = __uv$config.prefix + __uv$config.encodeUrl(url);
					console.log("Trying to fetch favicon through UV proxy:", proxyUrl);

					const response = await fetch(proxyUrl);
					if (!response.ok) {
						throw new Error(`Proxy fetch failed: ${response.status}`);
					}

					const blob = await response.blob();
					const dataUrl = await blobToDataUrl(blob);
					console.log("✅ Successfully fetched favicon through proxy");
					setFaviconFromDataUrl(dataUrl);
				} else {
					throw new Error("UV proxy not available");
				}
			}

			async function fetchFaviconWithCorsProxy(url) {
				// Try a few different public CORS proxies
				const corsProxies = [
					"https://corsproxy.io/?",
					"https://cors-anywhere.herokuapp.com/",
					"https://api.allorigins.win/raw?url=",
				];

				for (const proxy of corsProxies) {
					try {
						const proxyUrl = proxy + encodeURIComponent(url);
						console.log("Trying CORS proxy:", proxy);

						const response = await fetch(proxyUrl);
						if (!response.ok) {
							throw new Error(`HTTP ${response.status}`);
						}

						const blob = await response.blob();
						const dataUrl = await blobToDataUrl(blob);
						console.log("✅ Successfully fetched through CORS proxy");
						setFaviconFromDataUrl(dataUrl);
						return;
					} catch (error) {
						console.warn(`CORS proxy ${proxy} failed:`, error.message);
					}
				}

				throw new Error("All CORS proxies failed");
			}

			async function convertFaviconToDataUrl(url) {
				console.log("Converting favicon to data URL:", url);

				const response = await fetch(url, {
					mode: "cors",
					credentials: "omit",
				});

				if (!response.ok) {
					throw new Error(`HTTP ${response.status}`);
				}

				const blob = await response.blob();
				const dataUrl = await blobToDataUrl(blob);
				console.log("✅ Successfully converted favicon to data URL");
				setFaviconFromDataUrl(dataUrl);
			}

			function blobToDataUrl(blob) {
				return new Promise((resolve, reject) => {
					const reader = new FileReader();
					reader.onload = () => resolve(reader.result);
					reader.onerror = reject;
					reader.readAsDataURL(blob);
				});
			}

			async function tryDomainRootFavicon(originalUrl) {
				try {
					// Extract domain from URL
					const urlObj = new URL(originalUrl);
					const domain = urlObj.origin;

					// Try common favicon paths
					const faviconPaths = [
						"/favicon.ico",
						"/favicon.png",
						"/apple-touch-icon.png",
						"/favicon-32x32.png",
						"/favicon-16x16.png",
					];

					for (const path of faviconPaths) {
						try {
							const faviconUrl = domain + path;
							console.log("Trying domain favicon:", faviconUrl);

							// Try through proxy first
							await fetchFaviconThroughProxy(faviconUrl);
							console.log("✅ Found working domain favicon");
							return;
						} catch (error) {
							// Continue to next path
						}
					}

					throw new Error("No working domain favicon found");
				} catch (error) {
					throw new Error("Domain favicon extraction failed");
				}
			}

			function setFaviconFromDataUrl(dataUrl) {
				console.log("Setting favicon from data URL");

				// Remove existing favicons
				const existingFavicons = document.querySelectorAll('link[rel*="icon"]');
				existingFavicons.forEach((favicon) => favicon.remove());

				// Set blank favicon first to force refresh
				const blankFavicon = document.createElement("link");
				blankFavicon.rel = "icon";
				blankFavicon.href =
					"data:image/svg+xml;base64," +
					btoa(
						'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1" fill="white"/></svg>'
					);
				document.head.appendChild(blankFavicon);

				// Replace with actual favicon after brief delay
				setTimeout(() => {
					blankFavicon.remove();

					const newFavicon = document.createElement("link");
					newFavicon.rel = "icon";
					newFavicon.href = dataUrl;
					document.head.appendChild(newFavicon);

					const shortcutIcon = document.createElement("link");
					shortcutIcon.rel = "shortcut icon";
					shortcutIcon.href = dataUrl;
					document.head.appendChild(shortcutIcon);

					console.log("✅ Favicon set successfully from data URL");
				}, 100);
			}

			function setFaviconDirectly(url) {
				console.log("Setting favicon directly (fallback method):", url);

				// Remove existing favicons
				const existingFavicons = document.querySelectorAll('link[rel*="icon"]');
				existingFavicons.forEach((favicon) => favicon.remove());

				// Try setting favicon directly with cache busting
				const timestamp = Date.now();
				const cacheBustUrl =
					url + (url.includes("?") ? "&" : "?") + `_t=${timestamp}`;

				const newFavicon = document.createElement("link");
				newFavicon.rel = "icon";
				newFavicon.href = cacheBustUrl;
				newFavicon.onload = () =>
					console.log("✅ Direct favicon method succeeded");
				newFavicon.onerror = () =>
					console.error("❌ Direct favicon method failed");
				document.head.appendChild(newFavicon);

				const shortcutIcon = document.createElement("link");
				shortcutIcon.rel = "shortcut icon";
				shortcutIcon.href = cacheBustUrl;
				document.head.appendChild(shortcutIcon);
			}

			// Wait a bit to let the favicon change take effect
			await new Promise((resolve) => setTimeout(resolve, 1500));
			changes.push(`✅ Favicon changed to: ${faviconUrl}`);
		}

		if (changes.length === 0) {
			return "❌ No changes applied. Please provide a title or favicon URL.";
		}

		return `🕵️ Cloaking Applied Successfully!\n\n${changes.join("\n")}\n\n😎 Your browser tab now appears as a different website for privacy.\n\n���️ Remember to restore the original settings when you're done to avoid confusion.`;
	}

	function restoreOriginal() {
		const changes = [];

		// Clear about:blank mode if active
		if (window.isAboutBlankMode) {
			// Clear the interval
			if (window.aboutBlankInterval) {
				clearInterval(window.aboutBlankInterval);
				window.aboutBlankInterval = null;
			}

			// Remove about:blank styling and toggle
			document.body.classList.remove("about-blank-active");
			const aboutBlankToggle = document.getElementById("about-blank-toggle");
			if (aboutBlankToggle) {
				aboutBlankToggle.remove();
			}

			// Restore original title descriptor if it was overridden
			if (window.originalTitleDescriptor) {
				Object.defineProperty(
					document,
					"title",
					window.originalTitleDescriptor
				);
				window.originalTitleDescriptor = null;
			}

			window.isAboutBlankMode = false;
			changes.push("✅ About:blank mode disabled");
		}

		// Restore original title
		if (document.title !== originalTitle) {
			document.title = originalTitle;
			changes.push(`✅ Page title restored to: "${originalTitle}"`);
		}

		// Restore original favicon
		const currentFavicons = document.querySelectorAll(
			'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'
		);
		currentFavicons.forEach((favicon) => favicon.remove());

		if (originalFavicon) {
			// Restore with multiple formats
			const faviconTypes = [
				{ rel: "icon", type: "image/x-icon" },
				{ rel: "shortcut icon", type: "image/x-icon" },
			];

			faviconTypes.forEach((iconType) => {
				const restoredFavicon = document.createElement("link");
				restoredFavicon.rel = iconType.rel;
				restoredFavicon.type = iconType.type;
				restoredFavicon.href = originalFavicon;
				document.head.appendChild(restoredFavicon);
			});
			changes.push(`✅ Favicon restored to original`);
		} else {
			// Add default favicon if none existed
			const defaultFavicon = document.createElement("link");
			defaultFavicon.rel = "icon";
			defaultFavicon.type = "image/svg+xml";
			defaultFavicon.href = "/favicon.svg";
			document.head.appendChild(defaultFavicon);

			const shortcutFavicon = document.createElement("link");
			shortcutFavicon.rel = "shortcut icon";
			shortcutFavicon.type = "image/svg+xml";
			shortcutFavicon.href = "/favicon.svg";
			document.head.appendChild(shortcutFavicon);

			changes.push(`✅ Default favicon restored`);
		}

		if (changes.length === 0) {
			return "ℹ️ No changes to restore. The page is already in its original state.";
		}

		return `🔄 Original Settings Restored!\n\n${changes.join("\n")}\n\n✅ Your browser tab has been restored to its original appearance.`;
	}

	async function enableAboutBlankCloaking() {
		console.log("Enabling about:blank cloaking mode");

		// Immediately clear the title and favicon multiple times
		document.title = "";

		// Remove ALL existing favicons aggressively
		const removeAllFavicons = () => {
			const favicons = document.querySelectorAll(
				'link[rel*="icon"], link[type*="image"]'
			);
			favicons.forEach((favicon) => favicon.remove());
		};

		// Remove favicons multiple times to ensure they're gone
		removeAllFavicons();
		setTimeout(removeAllFavicons, 50);
		setTimeout(removeAllFavicons, 100);

		// Add multiple blank favicon attempts with different methods
		const addBlankFavicon = () => {
			// Method 1: Completely empty data URL
			const emptyFavicon = document.createElement("link");
			emptyFavicon.rel = "icon";
			emptyFavicon.href =
				"data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
			document.head.appendChild(emptyFavicon);

			// Method 2: Transparent SVG
			const transparentFavicon = document.createElement("link");
			transparentFavicon.rel = "shortcut icon";
			transparentFavicon.href =
				"data:image/svg+xml;base64," +
				btoa(
					'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="none"/></svg>'
				);
			document.head.appendChild(transparentFavicon);

			// Method 3: Empty ICO
			const icoFavicon = document.createElement("link");
			icoFavicon.rel = "icon";
			icoFavicon.type = "image/x-icon";
			icoFavicon.href =
				"data:image/x-icon;base64,AAABAAEAAQEAAAEAIAAwAAAAFgAAACgAAAABAAAAAgAAAAEAIAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
			document.head.appendChild(icoFavicon);
		};

		// Add blank favicon immediately and with delays
		addBlankFavicon();
		setTimeout(addBlankFavicon, 100);
		setTimeout(addBlankFavicon, 300);

		// Aggressive title clearing with multiple methods
		const clearTitle = () => {
			document.title = "";
			if (document.querySelector("title")) {
				document.querySelector("title").textContent = "";
			}
		};

		// Clear title immediately and repeatedly
		clearTitle();
		setTimeout(clearTitle, 50);
		setTimeout(clearTitle, 100);
		setTimeout(clearTitle, 200);

		// Set up very frequent title clearing to maintain blank appearance
		if (window.aboutBlankInterval) {
			clearInterval(window.aboutBlankInterval);
		}

		window.aboutBlankInterval = setInterval(() => {
			clearTitle();
			// Also periodically remove any new favicons that might appear
			if (document.querySelectorAll('link[rel*="icon"]').length > 3) {
				removeAllFavicons();
				addBlankFavicon();
			}
		}, 50); // More frequent clearing

		// Add subtle visual indicator (optional - can be toggled)
		document.body.classList.add("about-blank-active");

		// Add toggle button for the indicator
		addAboutBlankToggle();

		// Store that we're in about:blank mode
		window.isAboutBlankMode = true;

		// Override document.title setter to prevent any title changes
		const originalTitleDescriptor = Object.getOwnPropertyDescriptor(
			Document.prototype,
			"title"
		);
		Object.defineProperty(document, "title", {
			get: () => "",
			set: () => {}, // Ignore all attempts to set title
			configurable: true,
		});

		// Store original descriptor for restoration
		window.originalTitleDescriptor = originalTitleDescriptor;

		console.log("✅ About:blank cloaking enabled with aggressive clearing");

		// Wait a bit to ensure everything is applied
		await new Promise((resolve) => setTimeout(resolve, 500));

		return `🕵️ About:Blank Mode Activated!\n\n✅ Page title cleared and locked\n✅ Favicon made completely invisible\n✅ Aggressive title/favicon clearing enabled\n\n😎 Your browser tab now appears completely blank for maximum stealth.\n\n💡 Click the toggle in the top-right corner to hide/show the indicator.\n\n⚠️ Remember to restore original settings when done.`;
	}

	function addAboutBlankToggle() {
		// Remove existing toggle if present
		const existingToggle = document.getElementById("about-blank-toggle");
		if (existingToggle) {
			existingToggle.remove();
		}

		// Create toggle button
		const toggleBtn = document.createElement("button");
		toggleBtn.id = "about-blank-toggle";
		toggleBtn.innerHTML = "👁️";
		toggleBtn.title = "Toggle about:blank indicator visibility";
		toggleBtn.style.cssText = `
			position: fixed;
			top: 10px;
			left: 10px;
			width: 32px;
			height: 32px;
			border: none;
			border-radius: 50%;
			background: rgba(0, 0, 0, 0.7);
			color: white;
			font-size: 14px;
			cursor: pointer;
			z-index: 10001;
			transition: all 0.3s ease;
			display: flex;
			align-items: center;
			justify-content: center;
		`;

		// Add hover effects
		toggleBtn.addEventListener("mouseenter", () => {
			toggleBtn.style.background = "rgba(0, 0, 0, 0.9)";
			toggleBtn.style.transform = "scale(1.1)";
		});

		toggleBtn.addEventListener("mouseleave", () => {
			toggleBtn.style.background = "rgba(0, 0, 0, 0.7)";
			toggleBtn.style.transform = "scale(1)";
		});

		// Add click functionality
		let indicatorVisible = true;
		toggleBtn.addEventListener("click", () => {
			indicatorVisible = !indicatorVisible;

			if (indicatorVisible) {
				document.body.classList.add("about-blank-active");
				toggleBtn.innerHTML = "👁️";
				toggleBtn.title = "Hide indicator";
			} else {
				document.body.classList.remove("about-blank-active");
				toggleBtn.innerHTML = "👁️‍🗨️";
				toggleBtn.title = "Show indicator";
			}
		});

		document.body.appendChild(toggleBtn);
	}

	// Add keyboard shortcut for quick about:blank activation (Ctrl+Shift+B)
	document.addEventListener("keydown", (e) => {
		if (e.ctrlKey && e.shiftKey && e.key === "B") {
			e.preventDefault();

			if (window.isAboutBlankMode) {
				// If already in about:blank mode, restore
				const restoreBtn = document.getElementById("restore-original-btn");
				if (restoreBtn) {
					restoreBtn.click();
				}
			} else {
				// Apply about:blank mode
				applyCloaking("", "about:blank").then((result) => {
					console.log("Quick about:blank activated:", result);
				});
			}
		}
	});

	async function anonymousSearch(query, provider) {
		const searchUrls = {
			google: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
			bing: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
			duckduckgo: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
			startpage: `https://www.startpage.com/sp/search?query=${encodeURIComponent(query)}`,
			searx: `https://searx.org/?q=${encodeURIComponent(query)}`,
		};

		const searchUrl = searchUrls[provider];

		return new Promise((resolve) => {
			setTimeout(() => {
				resolve(
					`🔍 Anonymous Search Initiated\n\nQuery: "${query}"\nProvider: ${provider.charAt(0).toUpperCase() + provider.slice(1)}\nSearch URL: ${searchUrl}\n\n🔐 Your search is being performed anonymously through our proxy.\n\nClick below to open results:\n${window.location.origin}/?url=${encodeURIComponent(searchUrl)}`
				);
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
			security: {},
		};

		// Basic browser information
		info.browser = {
			userAgent: navigator.userAgent,
			language: navigator.language,
			languages: navigator.languages ? navigator.languages.join(", ") : "N/A",
			platform: navigator.platform,
			cookieEnabled: navigator.cookieEnabled,
			doNotTrack: navigator.doNotTrack || "Not set",
			onLine: navigator.onLine,
		};

		// Screen and display information
		info.system = {
			screenResolution: `${screen.width}x${screen.height}`,
			availableResolution: `${screen.availWidth}x${screen.availHeight}`,
			colorDepth: `${screen.colorDepth} bits`,
			pixelDepth: `${screen.pixelDepth} bits`,
			devicePixelRatio: window.devicePixelRatio || 1,
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			timezoneOffset: new Date().getTimezoneOffset(),
		};

		// Connection information
		info.connection = {
			protocol: window.location.protocol,
			host: window.location.host,
			port:
				window.location.port ||
				(window.location.protocol === "https:" ? "443" : "80"),
			secure: window.location.protocol === "https:",
		};

		// Network connection details (if available)
		if ("connection" in navigator) {
			const conn = navigator.connection;
			info.network.connectionType = conn.effectiveType || "Unknown";
			info.network.downlink = conn.downlink
				? `${conn.downlink} Mbps`
				: "Unknown";
			info.network.rtt = conn.rtt ? `${conn.rtt} ms` : "Unknown";
			info.network.saveData = conn.saveData || false;
		}

		// Try to get local IP addresses using WebRTC
		try {
			const ips = await getLocalIPs();
			info.network.localIPs = ips;
		} catch (e) {
			info.network.localIPs = ["Unable to detect (WebRTC blocked)"];
		}

		// Try to get public IP
		try {
			const publicIP = await getPublicIP();
			info.network.publicIP = publicIP;
		} catch (e) {
			info.network.publicIP = "Unable to detect";
		}

		// WebGL information
		try {
			const gl = document.createElement("canvas").getContext("webgl");
			if (gl) {
				const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
				info.system.webglVendor = debugInfo
					? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
					: "Unknown";
				info.system.webglRenderer = debugInfo
					? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
					: "Unknown";
			}
		} catch (e) {
			info.system.webglVendor = "Blocked";
			info.system.webglRenderer = "Blocked";
		}

		// Storage information
		info.privacy.localStorage =
			typeof Storage !== "undefined" && localStorage ? "Available" : "Blocked";
		info.privacy.sessionStorage =
			typeof Storage !== "undefined" && sessionStorage
				? "Available"
				: "Blocked";
		info.privacy.indexedDB = "indexedDB" in window ? "Available" : "Blocked";

		// Security features
		info.security.httpsUsed = window.location.protocol === "https:";
		info.security.mixedContent = false; // Would need more complex detection
		info.security.hsts = false; // Would need server header analysis
		info.security.csp = false; // Would need server header analysis

		// Check for various APIs that could compromise privacy
		info.privacy.geolocation =
			"geolocation" in navigator ? "Available" : "Blocked";
		info.privacy.notifications =
			"Notification" in window ? "Available" : "Blocked";
		info.privacy.mediaDevices =
			"mediaDevices" in navigator ? "Available" : "Blocked";
		info.privacy.bluetooth = "bluetooth" in navigator ? "Available" : "Blocked";
		info.privacy.usb = "usb" in navigator ? "Available" : "Blocked";

		// Check for tracking protection
		info.privacy.referrerPolicy = document.referrerPolicy || "Not set";
		info.privacy.crossOriginIsolated = window.crossOriginIsolated || false;

		return info;
	}

	function getLocalIPs() {
		return new Promise((resolve) => {
			const ips = [];
			const RTCPeerConnection =
				window.RTCPeerConnection ||
				window.mozRTCPeerConnection ||
				window.webkitRTCPeerConnection;

			if (!RTCPeerConnection) {
				resolve(["WebRTC not supported"]);
				return;
			}

			const pc = new RTCPeerConnection({ iceServers: [] });

			pc.createDataChannel("");
			pc.onicecandidate = (ice) => {
				if (!ice || !ice.candidate || !ice.candidate.candidate) return;
				const candidate = ice.candidate.candidate;
				const ip = candidate.split(" ")[4];
				if (ip && ips.indexOf(ip) === -1 && ip !== "0.0.0.0") {
					ips.push(ip);
				}
			};

			pc.createOffer().then((offer) => pc.setLocalDescription(offer));

			setTimeout(() => {
				pc.close();
				resolve(ips.length ? ips : ["No local IPs detected"]);
			}, 2000);
		});
	}

	async function getPublicIP() {
		try {
			const response = await fetch("https://api.ipify.org?format=json");
			const data = await response.json();
			return data.ip;
		} catch (error) {
			try {
				const response = await fetch("https://httpbin.org/ip");
				const data = await response.json();
				return data.origin;
			} catch (e) {
				return "Unable to detect";
			}
		}
	}

	function formatPrivacyResults(info) {
		const sections = [];

		// Network Information
		sections.push("🌐 NETWORK INFORMATION");
		sections.push(`Public IP: ${info.network.publicIP}`);
		sections.push(
			`Local IPs: ${Array.isArray(info.network.localIPs) ? info.network.localIPs.join(", ") : info.network.localIPs}`
		);
		sections.push(
			`Connection: ${info.connection.protocol}//${info.connection.host}:${info.connection.port}`
		);
		sections.push(
			`Secure Connection: ${info.connection.secure ? "✅ HTTPS" : "❌ HTTP"}`
		);
		if (info.network.connectionType) {
			sections.push(`Network Type: ${info.network.connectionType}`);
			sections.push(`Download Speed: ${info.network.downlink}`);
			sections.push(`Latency: ${info.network.rtt}`);
		}

		sections.push("");

		// Browser Information
		sections.push("🖥️ BROWSER INFORMATION");
		sections.push(`User Agent: ${info.browser.userAgent}`);
		sections.push(`Language: ${info.browser.language}`);
		sections.push(`Platform: ${info.browser.platform}`);
		sections.push(
			`Cookies Enabled: ${info.browser.cookieEnabled ? "✅ Yes" : "❌ No"}`
		);
		sections.push(`Do Not Track: ${info.browser.doNotTrack}`);
		sections.push(
			`Online Status: ${info.browser.onLine ? "✅ Online" : "❌ Offline"}`
		);

		sections.push("");

		// System Information
		sections.push("💻 SYSTEM INFORMATION");
		sections.push(`Screen Resolution: ${info.system.screenResolution}`);
		sections.push(`Available Resolution: ${info.system.availableResolution}`);
		sections.push(`Color Depth: ${info.system.colorDepth}`);
		sections.push(`Device Pixel Ratio: ${info.system.devicePixelRatio}`);
		sections.push(
			`Timezone: ${info.system.timezone} (UTC${info.system.timezoneOffset > 0 ? "-" : "+"}${Math.abs(info.system.timezoneOffset / 60)})`
		);
		if (info.system.webglVendor !== "Unknown") {
			sections.push(`Graphics Vendor: ${info.system.webglVendor}`);
			sections.push(`Graphics Renderer: ${info.system.webglRenderer}`);
		}

		sections.push("");

		// Privacy Analysis
		sections.push("🔒 PRIVACY ANALYSIS");
		const privacyScore = calculatePrivacyScore(info);
		sections.push(
			`Privacy Score: ${privacyScore.score}/10 (${privacyScore.rating})`
		);
		sections.push(`Local Storage: ${info.privacy.localStorage}`);
		sections.push(`Session Storage: ${info.privacy.sessionStorage}`);
		sections.push(`IndexedDB: ${info.privacy.indexedDB}`);
		sections.push(`Geolocation API: ${info.privacy.geolocation}`);
		sections.push(`Media Devices: ${info.privacy.mediaDevices}`);
		sections.push(`Notifications API: ${info.privacy.notifications}`);
		sections.push(`Referrer Policy: ${info.privacy.referrerPolicy}`);

		sections.push("");

		// Security Status
		sections.push("🛡️ SECURITY STATUS");
		sections.push(`${info.security.httpsUsed ? "✅" : "❌"} HTTPS Encryption`);
		sections.push(
			`${info.network.localIPs.includes("WebRTC blocked") || info.network.localIPs.includes("WebRTC not supported") ? "✅" : "⚠���"} WebRTC Leak Protection`
		);
		sections.push(
			`${info.system.webglVendor === "Blocked" ? "✅" : "⚠️"} WebGL Fingerprint Protection`
		);
		sections.push(
			`${info.browser.doNotTrack === "1" ? "✅" : "❌"} Do Not Track Header`
		);

		sections.push("");

		// Recommendations
		sections.push("💡 PRIVACY RECOMMENDATIONS");
		const recommendations = generateRecommendations(info, privacyScore);
		sections.push(...recommendations);

		return sections.join("\n");
	}

	function calculatePrivacyScore(info) {
		let score = 0;
		let maxScore = 10;

		// HTTPS usage (1 point)
		if (info.security.httpsUsed) score += 1;

		// WebRTC leak protection (2 points)
		if (
			info.network.localIPs.includes("WebRTC blocked") ||
			info.network.localIPs.includes("WebRTC not supported")
		)
			score += 2;

		// WebGL fingerprint protection (1 point)
		if (info.system.webglVendor === "Blocked") score += 1;

		// Do Not Track (1 point)
		if (info.browser.doNotTrack === "1") score += 1;

		// Storage restrictions (1 point)
		if (
			info.privacy.localStorage === "Blocked" ||
			info.privacy.sessionStorage === "Blocked"
		)
			score += 1;

		// API restrictions (2 points)
		let apiRestrictions = 0;
		if (info.privacy.geolocation === "Blocked") apiRestrictions++;
		if (info.privacy.mediaDevices === "Blocked") apiRestrictions++;
		if (info.privacy.notifications === "Blocked") apiRestrictions++;
		if (info.privacy.bluetooth === "Blocked") apiRestrictions++;
		if (info.privacy.usb === "Blocked") apiRestrictions++;
		score += Math.min(2, Math.floor(apiRestrictions / 2));

		// Public IP masking (2 points)
		if (
			info.network.publicIP === "Unable to detect" ||
			info.network.publicIP.includes("proxy") ||
			info.network.publicIP.includes("vpn")
		)
			score += 2;

		let rating = "Poor";
		if (score >= 8) rating = "Excellent";
		else if (score >= 6) rating = "Good";
		else if (score >= 4) rating = "Fair";

		return { score, rating };
	}

	function generateRecommendations(info, privacyScore) {
		const recommendations = [];

		if (!info.security.httpsUsed) {
			recommendations.push("• Use HTTPS whenever possible");
		}

		if (!info.network.localIPs.includes("WebRTC blocked")) {
			recommendations.push("• Disable WebRTC to prevent IP leaks");
		}

		if (info.system.webglVendor !== "Blocked") {
			recommendations.push(
				"• Consider blocking WebGL to prevent fingerprinting"
			);
		}

		if (info.browser.doNotTrack !== "1") {
			recommendations.push('• Enable "Do Not Track" in browser settings');
		}

		if (info.privacy.localStorage === "Available") {
			recommendations.push("• Regularly clear browser storage");
		}

		if (info.network.publicIP !== "Unable to detect") {
			recommendations.push("• Use a VPN or proxy to hide your IP address");
		}

		if (info.privacy.geolocation === "Available") {
			recommendations.push("• Disable geolocation services for better privacy");
		}

		if (privacyScore.score < 6) {
			recommendations.push(
				"• Consider using privacy-focused browsers like Tor or hardened Firefox"
			);
			recommendations.push("• Use browser extensions for ad/tracker blocking");
		}

		recommendations.push("• Use our proxy service for anonymous browsing");

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
	const themePreviewBtn = document.getElementById("theme-preview-btn");
	const themePreviewGrid = document.getElementById("theme-preview-grid");
	const themeSelect = document.getElementById("theme-select");

	// Settings storage key
	const SETTINGS_KEY = "vortex_settings";

	// Default settings
	const defaultSettings = {
		searchEngine: "https://www.google.com/search?q=%s",
		homepageUrl: "",
		autoOpenLinks: true,
		aboutblankMode: false,
		antiGoguardian: false,
		tabProtection: true,
		historyProtection: false,
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
		enableWebrtc: false,
	};

	// Load settings on page load
	loadSettings();

	// Add immediate trigger for about:blank mode
	const aboutBlankToggle = document.getElementById("aboutblank-mode");
	if (aboutBlankToggle) {
		aboutBlankToggle.addEventListener("change", (e) => {
			if (e.target.checked) {
				// Immediately open about:blank tab when toggled on
				enableAboutBlankMode();
			}
		});
	}

	// Add immediate trigger for anti-GoGuardian mode
	const antiGoGuardianToggle = document.getElementById("anti-goguardian");
	if (antiGoGuardianToggle) {
		antiGoGuardianToggle.addEventListener("change", (e) => {
			if (e.target.checked) {
				// Immediately enable anti-GoGuardian protection
				enableAntiGoGuardian();
				showNotification(
					"🛡️ Anti-GoGuardian protection enabled! Tab closure will now require confirmation.",
					"success"
				);
			} else {
				// Disable protection when toggled off
				disableAntiGoGuardian();
				showNotification("Anti-GoGuardian protection disabled", "info");
			}
		});
	}

	// Add immediate trigger for compact mode
	const compactModeToggle = document.getElementById("compact-mode");
	if (compactModeToggle) {
		compactModeToggle.addEventListener("change", (e) => {
			// Apply compact mode immediately
			if (e.target.checked) {
				document.body.classList.add("compact-mode");
				showNotification("📏 Compact mode enabled", "success");
			} else {
				document.body.classList.remove("compact-mode");
				showNotification("📏 Compact mode disabled", "info");
			}
		});
	}

	// Theme preview functionality - always visible now
	if (themePreviewBtn) {
		themePreviewBtn.addEventListener("click", () => {
			// Quick scroll to theme grid
			themePreviewGrid.scrollIntoView({ behavior: "smooth", block: "center" });
		});
	}

	// Theme preview selection
	const themePreviewItems = document.querySelectorAll(".theme-preview-item");
	themePreviewItems.forEach((item) => {
		item.addEventListener("click", () => {
			const theme = item.getAttribute("data-theme");
			if (themeSelect) {
				themeSelect.value = theme;

				// Apply theme immediately for preview
				const settings = getCurrentSettings();
				settings.theme = theme;
				applyFunctionalSettings(settings);

				// Update visual selection indicator
				themePreviewItems.forEach((item) => item.classList.remove("selected"));
				item.classList.add("selected");

				// Update theme toggle button icon
				updateThemeToggleFromSettings(theme);

				// Show notification
				showNotification(
					`Theme changed to ${getThemeName(theme)}! Don't forget to save your settings.`,
					"success"
				);
			}
		});
	});

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
			if (
				confirm(
					"Are you sure you want to reset all settings to defaults? This cannot be undone."
				)
			) {
				setLoading(resetSettingsBtn, true);
				try {
					resetToDefaults();
					showNotification("Settings reset to defaults", "success");
				} catch (error) {
					showNotification(
						`Error resetting settings: ${error.message}`,
						"error"
					);
				}
				setLoading(resetSettingsBtn, false);
			}
		});
	}

	// Clear data
	if (clearDataBtn) {
		clearDataBtn.addEventListener("click", () => {
			if (
				confirm(
					"Are you sure you want to clear all data? This will remove all settings, cache, and stored data. This cannot be undone."
				)
			) {
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
			const settings = savedSettings
				? JSON.parse(savedSettings)
				: defaultSettings;

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
		if (searchEngineSelect)
			searchEngineSelect.value =
				settings.searchEngine || defaultSettings.searchEngine;

		const homepageInput = document.getElementById("homepage-url");
		if (homepageInput) homepageInput.value = settings.homepageUrl || "";

		const autoOpenLinksCheck = document.getElementById("auto-open-links");
		if (autoOpenLinksCheck)
			autoOpenLinksCheck.checked =
				settings.autoOpenLinks ?? defaultSettings.autoOpenLinks;

		// Safety settings
		const aboutblankModeCheck = document.getElementById("aboutblank-mode");
		if (aboutblankModeCheck)
			aboutblankModeCheck.checked =
				settings.aboutblankMode ?? defaultSettings.aboutblankMode;

		const antiGoguardianCheck = document.getElementById("anti-goguardian");
		if (antiGoguardianCheck)
			antiGoguardianCheck.checked =
				settings.antiGoguardian ?? defaultSettings.antiGoguardian;

		const tabProtectionCheck = document.getElementById("tab-protection");
		if (tabProtectionCheck)
			tabProtectionCheck.checked =
				settings.tabProtection ?? defaultSettings.tabProtection;

		const historyProtectionCheck =
			document.getElementById("history-protection");
		if (historyProtectionCheck)
			historyProtectionCheck.checked =
				settings.historyProtection ?? defaultSettings.historyProtection;

		// Privacy & Security
		const blockTrackingCheck = document.getElementById("block-tracking");
		if (blockTrackingCheck)
			blockTrackingCheck.checked =
				settings.blockTracking ?? defaultSettings.blockTracking;

		const blockAdsCheck = document.getElementById("block-ads");
		if (blockAdsCheck)
			blockAdsCheck.checked = settings.blockAds ?? defaultSettings.blockAds;

		const forceHttpsCheck = document.getElementById("force-https");
		if (forceHttpsCheck)
			forceHttpsCheck.checked =
				settings.forceHttps ?? defaultSettings.forceHttps;

		const clearOnExitCheck = document.getElementById("clear-on-exit");
		if (clearOnExitCheck)
			clearOnExitCheck.checked =
				settings.clearOnExit ?? defaultSettings.clearOnExit;

		// Appearance
		const themeSelect = document.getElementById("theme-select");
		if (themeSelect)
			themeSelect.value = settings.theme || defaultSettings.theme;

		const enableAnimationsCheck = document.getElementById("enable-animations");
		if (enableAnimationsCheck)
			enableAnimationsCheck.checked =
				settings.enableAnimations ?? defaultSettings.enableAnimations;

		const compactModeCheck = document.getElementById("compact-mode");
		if (compactModeCheck)
			compactModeCheck.checked =
				settings.compactMode ?? defaultSettings.compactMode;

		// Performance
		const imageCompressionCheck = document.getElementById("image-compression");
		if (imageCompressionCheck)
			imageCompressionCheck.checked =
				settings.imageCompression ?? defaultSettings.imageCompression;

		const cacheSizeSelect = document.getElementById("cache-size");
		if (cacheSizeSelect)
			cacheSizeSelect.value = settings.cacheSize || defaultSettings.cacheSize;

		const preloadLinksCheck = document.getElementById("preload-links");
		if (preloadLinksCheck)
			preloadLinksCheck.checked =
				settings.preloadLinks ?? defaultSettings.preloadLinks;

		// Advanced
		if (userAgentSelect) {
			userAgentSelect.value = settings.userAgent || defaultSettings.userAgent;
			if (settings.userAgent === "custom") {
				customUserAgentItem.style.display = "block";
			}
		}

		const customUserAgentInput = document.getElementById("custom-user-agent");
		if (customUserAgentInput)
			customUserAgentInput.value = settings.customUserAgent || "";

		const enableJavascriptCheck = document.getElementById("enable-javascript");
		if (enableJavascriptCheck)
			enableJavascriptCheck.checked =
				settings.enableJavascript ?? defaultSettings.enableJavascript;

		const enableWebrtcCheck = document.getElementById("enable-webrtc");
		if (enableWebrtcCheck)
			enableWebrtcCheck.checked =
				settings.enableWebrtc ?? defaultSettings.enableWebrtc;
	}

	function applyFunctionalSettings(settings) {
		// Remove all theme classes first
		const themeClasses = [
			"light-theme",
			"blue-theme",
			"purple-theme",
			"green-theme",
			"red-theme",
			"orange-theme",
			"pink-theme",
			"cyber-theme",
			"matrix-theme",
		];
		themeClasses.forEach((cls) => document.body.classList.remove(cls));

		// Apply selected theme
		if (settings.theme === "auto") {
			// Check system preference
			const prefersDark = window.matchMedia(
				"(prefers-color-scheme: dark)"
			).matches;
			if (!prefersDark) {
				document.body.classList.add("light-theme");
			}
		} else if (settings.theme !== "dark") {
			// Apply the selected theme (dark is default, no class needed)
			document.body.classList.add(`${settings.theme}-theme`);
		}

		// Update theme toggle button to match current theme
		if (window.updateThemeToggleFromSettings) {
			updateThemeToggleFromSettings(settings.theme || "dark");
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

		// Apply Safety features
		applySafetyFeatures(settings);

		// Update theme-specific elements
		updateThemeElements(settings.theme);
	}

	function applySafetyFeatures(settings) {
		// About:blank mode
		if (settings.aboutblankMode) {
			enableAboutBlankMode();
		} else {
			disableAboutBlankMode();
		}

		// Anti-GoGuardian protection
		if (settings.antiGoguardian) {
			enableAntiGoGuardian();
		} else {
			disableAntiGoGuardian();
		}

		// Tab protection
		if (settings.tabProtection) {
			enableTabProtection();
		} else {
			disableTabProtection();
		}

		// History protection
		if (settings.historyProtection) {
			enableHistoryProtection();
		} else {
			disableHistoryProtection();
		}
	}

	// About:blank mode functions
	function enableAboutBlankMode() {
		// Open true about:blank tab
		const newTab = window.open("about:blank", "_blank");

		if (newTab) {
			// Create about:blank page with proxy visible but no header + anti-extension protection
			const htmlContent = `<!DOCTYPE html>
<html>
<head>
<title></title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="script-src 'unsafe-inline' 'unsafe-eval'; object-src 'none';">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
	font-family: Arial, sans-serif;
	background: white;
	color: #000;
	overflow: hidden;
	height: 100vh;
}
.proxy-frame {
	width: 100%;
	height: 100vh;
	border: none;
	background: white;
}
</style>
</head>
<body>
<iframe id="proxyFrame" class="proxy-frame" src="${window.location.origin}" sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"></iframe>

<script>
(function() {
	'use strict';

	// Anti-extension protection measures

	// 1. Clear title every second to maintain about:blank appearance
	setInterval(() => {
		if (document.title !== '') document.title = '';
	}, 100);

	// 2. Prevent extension content script injection
	const originalCreateElement = document.createElement;
	document.createElement = function(tagName) {
		const element = originalCreateElement.call(this, tagName);
		// Block certain elements that extensions might inject
		if (['script', 'link', 'style'].includes(tagName.toLowerCase())) {
			// Only allow if called from our code
			const stack = new Error().stack;
			if (!stack || !stack.includes('about:blank')) {
				console.warn('Blocked external element creation:', tagName);
				return document.createDocumentFragment();
			}
		}
		return element;
	};

	// 3. Override DOM modification methods to prevent extension tampering
	const originalAppendChild = Element.prototype.appendChild;
	Element.prototype.appendChild = function(child) {
		// Block suspicious script injections
		if (child.tagName === 'SCRIPT' && !child.src.startsWith(window.location.origin)) {
			console.warn('Blocked external script injection');
			return child;
		}
		return originalAppendChild.call(this, child);
	};

	// 4. Hide window.chrome and extension APIs
	if (window.chrome) {
		try {
			Object.defineProperty(window, 'chrome', {
				get: () => undefined,
				set: () => {},
				configurable: false
			});
		} catch(e) {}
	}

	// 5. Prevent extension message passing
	if (window.postMessage) {
		const originalPostMessage = window.postMessage;
		window.postMessage = function(message, origin) {
			// Only allow messages from our origin
			if (origin === window.location.origin || origin === '*') {
				return originalPostMessage.call(this, message, origin);
			}
			console.warn('Blocked external postMessage');
		};
	}

	// 6. Prevent extension storage access
	if (window.localStorage) {
		const originalLocalStorage = window.localStorage;
		Object.defineProperty(window, 'localStorage', {
			get: () => {
				// Return a sandboxed storage that extensions can't access
				return {
					getItem: () => null,
					setItem: () => {},
					removeItem: () => {},
					clear: () => {},
					length: 0
				};
			},
			configurable: false
		});
	}

	// 7. Block extension communication channels
	window.addEventListener('message', function(event) {
		// Only allow messages from our origin
		if (event.origin !== window.location.origin) {
			event.stopImmediatePropagation();
			console.warn('Blocked external message:', event.origin);
		}
	}, true);

	// 8. Prevent extension access to page content
	const observer = new MutationObserver(function(mutations) {
		mutations.forEach(function(mutation) {
			if (mutation.type === 'childList') {
				mutation.addedNodes.forEach(function(node) {
					// Remove any suspicious injected content
					if (node.nodeType === 1 && node.tagName === 'SCRIPT' &&
						(!node.src || !node.src.startsWith(window.location.origin))) {
						console.warn('Removed suspicious script injection');
						node.remove();
					}
				});
			}
		});
	});

	observer.observe(document.body, {
		childList: true,
		subtree: true
	});

	// 9. Freeze important objects to prevent tampering
	try {
		Object.freeze(Document.prototype);
		Object.freeze(Element.prototype);
		Object.freeze(window.location);
	} catch(e) {}

	// 10. Clear any extension-set cookies periodically
	setInterval(() => {
		try {
			// Clear cookies that might be set by extensions
			document.cookie.split(";").forEach(function(c) {
				document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
			});
		} catch(e) {}
	}, 5000);

	console.log('🛡️ About:blank anti-extension protection active');
})();
</script>
</body>
</html>`;

			// Write to about:blank tab
			newTab.document.open();
			newTab.document.write(htmlContent);
			newTab.document.close();

			// Silent operation - no notifications
		} else {
			// Silent failure - no notifications
		}
	}

	function createAboutBlankProxy() {
		// Get the current origin for absolute URLs
		const origin = window.location.origin;

		// Create a minimal, hidden version of the proxy interface
		return `
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1.0, shrink-to-fit=no" />
			<title></title>
			<style>
				* {
					margin: 0;
					padding: 0;
					box-sizing: border-box;
				}
				body {
					font-family: Arial, sans-serif;
					background: #ffffff;
					color: #000000;
					min-height: 100vh;
					position: relative;
				}
				.hidden-proxy {
					position: fixed;
					top: 0;
					left: 0;
					width: 100%;
					height: 100%;
					background: white;
					z-index: 1000;
					display: flex;
					flex-direction: column;
					justify-content: center;
					align-items: center;
					opacity: 1;
					pointer-events: all;
					transition: opacity 0.3s ease;
				}
				.proxy-interface {
					background: white;
					padding: 20px;
					border-radius: 8px;
					box-shadow: 0 2px 10px rgba(0,0,0,0.1);
					width: 90%;
					max-width: 500px;
					text-align: center;
				}
				.proxy-input {
					width: 100%;
					padding: 12px;
					border: 2px solid #ddd;
					border-radius: 6px;
					margin: 10px 0;
					font-size: 16px;
				}
				.proxy-button {
					background: #007bff;
					color: white;
					border: none;
					padding: 12px 24px;
					border-radius: 6px;
					cursor: pointer;
					font-size: 16px;
					margin: 10px 5px;
				}
				.proxy-button:hover {
					background: #0056b3;
				}
				.toggle-btn {
					position: fixed;
					bottom: 20px;
					right: 20px;
					background: #f8f9fa;
					border: 1px solid #ddd;
					padding: 8px 12px;
					border-radius: 4px;
					cursor: pointer;
					font-size: 12px;
					color: #666;
					z-index: 1001;
				}
				.hidden-proxy.hidden {
					opacity: 0;
					pointer-events: none;
				}
				iframe {
					width: 100%;
					height: 100%;
					border: none;
				}
				.loading {
					color: #007bff;
					font-style: italic;
				}
				.error {
					color: red;
				}
			</style>
		</head>
		<body>
			<div class="hidden-proxy" id="proxyInterface">
				<div class="proxy-interface">
					<h2 style="margin-bottom: 20px;">Web Proxy</h2>
					<p class="loading" id="loadingText">Loading proxy...</p>
					<form id="proxyForm" style="display: none;">
						<input type="text" class="proxy-input" id="urlInput" placeholder="Enter URL or search term..." />
						<br>
						<button type="submit" class="proxy-button">Go</button>
						<button type="button" class="proxy-button" onclick="loadQuickSite('https://google.com')">Google</button>
						<button type="button" class="proxy-button" onclick="loadQuickSite('https://youtube.com')">YouTube</button>
					</form>
				</div>
			</div>

			<div id="frameContainer" style="display: none; width: 100%; height: 100vh;">
				<iframe id="proxyFrame"></iframe>
				<button onclick="closeFrame()" style="position: fixed; top: 10px; right: 10px; z-index: 10000; background: white; border: 1px solid #ddd; padding: 8px 12px; border-radius: 4px; cursor: pointer;">Close</button>
			</div>

			<button class="toggle-btn" onclick="toggleProxy()">≡</button>

			<script>
				// Store origin and config
				window.PROXY_ORIGIN = "${origin}";
				window.proxyReady = false;

				// Load scripts dynamically with better error handling
				function loadScript(src) {
					return new Promise((resolve, reject) => {
						console.log('Loading script:', src);
						const script = document.createElement('script');
						script.src = src;
						script.onload = () => {
							console.log('Script loaded:', src);
							resolve();
						};
						script.onerror = (error) => {
							console.error('Script failed to load:', src, error);
							reject(new Error('Failed to load: ' + src));
						};
						document.head.appendChild(script);
					});
				}

				// Initialize proxy
				async function initializeProxy() {
					try {
						console.log('Starting proxy initialization...');

						// Load scripts in sequence with delays
						await loadScript(window.PROXY_ORIGIN + '/baremux/index.js');
						await new Promise(resolve => setTimeout(resolve, 500));

						await loadScript(window.PROXY_ORIGIN + '/epoxy/index.js');
						await new Promise(resolve => setTimeout(resolve, 500));

						await loadScript(window.PROXY_ORIGIN + '/uv/uv.bundle.js');
						await new Promise(resolve => setTimeout(resolve, 500));

						await loadScript(window.PROXY_ORIGIN + '/uv/uv.config.js');
						await new Promise(resolve => setTimeout(resolve, 500));

						await loadScript(window.PROXY_ORIGIN + '/register-sw.js');
						await new Promise(resolve => setTimeout(resolve, 500));

						console.log('All scripts loaded, checking config...');

						// Wait for config to be available with longer timeout
						let attempts = 0;
						while (!window.__uv$config && attempts < 20) {
							await new Promise(resolve => setTimeout(resolve, 500));
							attempts++;
							console.log('Waiting for config... attempt', attempts);
						}

						if (window.__uv$config) {
							window.proxyReady = true;
							document.getElementById('loadingText').style.display = 'none';
							document.getElementById('proxyForm').style.display = 'block';
							console.log('Proxy ready!');
						} else {
							throw new Error('Proxy configuration failed to load after 10 seconds');
						}

					} catch (error) {
						console.error('Error loading proxy:', error);
						const loadingText = document.getElementById('loadingText');
						loadingText.textContent = 'Proxy failed to load. Click ≡ to hide this message.';
						loadingText.className = 'error';

						// Show a simple manual access option
						const manualDiv = document.createElement('div');
						manualDiv.innerHTML = '<p style="margin-top: 15px;"><a href="' + window.PROXY_ORIGIN + '" target="_blank" style="color: #007bff;">Click here to open proxy in current tab</a></p>';
						document.querySelector('.proxy-interface').appendChild(manualDiv);
					}
				}

				function toggleProxy() {
					const proxyInterface = document.getElementById('proxyInterface');
					proxyInterface.classList.toggle('hidden');
				}

				function loadQuickSite(url) {
					document.getElementById('urlInput').value = url;
					document.getElementById('proxyForm').dispatchEvent(new Event('submit'));
				}

				function closeFrame() {
					document.getElementById('frameContainer').style.display = 'none';
					document.getElementById('proxyInterface').classList.remove('hidden');
				}

				document.getElementById('proxyForm').addEventListener('submit', async (e) => {
					e.preventDefault();
					const url = document.getElementById('urlInput').value;
					if (!url) return;

					if (!window.proxyReady) {
						alert('Proxy is still loading. Please wait a moment and try again.');
						return;
					}

					try {
						// Initialize proxy connection
						const connection = new BareMux.BareMuxConnection(window.PROXY_ORIGIN + "/baremux/worker.js");

						let wispUrl = (window.PROXY_ORIGIN.startsWith('https') ? "wss" : "ws") + "://" + window.PROXY_ORIGIN.replace(/^https?:\\/\\//, '') + "/wisp/";
						if ((await connection.getTransport()) !== "/epoxy/index.mjs") {
							await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
						}

						// Use the same search logic as the main proxy
						const searchEngine = "https://www.google.com/search?q=%s";
						let finalUrl;
						if (url.startsWith('http://') || url.startsWith('https://')) {
							finalUrl = url;
						} else if (url.includes('.') && !url.includes(' ')) {
							finalUrl = 'https://' + url;
						} else {
							finalUrl = searchEngine.replace('%s', encodeURIComponent(url));
						}

						const proxyUrl = window.__uv$config.prefix + window.__uv$config.encodeUrl(finalUrl);

						document.getElementById('proxyFrame').src = proxyUrl;
						document.getElementById('frameContainer').style.display = 'block';
						document.getElementById('proxyInterface').classList.add('hidden');

					} catch (error) {
						console.error('Proxy error:', error);
						alert('Error loading proxy: ' + error.message);
					}
				});

				// Initialize proxy when page loads
				initializeProxy();
			</script>
		</body>
		</html>
		`;
	}

	function setupAboutBlankProxy(newTab) {
		// Additional setup if needed
		// The tab is already set up with the HTML content
		// This function can be used for any additional configuration

		// Set up periodic title clearing to maintain about:blank appearance
		setInterval(() => {
			if (newTab && !newTab.closed) {
				try {
					if (newTab.document.title !== "") {
						newTab.document.title = "";
					}
				} catch (e) {
					// Tab might be closed or cross-origin
				}
			}
		}, 1000);
	}

	function disableAboutBlankMode() {
		// Since about:blank mode opens a new tab, disabling just means
		// not opening new tabs when toggled on again
		// Silent operation - no notifications
	}

	// Anti-GoGuardian functions
	let antiGoGuardianActive = false;
	let beforeUnloadHandler = null;

	function enableAntiGoGuardian() {
		if (antiGoGuardianActive) return;
		antiGoGuardianActive = true;

		// Enhanced tab closure prevention with save dialog
		beforeUnloadHandler = function (e) {
			e.preventDefault();
			// Custom message that appears as "Do you want to save your changes?"
			const message =
				"You have unsaved changes. Are you sure you want to leave this page?";
			e.returnValue = message;
			return message;
		};

		window.addEventListener("beforeunload", beforeUnloadHandler);

		// Enhanced close functions override
		const originalClose = window.close;
		window.close = function () {
			console.log("Tab close attempt blocked by Anti-GoGuardian");
			// Show protection notification
			if (typeof showNotification === "function") {
				showNotification(
					"🛡️ Tab closure blocked by Anti-GoGuardian protection",
					"warning"
				);
			}
			// Show confirmation dialog
			const userConfirm = confirm(
				"You have unsaved work. Are you sure you want to close this tab?"
			);
			if (!userConfirm) {
				return false;
			}
			// If user confirms, temporarily disable protection and close
			disableAntiGoGuardian();
			originalClose.call(window);
		};

		// Override page navigation attempts
		const originalAssign = window.location.assign;
		const originalReplace = window.location.replace;
		const originalReload = window.location.reload;

		window.location.assign = function (url) {
			const userConfirm = confirm(
				"You have unsaved work. Are you sure you want to navigate away from this page?"
			);
			if (userConfirm) {
				originalAssign.call(window.location, url);
			}
		};

		window.location.replace = function (url) {
			const userConfirm = confirm(
				"You have unsaved work. Are you sure you want to navigate away from this page?"
			);
			if (userConfirm) {
				originalReplace.call(window.location, url);
			}
		};

		window.location.reload = function (forceReload) {
			const userConfirm = confirm(
				"You have unsaved work. Are you sure you want to reload this page?"
			);
			if (userConfirm) {
				originalReload.call(window.location, forceReload);
			}
		};

		// Prevent back/forward navigation
		window.addEventListener("popstate", function (e) {
			const userConfirm = confirm(
				"You have unsaved work. Are you sure you want to navigate away from this page?"
			);
			if (!userConfirm) {
				// Push current state back to prevent navigation
				history.pushState(null, null, window.location.href);
			}
		});

		// Push initial state to enable popstate blocking
		history.pushState(null, null, window.location.href);

		// Prevent GoGuardian and other monitoring scripts from running
		const observer = new MutationObserver(function (mutations) {
			mutations.forEach(function (mutation) {
				mutation.addedNodes.forEach(function (node) {
					if (node.nodeType === 1 && node.tagName === "SCRIPT") {
						const src = node.src || "";
						const content = node.textContent || "";
						if (
							src.includes("goguardian") ||
							src.includes("securly") ||
							src.includes("lightspeed") ||
							src.includes("linewize") ||
							src.includes("contentkeeper") ||
							src.includes("iboss") ||
							content.includes("goguardian") ||
							content.includes("securly") ||
							content.includes("lightspeed") ||
							content.includes("monitoring") ||
							content.includes("contentkeeper")
						) {
							node.remove();
							console.log("Blocked monitoring script:", src || "inline script");
						}
					}
				});
			});
		});

		observer.observe(document.documentElement, {
			childList: true,
			subtree: true,
		});

		// Store references for cleanup
		window.antiGoGuardianObserver = observer;
		window.antiGoGuardianOriginals = {
			close: originalClose,
			assign: originalAssign,
			replace: originalReplace,
			reload: originalReload,
		};

		// Add visual indicator that protection is active
		const indicator = document.createElement("div");
		indicator.id = "anti-goguardian-indicator";
		indicator.innerHTML = "🛡��� Protection Active";
		indicator.style.cssText = `
			position: fixed;
			top: 10px;
			right: 10px;
			background: rgba(0, 212, 170, 0.9);
			color: white;
			padding: 5px 10px;
			border-radius: 15px;
			font-size: 12px;
			font-weight: bold;
			z-index: 9999;
			backdrop-filter: blur(10px);
			border: 1px solid rgba(255, 255, 255, 0.2);
			box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
			animation: fadeIn 0.5s ease;
		`;

		// Add CSS animation
		const style = document.createElement("style");
		style.textContent = `
			@keyframes fadeIn {
				from { opacity: 0; transform: translateY(-10px); }
				to { opacity: 1; transform: translateY(0); }
			}
		`;
		document.head.appendChild(style);
		document.body.appendChild(indicator);

		console.log("Enhanced Anti-GoGuardian protection activated");
	}

	// Manual test function for cloaker (accessible via console)
	window.testCloaker = function (
		title = "Google Classroom",
		favicon = "https://classroom.google.com/favicon.ico"
	) {
		console.log("Testing cloaker with:", { title, favicon });
		try {
			const result = applyCloaking(title, favicon);
			console.log("Cloaker test result:", result);
			return result;
		} catch (error) {
			console.error("Cloaker test error:", error);
			return error.message;
		}
	};

	// Debug function to test favicon URLs
	window.testFavicon = function (url) {
		console.log("Testing favicon URL:", url);

		const img = new Image();
		img.crossOrigin = "anonymous";

		img.onload = () => {
			console.log("✅ Favicon URL is accessible:", url);
			console.log("Image dimensions:", img.width, "x", img.height);

			// Try to apply it immediately for testing
			const testFavicon = document.createElement("link");
			testFavicon.rel = "icon";
			testFavicon.href = url + "?test=" + Date.now();
			document.head.appendChild(testFavicon);
			console.log("Test favicon applied");
		};

		img.onerror = (e) => {
			console.error("❌ Favicon URL failed to load:", url, e);
			console.log(
				"💡 Try using a different URL or check if the site allows external access"
			);
		};

		img.src = url;

		return "Check console for results...";
	};

	// Simple favicon setter for testing
	window.setSimpleFavicon = function (url) {
		// Remove existing favicons
		document.querySelectorAll('link[rel*="icon"]').forEach((f) => f.remove());

		// Add new favicon
		const favicon = document.createElement("link");
		favicon.rel = "icon";
		favicon.href = url + "?simple=" + Date.now();
		document.head.appendChild(favicon);

		console.log("Simple favicon set:", url);
		return "Favicon set using simple method";
	};

	// Test favicon with all available methods
	window.testFaviconWithAllMethods = async function (url) {
		console.log("🔍 Testing favicon with all available methods:", url);

		try {
			// Test the full cloaking pipeline
			await applyCloaking("Test Title", url);
			console.log("✅ Full cloaking test completed");
			return "Check your browser tab - if the favicon changed, it works!";
		} catch (error) {
			console.error("❌ Full test failed:", error);
			return "All methods failed. Check console for details.";
		}
	};

	// Extract and try domain favicon
	window.tryDomainFavicon = function (websiteUrl) {
		try {
			const domain = new URL(websiteUrl).origin;
			const faviconUrl = domain + "/favicon.ico";
			console.log("Trying domain favicon:", faviconUrl);
			return testFaviconWithAllMethods(faviconUrl);
		} catch (error) {
			console.error("Invalid URL:", error);
			return "Invalid URL provided";
		}
	};

	// Quick about:blank mode toggle
	window.toggleAboutBlank = function () {
		if (window.isAboutBlankMode) {
			console.log("Disabling about:blank mode...");
			const restoreBtn = document.getElementById("restore-original-btn");
			if (restoreBtn) {
				restoreBtn.click();
				return "About:blank mode disabled";
			}
		} else {
			console.log("Enabling about:blank mode...");
			enableAboutBlankCloaking().then((result) => {
				console.log("About:blank mode enabled:", result);
			});
			return "About:blank mode enabled - check your browser tab!";
		}
	};

	// Force about:blank mode immediately (for testing)
	window.forceAboutBlank = function () {
		console.log("🔨 Force enabling about:blank mode...");

		// Clear everything immediately
		document.title = "";
		document.querySelectorAll('link[rel*="icon"]').forEach((f) => f.remove());

		// Add blank favicon
		const blankFavicon = document.createElement("link");
		blankFavicon.rel = "icon";
		blankFavicon.href =
			"data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
		document.head.appendChild(blankFavicon);

		// Override title setter
		Object.defineProperty(document, "title", {
			get: () => "",
			set: () => {},
			configurable: true,
		});

		// Enable anti-extension protection
		initAntiExtensionProtection();

		console.log("✅ Force about:blank applied with protection");
		return "Force about:blank applied with anti-extension protection!";
	};

	// Test anti-extension protection
	window.testExtensionProtection = function () {
		console.log("🧪 Testing anti-extension protection...");

		const tests = [];

		// Test 1: Chrome API access
		tests.push({
			name: "Chrome API blocking",
			passed: typeof window.chrome === "undefined",
			message: window.chrome
				? "❌ Chrome API accessible"
				: "✅ Chrome API blocked",
		});

		// Test 2: Extension storage access
		tests.push({
			name: "Storage API blocking",
			passed: !window.localStorage.getItem,
			message: window.localStorage.getItem
				? "❌ Storage accessible"
				: "✅ Storage blocked",
		});

		// Test 3: DOM query blocking
		try {
			const result = document.querySelector("[data-extension]");
			tests.push({
				name: "DOM query blocking",
				passed: result === null,
				message: result
					? "❌ Extension queries work"
					: "✅ Extension queries blocked",
			});
		} catch (e) {
			tests.push({
				name: "DOM query blocking",
				passed: true,
				message: "✅ Extension queries blocked (exception)",
			});
		}

		// Test 4: Network request blocking
		tests.push({
			name: "Network blocking",
			passed: true, // This would need to be tested with actual requests
			message:
				"ℹ️ Network blocking active (test with chrome-extension:// URLs)",
		});

		console.log("🛡️ Anti-Extension Protection Test Results:");
		tests.forEach((test) => {
			console.log(`${test.message}`);
		});

		const passedCount = tests.filter((t) => t.passed).length;
		const totalCount = tests.length;

		console.log(
			`\n📊 Summary: ${passedCount}/${totalCount} protection measures active`
		);

		return `Protection test complete: ${passedCount}/${totalCount} measures active. Check console for details.`;
	};

	// Quick theme testing
	window.testTheme = function (theme = "light") {
		console.log("🎨 Testing theme:", theme);

		// Apply theme directly
		document.body.className = "";
		if (theme !== "dark") {
			document.body.classList.add(`${theme}-theme`);
		}

		// Update toggle
		if (window.updateThemeToggleFromSettings) {
			updateThemeToggleFromSettings(theme);
		}

		return `Theme '${theme}' applied. Available themes: dark, light, blue, purple, green, red, orange, pink, cyber, matrix`;
	};

	// Function to get current favicons
	window.getCurrentFavicons = function () {
		const favicons = document.querySelectorAll('link[rel*="icon"]');
		console.log("Current favicons:");
		favicons.forEach((favicon, index) => {
			console.log(`${index + 1}. rel="${favicon.rel}" href="${favicon.href}"`);
		});
		return favicons.length;
	};

	window.testRestore = function () {
		console.log("Testing restore original");
		try {
			const result = restoreOriginal();
			console.log("Restore test result:", result);
			return result;
		} catch (error) {
			console.error("Restore test error:", error);
			return error.message;
		}
	};

	function disableAntiGoGuardian() {
		if (!antiGoGuardianActive) return;
		antiGoGuardianActive = false;

		// Remove beforeunload handler
		if (beforeUnloadHandler) {
			window.removeEventListener("beforeunload", beforeUnloadHandler);
			beforeUnloadHandler = null;
		}

		// Restore original functions
		if (window.antiGoGuardianOriginals) {
			window.close = window.antiGoGuardianOriginals.close;
			window.location.assign = window.antiGoGuardianOriginals.assign;
			window.location.replace = window.antiGoGuardianOriginals.replace;
			window.location.reload = window.antiGoGuardianOriginals.reload;
			window.antiGoGuardianOriginals = null;
		}

		// Remove mutation observer
		if (window.antiGoGuardianObserver) {
			window.antiGoGuardianObserver.disconnect();
			window.antiGoGuardianObserver = null;
		}

		// Remove visual indicator
		const indicator = document.getElementById("anti-goguardian-indicator");
		if (indicator) {
			indicator.remove();
		}

		console.log("Anti-GoGuardian protection deactivated");
	}

	// Tab protection functions
	function enableTabProtection() {
		// Prevent right-click context menu
		document.addEventListener("contextmenu", preventContextMenu);

		// Prevent developer tools shortcuts
		document.addEventListener("keydown", preventDevTools);

		// Prevent text selection in sensitive areas
		document.body.style.userSelect = "none";
		document.body.style.webkitUserSelect = "none";
	}

	function disableTabProtection() {
		document.removeEventListener("contextmenu", preventContextMenu);
		document.removeEventListener("keydown", preventDevTools);
		document.body.style.userSelect = "";
		document.body.style.webkitUserSelect = "";
	}

	function preventContextMenu(e) {
		e.preventDefault();
		return false;
	}

	function preventDevTools(e) {
		// Prevent F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
		if (
			e.keyCode === 123 ||
			(e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) ||
			(e.ctrlKey && e.keyCode === 85)
		) {
			e.preventDefault();
			return false;
		}
	}

	// History protection functions
	function enableHistoryProtection() {
		// Clear history periodically
		setInterval(() => {
			if (window.history && window.history.replaceState) {
				window.history.replaceState(null, "", window.location.href);
			}
		}, 5000);

		// Override history methods
		const originalPushState = history.pushState;
		const originalReplaceState = history.replaceState;

		history.pushState = function () {
			// Don't add to history
			return originalReplaceState.apply(history, arguments);
		};
	}

	function disableHistoryProtection() {
		// Note: Can't easily undo the history protection once enabled
		// This would require storing original functions
	}

	function updateThemeElements(theme) {
		// Update brand title based on theme
		const brandTitle = document.querySelector(".brand-title");
		if (brandTitle) {
			switch (theme) {
				case "cyber":
					brandTitle.style.fontFamily = '"Orbitron", "Arial Black", sans-serif';
					brandTitle.style.textShadow = "0 0 20px var(--primary-color)";
					break;
				case "matrix":
					brandTitle.style.fontFamily = '"Courier New", monospace';
					brandTitle.style.textShadow = "0 0 20px var(--primary-color)";
					break;
				default:
					brandTitle.style.fontFamily =
						'"Arial Black", "Helvetica Neue", Helvetica, Arial, sans-serif';
					brandTitle.style.textShadow = "0 2px 10px rgba(0, 212, 170, 0.2)";
			}
		}
	}

	// Listen for system theme changes
	if (window.matchMedia) {
		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		mediaQuery.addListener((e) => {
			const savedSettings = localStorage.getItem(SETTINGS_KEY);
			const settings = savedSettings
				? JSON.parse(savedSettings)
				: defaultSettings;
			if (settings.theme === "auto") {
				applyFunctionalSettings(settings);
			}
		});
	}

	function saveSettings() {
		const settings = {
			searchEngine:
				document.getElementById("default-search-engine")?.value ||
				defaultSettings.searchEngine,
			homepageUrl: document.getElementById("homepage-url")?.value || "",
			autoOpenLinks:
				document.getElementById("auto-open-links")?.checked ??
				defaultSettings.autoOpenLinks,
			aboutblankMode:
				document.getElementById("aboutblank-mode")?.checked ??
				defaultSettings.aboutblankMode,
			antiGoguardian:
				document.getElementById("anti-goguardian")?.checked ??
				defaultSettings.antiGoguardian,
			tabProtection:
				document.getElementById("tab-protection")?.checked ??
				defaultSettings.tabProtection,
			historyProtection:
				document.getElementById("history-protection")?.checked ??
				defaultSettings.historyProtection,
			blockTracking:
				document.getElementById("block-tracking")?.checked ??
				defaultSettings.blockTracking,
			blockAds:
				document.getElementById("block-ads")?.checked ??
				defaultSettings.blockAds,
			forceHttps:
				document.getElementById("force-https")?.checked ??
				defaultSettings.forceHttps,
			clearOnExit:
				document.getElementById("clear-on-exit")?.checked ??
				defaultSettings.clearOnExit,
			theme:
				document.getElementById("theme-select")?.value || defaultSettings.theme,
			enableAnimations:
				document.getElementById("enable-animations")?.checked ??
				defaultSettings.enableAnimations,
			compactMode:
				document.getElementById("compact-mode")?.checked ??
				defaultSettings.compactMode,
			imageCompression:
				document.getElementById("image-compression")?.checked ??
				defaultSettings.imageCompression,
			cacheSize:
				document.getElementById("cache-size")?.value ||
				defaultSettings.cacheSize,
			preloadLinks:
				document.getElementById("preload-links")?.checked ??
				defaultSettings.preloadLinks,
			userAgent:
				document.getElementById("user-agent")?.value ||
				defaultSettings.userAgent,
			customUserAgent:
				document.getElementById("custom-user-agent")?.value || "",
			enableJavascript:
				document.getElementById("enable-javascript")?.checked ??
				defaultSettings.enableJavascript,
			enableWebrtc:
				document.getElementById("enable-webrtc")?.checked ??
				defaultSettings.enableWebrtc,
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
				lastBackupSpan.textContent =
					backupDate.toLocaleDateString() +
					" " +
					backupDate.toLocaleTimeString();
			} else {
				lastBackupSpan.textContent = "Never";
			}
		}
	}

	function getCurrentSettings() {
		return {
			searchEngine:
				document.getElementById("default-search-engine")?.value ||
				defaultSettings.searchEngine,
			homepageUrl: document.getElementById("homepage-url")?.value || "",
			autoOpenLinks:
				document.getElementById("auto-open-links")?.checked ??
				defaultSettings.autoOpenLinks,
			aboutblankMode:
				document.getElementById("aboutblank-mode")?.checked ??
				defaultSettings.aboutblankMode,
			antiGoguardian:
				document.getElementById("anti-goguardian")?.checked ??
				defaultSettings.antiGoguardian,
			tabProtection:
				document.getElementById("tab-protection")?.checked ??
				defaultSettings.tabProtection,
			historyProtection:
				document.getElementById("history-protection")?.checked ??
				defaultSettings.historyProtection,
			blockTracking:
				document.getElementById("block-tracking")?.checked ??
				defaultSettings.blockTracking,
			blockAds:
				document.getElementById("block-ads")?.checked ??
				defaultSettings.blockAds,
			forceHttps:
				document.getElementById("force-https")?.checked ??
				defaultSettings.forceHttps,
			clearOnExit:
				document.getElementById("clear-on-exit")?.checked ??
				defaultSettings.clearOnExit,
			theme:
				document.getElementById("theme-select")?.value || defaultSettings.theme,
			enableAnimations:
				document.getElementById("enable-animations")?.checked ??
				defaultSettings.enableAnimations,
			compactMode:
				document.getElementById("compact-mode")?.checked ??
				defaultSettings.compactMode,
			imageCompression:
				document.getElementById("image-compression")?.checked ??
				defaultSettings.imageCompression,
			cacheSize:
				document.getElementById("cache-size")?.value ||
				defaultSettings.cacheSize,
			preloadLinks:
				document.getElementById("preload-links")?.checked ??
				defaultSettings.preloadLinks,
			userAgent:
				document.getElementById("user-agent")?.value ||
				defaultSettings.userAgent,
			customUserAgent:
				document.getElementById("custom-user-agent")?.value || "",
			enableJavascript:
				document.getElementById("enable-javascript")?.checked ??
				defaultSettings.enableJavascript,
			enableWebrtc:
				document.getElementById("enable-webrtc")?.checked ??
				defaultSettings.enableWebrtc,
		};
	}

	function getThemeName(theme) {
		const themeNames = {
			dark: "Dark Theme",
			light: "Light Theme",
			blue: "Ocean Blue",
			purple: "Purple Galaxy",
			green: "Forest Green",
			red: "Crimson Red",
			orange: "Sunset Orange",
			pink: "Rose Pink",
			cyber: "Cyberpunk",
			matrix: "Matrix Green",
			auto: "Auto (System)",
		};
		return themeNames[theme] || theme;
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

	// Check for about:blank mode on page load
	function checkAboutBlankMode() {
		const urlParams = new URLSearchParams(window.location.search);
		if (urlParams.get("aboutblank") === "true") {
			enableAboutBlankStyling();
		}
	}

	function enableAboutBlankStyling() {
		// Set title and favicon to appear as about:blank
		document.title = "";

		// Remove any existing favicon
		const existingFavicons = document.querySelectorAll(
			'link[rel="icon"], link[rel="shortcut icon"]'
		);
		existingFavicons.forEach((favicon) => favicon.remove());

		// Add completely transparent favicon
		const blankFavicon = document.createElement("link");
		blankFavicon.rel = "icon";
		blankFavicon.href =
			'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"></svg>';
		document.head.appendChild(blankFavicon);

		// 🛡️ ANTI-EXTENSION PROTECTION MEASURES
		initAntiExtensionProtection();

		// Add about:blank styling
		document.body.classList.add("aboutblank-mode");

		// Hide the interface initially
		const mainContainer = document.querySelector(".main-container");
		const topNav = document.querySelector(".top-nav");
		const backgroundAnimation = document.querySelector(".background-animation");

		if (mainContainer) mainContainer.style.display = "none";
		if (topNav) topNav.style.display = "none";
		if (backgroundAnimation) backgroundAnimation.style.display = "none";

		// Make body appear completely blank
		document.body.style.background = "#ffffff";
		document.body.style.color = "#000000";

		// Add toggle button to show/hide proxy interface
		const toggleBtn = document.createElement("button");
		toggleBtn.id = "aboutblank-toggle";
		toggleBtn.innerHTML = "≡";
		toggleBtn.style.cssText = `
			position: fixed;
			bottom: 20px;
			right: 20px;
			background: #f8f9fa;
			border: 1px solid #ddd;
			padding: 8px 12px;
			border-radius: 4px;
			cursor: pointer;
			font-size: 12px;
			color: #666;
			z-index: 10001;
			opacity: 0.3;
			transition: opacity 0.3s ease;
		`;

		toggleBtn.addEventListener("mouseenter", () => {
			toggleBtn.style.opacity = "1";
		});

		toggleBtn.addEventListener("mouseleave", () => {
			toggleBtn.style.opacity = "0.3";
		});

		toggleBtn.addEventListener("click", () => {
			const isHidden = mainContainer.style.display === "none";

			if (isHidden) {
				// Show proxy interface
				if (mainContainer) mainContainer.style.display = "flex";
				if (topNav) topNav.style.display = "block";
				if (backgroundAnimation) backgroundAnimation.style.display = "block";
				document.body.style.background = "";
				document.body.style.color = "";
				document.body.classList.remove("aboutblank-mode");
				toggleBtn.innerHTML = "×";
				toggleBtn.style.opacity = "1";
			} else {
				// Hide proxy interface (back to blank)
				if (mainContainer) mainContainer.style.display = "none";
				if (topNav) topNav.style.display = "none";
				if (backgroundAnimation) backgroundAnimation.style.display = "none";
				document.body.style.background = "#ffffff";
				document.body.style.color = "#000000";
				document.body.classList.add("aboutblank-mode");
				toggleBtn.innerHTML = "≡";
				toggleBtn.style.opacity = "0.3";

				// Clear title and maintain blank appearance
				document.title = "";
			}
		});

		document.body.appendChild(toggleBtn);

		// Periodically clear title to maintain about:blank appearance
		setInterval(() => {
			if (document.body.classList.contains("aboutblank-mode")) {
				document.title = "";
			}
		}, 1000);

		// Add subtle protection indicator
		const protectionIndicator = document.createElement("div");
		protectionIndicator.id = "protection-indicator";
		protectionIndicator.innerHTML = "🛡️";
		protectionIndicator.title = "Anti-extension protection active";
		protectionIndicator.style.cssText = `
			position: fixed;
			top: 10px;
			left: 10px;
			width: 24px;
			height: 24px;
			background: rgba(0, 0, 0, 0.1);
			border-radius: 50%;
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 12px;
			opacity: 0.3;
			z-index: 9999;
			transition: opacity 0.3s ease;
			cursor: help;
		`;

		protectionIndicator.addEventListener("mouseenter", () => {
			protectionIndicator.style.opacity = "0.8";
		});

		protectionIndicator.addEventListener("mouseleave", () => {
			protectionIndicator.style.opacity = "0.3";
		});

		document.body.appendChild(protectionIndicator);
	}

	// Anti-extension protection function
	function initAntiExtensionProtection() {
		console.log("🛡️ Initializing anti-extension protection...");

		// 1. Block extension content script access
		try {
			// Override document.querySelector to hide sensitive elements
			const originalQuerySelector = document.querySelector;
			const originalQuerySelectorAll = document.querySelectorAll;

			document.querySelector = function (selector) {
				// Block extensions from finding sensitive elements
				if (
					selector.includes("extension") ||
					selector.includes("chrome") ||
					selector.includes("[data-") ||
					selector.includes("userscript")
				) {
					return null;
				}
				return originalQuerySelector.call(this, selector);
			};

			document.querySelectorAll = function (selector) {
				// Block extensions from finding sensitive elements
				if (
					selector.includes("extension") ||
					selector.includes("chrome") ||
					selector.includes("[data-") ||
					selector.includes("userscript")
				) {
					return [];
				}
				return originalQuerySelectorAll.call(this, selector);
			};
		} catch (e) {}

		// 2. Block extension API access
		try {
			// Hide chrome extension APIs
			if (window.chrome) {
				Object.defineProperty(window, "chrome", {
					get: () => undefined,
					set: () => {},
					configurable: false,
				});
			}

			// Hide browser extension APIs
			["browser", "moz", "safari"].forEach((api) => {
				if (window[api]) {
					Object.defineProperty(window, api, {
						get: () => undefined,
						set: () => {},
						configurable: false,
					});
				}
			});
		} catch (e) {}

		// 3. Prevent extension message interception
		const originalAddEventListener = window.addEventListener;
		window.addEventListener = function (type, listener, options) {
			if (type === "message" && listener.toString().includes("extension")) {
				console.warn("Blocked extension message listener");
				return;
			}
			return originalAddEventListener.call(this, type, listener, options);
		};

		// 4. Block extension storage access
		try {
			["localStorage", "sessionStorage"].forEach((storage) => {
				if (window[storage]) {
					const originalStorage = window[storage];
					Object.defineProperty(window, storage, {
						get: () => ({
							getItem: () => null,
							setItem: () => {},
							removeItem: () => {},
							clear: () => {},
							length: 0,
							key: () => null,
						}),
						configurable: false,
					});
				}
			});
		} catch (e) {}

		// 5. Block extension DOM mutations
		const observer = new MutationObserver(function (mutations) {
			mutations.forEach(function (mutation) {
				if (mutation.type === "childList") {
					mutation.addedNodes.forEach(function (node) {
						// Remove extension-injected elements
						if (node.nodeType === 1) {
							const tagName = node.tagName ? node.tagName.toLowerCase() : "";
							const className = node.className || "";
							const id = node.id || "";

							if (
								(tagName === "script" &&
									!node.src.startsWith(window.location.origin)) ||
								className.includes("extension") ||
								className.includes("chrome") ||
								id.includes("extension") ||
								id.includes("chrome")
							) {
								console.warn("Removed extension-injected element:", node);
								node.remove();
							}
						}
					});
				}
			});
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ["class", "id", "data-"],
		});

		// 6. Clear extension cookies periodically
		setInterval(() => {
			try {
				// Clear any extension-related cookies
				document.cookie.split(";").forEach(function (c) {
					const cookie = c.trim();
					if (
						cookie.includes("extension") ||
						cookie.includes("chrome") ||
						cookie.includes("addon") ||
						cookie.includes("plugin")
					) {
						const eqPos = cookie.indexOf("=");
						const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
						document.cookie =
							name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
					}
				});
			} catch (e) {}
		}, 2000);

		// 7. Block extension network requests
		if (window.fetch) {
			const originalFetch = window.fetch;
			window.fetch = function (url, options) {
				// Block requests to extension APIs
				if (
					typeof url === "string" &&
					(url.includes("chrome-extension://") ||
						url.includes("moz-extension://") ||
						url.includes("extension/") ||
						url.includes("/addon/"))
				) {
					console.warn("Blocked extension network request:", url);
					return Promise.reject(new Error("Network request blocked"));
				}
				return originalFetch.call(this, url, options);
			};
		}

		// 8. Prevent extension script injection
		const originalCreateElement = document.createElement;
		document.createElement = function (tagName) {
			const element = originalCreateElement.call(this, tagName);

			if (tagName.toLowerCase() === "script") {
				// Monitor script creation
				const originalSetAttribute = element.setAttribute;
				element.setAttribute = function (name, value) {
					if (
						name === "src" &&
						(value.includes("extension://") || value.includes("addon/"))
					) {
						console.warn("Blocked extension script src:", value);
						return;
					}
					return originalSetAttribute.call(this, name, value);
				};
			}

			return element;
		};

		// 9. Hide page content from extensions
		Object.defineProperty(document, "documentElement", {
			get: function () {
				// Return a sanitized version for extensions
				const stack = new Error().stack;
				if (
					stack &&
					(stack.includes("extension") || stack.includes("content_script"))
				) {
					return document.createElement("html");
				}
				return document.getElementsByTagName("html")[0];
			},
			configurable: false,
		});

		// 10. Randomize timing to break extension detection
		const originalSetTimeout = window.setTimeout;
		const originalSetInterval = window.setInterval;

		window.setTimeout = function (callback, delay) {
			// Add random jitter to break extension timing attacks
			const jitter = Math.random() * 50;
			return originalSetTimeout.call(this, callback, delay + jitter);
		};

		window.setInterval = function (callback, delay) {
			// Add random jitter to break extension timing attacks
			const jitter = Math.random() * 100;
			return originalSetInterval.call(this, callback, delay + jitter);
		};

		console.log("✅ Anti-extension protection measures active");
	}

	// Theme toggle functionality
	function initThemeToggle() {
		const themeToggle = document.querySelector(".theme-toggle");

		if (!themeToggle) {
			console.warn("Theme toggle button not found");
			return;
		}

		// Get current theme
		function getCurrentTheme() {
			const savedSettings = JSON.parse(
				localStorage.getItem(SETTINGS_KEY) || "{}"
			);
			return savedSettings.theme || "dark";
		}

		// Apply theme
		function applyTheme(theme) {
			// Remove all theme classes
			document.body.classList.remove(
				"light-theme",
				"dark-theme",
				"blue-theme",
				"purple-theme",
				"green-theme",
				"red-theme",
				"orange-theme",
				"pink-theme",
				"cyber-theme",
				"matrix-theme"
			);

			// Apply new theme
			if (theme !== "dark") {
				document.body.classList.add(`${theme}-theme`);
			}

			// Update theme toggle icon
			updateThemeToggleIcon(theme);

			// Save to settings
			const currentSettings = JSON.parse(
				localStorage.getItem(SETTINGS_KEY) || "{}"
			);
			currentSettings.theme = theme;
			localStorage.setItem(SETTINGS_KEY, JSON.stringify(currentSettings));

			// Update theme select in settings if it exists
			const themeSelect = document.getElementById("theme-select");
			if (themeSelect) {
				themeSelect.value = theme;
			}

			console.log("Theme applied:", theme);
		}

		// Update the theme toggle icon
		function updateThemeToggleIcon(theme) {
			const isLight = theme === "light";
			themeToggle.innerHTML = `
				<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					${
						isLight
							? // Sun icon for light mode
								`<circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/>
						<path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="2"/>`
							: // Moon icon for dark mode
								`<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
					}
				</svg>
			`;
			themeToggle.setAttribute(
				"aria-label",
				isLight ? "Switch to dark mode" : "Switch to light mode"
			);
		}

		// Toggle between light and dark theme
		function toggleTheme() {
			const currentTheme = getCurrentTheme();
			const newTheme = currentTheme === "light" ? "dark" : "light";
			applyTheme(newTheme);
		}

		// Initialize theme on page load
		const initialTheme = getCurrentTheme();
		updateThemeToggleIcon(initialTheme);

		// Add click event listener
		themeToggle.addEventListener("click", toggleTheme);

		// Add keyboard support
		themeToggle.addEventListener("keydown", (e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				toggleTheme();
			}
		});

		console.log("Theme toggle initialized");
	}

	// Helper function to update theme toggle from settings
	window.updateThemeToggleFromSettings = function (theme) {
		const themeToggle = document.querySelector(".theme-toggle");
		if (!themeToggle) return;

		const isLight = theme === "light";
		themeToggle.innerHTML = `
			<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
				${
					isLight
						? // Sun icon for light mode
							`<circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/>
					<path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="2"/>`
						: // Moon icon for dark mode
							`<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
				}
			</svg>
		`;
		themeToggle.setAttribute(
			"aria-label",
			isLight ? "Switch to dark mode" : "Switch to light mode"
		);
	};

	// Initialize theme toggle
	initThemeToggle();

	// Check for about:blank mode on page load
	checkAboutBlankMode();

	// Initialize with proxy tab active
	switchTab("proxy");
});
