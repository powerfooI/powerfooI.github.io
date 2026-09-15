/*
 * Dark mode toggle: cycles 跟随系统 (auto) -> 浅色 (light) -> 深色 (dark).
 * Preference persists in localStorage; giscus theme is kept in sync.
 * The initial data-theme attribute is set by an inline bootstrap script in
 * <head> (injected at build time) to avoid a flash of the wrong theme.
 */
(() => {
	var STORAGE_KEY = "preferred-theme";
	var MODES = ["auto", "light", "dark"];
	var LABELS = {
		auto: "主题：跟随系统（点击切换为浅色）",
		light: "主题：浅色（点击切换为深色）",
		dark: "主题：深色（点击切换为跟随系统）",
	};
	var ICONS = {
		auto: "fas fa-adjust",
		light: "fas fa-sun",
		dark: "fas fa-moon",
	};

	var root = document.documentElement;
	var media = window.matchMedia("(prefers-color-scheme: dark)");

	function savedMode() {
		try {
			var mode = localStorage.getItem(STORAGE_KEY);
			return MODES.indexOf(mode) >= 0 ? mode : "auto";
		} catch (e) {
			return "auto";
		}
	}

	function resolve(mode) {
		if (mode === "auto") return media.matches ? "dark" : "light";
		return mode;
	}

	function syncGiscus(theme) {
		var iframe = document.querySelector("iframe.giscus-frame");
		if (!iframe || !iframe.contentWindow) return;
		iframe.contentWindow.postMessage(
			{ giscus: { setConfig: { theme: theme } } },
			"https://giscus.app",
		);
	}

	function apply(mode) {
		var theme = resolve(mode);
		root.setAttribute("data-theme", theme);
		root.setAttribute("data-theme-mode", mode);

		var meta = document.querySelector('meta[name="theme-color"]');
		if (meta) {
			meta.setAttribute("content", theme === "dark" ? "#1b212b" : "#3273dc");
		}

		var toggle = document.querySelector(".dark-mode-toggle");
		if (toggle) {
			toggle.setAttribute("title", LABELS[mode]);
			toggle.setAttribute("aria-label", LABELS[mode]);
			var icon = toggle.querySelector("i");
			if (icon) icon.className = ICONS[mode];
		}

		syncGiscus(theme);
	}

	function setMode(mode) {
		try {
			localStorage.setItem(STORAGE_KEY, mode);
		} catch (e) {
			/* private mode: session-only preference */
		}
		apply(mode);
	}

	function installToggle() {
		var navbarEnd = document.querySelector(".navbar-main .navbar-end");
		if (!navbarEnd || navbarEnd.querySelector(".dark-mode-toggle")) return;

		var toggle = document.createElement("a");
		toggle.className = "navbar-item dark-mode-toggle";
		toggle.setAttribute("role", "button");
		toggle.setAttribute("tabindex", "0");
		var icon = document.createElement("i");
		icon.className = "fas fa-adjust";
		toggle.appendChild(icon);
		function cycle() {
			var next = MODES[(MODES.indexOf(savedMode()) + 1) % MODES.length];
			setMode(next);
		}
		toggle.addEventListener("click", cycle);
		toggle.addEventListener("keydown", (event) => {
			if (event.key === "Enter" || event.key === " ") {
				event.preventDefault();
				cycle();
			}
		});

		navbarEnd.insertBefore(toggle, navbarEnd.firstChild);
		apply(queryOverride || savedMode());
	}

	// Follow OS-level changes while in auto mode.
	function onSystemChange() {
		if (savedMode() === "auto") apply("auto");
	}
	if (media.addEventListener) media.addEventListener("change", onSystemChange);
	else if (media.addListener) media.addListener(onSystemChange);

	// Optional ?theme=light|dark override for previews/testing.
	var query = new URLSearchParams(window.location.search).get("theme");
	var queryOverride = query === "light" || query === "dark" ? query : null;

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", installToggle);
	} else {
		installToggle();
	}

	// giscus iframe loads lazily; re-sync once it appears. Only watch on
	// pages that actually embed giscus (article pages), so listing pages
	// don't pay for a document-wide MutationObserver.
	if (document.querySelector('script[src*="giscus.app"]')) {
		var giscusObserver = new MutationObserver(() => {
			if (document.querySelector("iframe.giscus-frame")) {
				syncGiscus(resolve(queryOverride || savedMode()));
				giscusObserver.disconnect();
			}
		});
		giscusObserver.observe(document.documentElement, {
			childList: true,
			subtree: true,
		});
	}
})();
