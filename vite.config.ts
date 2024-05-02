import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	base: "https://gabriel-visualthinking.github.io/stl-cost-calculator/",
});
