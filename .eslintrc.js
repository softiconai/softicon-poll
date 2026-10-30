module.exports = {
	settings: {
		react: {
			version: 'detect'
		}
	},
	env: {
		browser: true,
		commonjs: true,
		es2022: true,
		node: true
	},
	extends: [
		'eslint:recommended',
		'plugin:react/recommended'
	],
	globals: {
		wp: 'readonly'
	},
	parserOptions: {
		ecmaFeatures: {
			jsx: true
		},
		ecmaVersion: 'latest',
		sourceType: 'module'
	},
	plugins: [
		'react'
	],
	rules: {
		'no-console': 'warn',
		'no-unused-vars': 'warn',
		'react/prop-types': 'off',
		'react/react-in-jsx-scope': 'off',
		'react/display-name': 'off'
	}
};
