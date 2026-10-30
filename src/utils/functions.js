import { __, _n, sprintf } from '@wordpress/i18n';

// percent and label per answer, the same for the page and the editor preview;
// percent is of the people who voted, so with several answers each the shares can add up past 100
export const resultRows = (results, format) => {
	const { counts = {}, voters = 0 } = results || {};
	const top = Math.max(0, ...Object.values(counts));
	const lang = document.documentElement.lang || undefined;

	return Object.fromEntries(Object.entries(counts).map(([id, count]) => {
		const percent = voters ? Math.round((count / voters) * 100) : 0;
		/* translators: %d: a share of the votes, like 40 */
		const share = sprintf(__('%d%%', 'softicon-poll'), percent);
		/* translators: %s: number of votes */
		const votes = sprintf(_n('%s vote', '%s votes', count, 'softicon-poll'), count.toLocaleString(lang));
		const value = 'percent' === format ? share : 'count' === format ? votes : share + ' · ' + votes;
		return [id, { percent, value, top: count > 0 && count === top }];
	}));
};

// ids made in the editor: a poll's lives in the votes table, an answer's only inside its poll
const randomId = length => {
	const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
	const bytes = window.crypto.getRandomValues(new Uint8Array(length));
	return [...bytes].map(byte => chars[byte % chars.length]).join('');
};

export const newPollId = () => randomId(12);

export const newOptionId = options => {
	let id;
	do {
		id = 'o' + randomId(5);
	} while (options.some(option => option.id === id));
	return id;
};

export const cssVars = ({ bgColor, textColor, accentColor, barBgColor, borderColor }) => ({
	'--alpl-bg': bgColor || undefined,
	'--alpl-text': textColor || undefined,
	'--alpl-accent': accentColor || undefined,
	'--alpl-bar-bg': barBgColor || undefined,
	'--alpl-border': borderColor || undefined
});

// media library items and fresh uploads keep the alt text in different places
export const toImage = media => ({
	id: media.id,
	url: media.sizes?.medium?.url || media.url || media.source_url,
	alt: media.alt || media.alt_text || ''
});

export const hasText = html => '' !== (html || '').replace(/<[^>]*>/g, '').trim();
