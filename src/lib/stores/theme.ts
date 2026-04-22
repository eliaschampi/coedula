import { browser } from '$app/environment';
import { writable } from 'svelte/store';

type Theme = 'dark' | 'light';

function getInitialTheme(): Theme {
	if (!browser) {
		return 'light';
	}

	// First check localStorage
	const savedTheme = localStorage.getItem('theme');
	if (savedTheme === 'dark' || savedTheme === 'light') {
		return savedTheme;
	}

	// Then check data-theme attribute
	const theme = document.documentElement.getAttribute('data-theme');
	if (theme === 'dark' || theme === 'light') {
		return theme;
	}

	// Finally fall back to system preference
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemeToDOM(theme: Theme) {
	if (browser) {
		document.documentElement.setAttribute('data-theme', theme);
	}
}

function saveThemeToStorage(theme: Theme) {
	if (browser) {
		localStorage.setItem('theme', theme);
	}
}

function createThemeStore() {
	const initialTheme = getInitialTheme();
	const { subscribe, set, update } = writable<Theme>(initialTheme);

	// Apply initial theme to DOM
	if (browser) {
		applyThemeToDOM(initialTheme);
	}

	const setTheme = (newTheme: Theme) => {
		if (!browser) return;

		applyThemeToDOM(newTheme);
		saveThemeToStorage(newTheme);
		set(newTheme);
	};

	const toggleTheme = () => {
		update((currentTheme) => {
			const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
			applyThemeToDOM(newTheme);
			saveThemeToStorage(newTheme);
			return newTheme;
		});
	};

	const setSystemTheme = (newTheme: Theme) => {
		if (!browser) return;

		applyThemeToDOM(newTheme);
		set(newTheme);
	};

	if (browser) {
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const systemThemeChangeHandler = (e: MediaQueryListEvent) => {
			// Only update if user hasn't set a preference
			if (localStorage.getItem('theme') === null) {
				const newSystemTheme = e.matches ? 'dark' : 'light';
				setSystemTheme(newSystemTheme);
			}
		};

		mediaQuery.addEventListener('change', systemThemeChangeHandler);
	}

	return {
		subscribe,
		setTheme,
		toggle: toggleTheme
	};
}

export const theme = createThemeStore();
