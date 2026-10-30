// WordPress JavaScript coding standards. The plain `recommended` preset also loads TypeScript ESLint,
// which fails to start with the version @wordpress/scripts 27 installs; this one has the same rules without it.
module.exports = {
	root: true,
	extends: [ 'plugin:@wordpress/eslint-plugin/recommended-with-formatting' ],
	env: {
		browser: true,
	},
	settings: {
		react: {
			version: 'detect',
		},
	},
	ignorePatterns: [ 'build/', 'node_modules/', 'src/vendor/' ],
};
