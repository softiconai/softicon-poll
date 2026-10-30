import { __, _n, sprintf } from '@wordpress/i18n';
import { resultRows } from './utils/functions';

// a REST path under the plugin's namespace, for pretty and plain (?rest_route=) permalinks
const endpoint = (api, path, params = {}) => {
	const url = new URL(api, window.location.href);
	const route = url.searchParams.get('rest_route');
	if (route) {
		url.searchParams.set('rest_route', route.replace(/\/?$/, '/') + path);
	} else {
		url.pathname = url.pathname.replace(/\/?$/, '/') + path;
	}
	Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
	return url.toString();
};

const request = async (config, path, { method = 'GET', params, body } = {}) => {
	const send = nonce => fetch(endpoint(config.api, path, params), {
		method,
		credentials: 'same-origin',
		cache: 'no-store',
		headers: { 'Content-Type': 'application/json', ...(nonce ? { 'X-WP-Nonce': nonce } : {}) },
		body: body ? JSON.stringify(body) : undefined
	});
	let response = await send(config.nonce);
	let data = await response.json().catch(() => ({}));
	// a page cached with an old nonce: ask again as a logged-out visitor
	if (config.nonce && 'rest_cookie_invalid_nonce' === data.code) {
		config.nonce = '';
		response = await send('');
		data = await response.json().catch(() => ({}));
	}
	return { ok: response.ok, data };
};

class Poll {
	constructor(el) {
		this.el = el;
		this.config = JSON.parse(el.dataset.alpl || '{}');
		const q = selector => el.querySelector(selector);
		this.form = q('.alpl_form');
		this.inputs = [...el.querySelectorAll('.alpl_input')];
		this.voteButton = q('.alpl_vote');
		this.showButton = q('.alpl_show');
		this.backButton = q('.alpl_back');
		this.results = q('.alpl_results');
		this.total = q('.alpl_total');
		this.message = q('.alpl_message');
		this.rows = [...el.querySelectorAll('.alpl_row')];
		this.state = null;
	}

	init() {
		this.form.addEventListener('submit', event => {
			event.preventDefault();
			this.vote();
		});
		this.inputs.forEach(input => input.addEventListener('change', () => this.limit()));
		this.showButton?.addEventListener('click', () => this.showResults(true));
		this.backButton?.addEventListener('click', () => this.showForm());
		this.load();
	}

	async load() {
		this.el.classList.add('alpl_busy');
		try {
			const { ok, data } = await request(this.config, 'results/' + this.config.id, { params: { post: this.config.post } });
			if (!ok) {
				throw data;
			}
			this.apply(data);
		} catch (error) {
			this.say(error?.message || __('The poll could not be loaded. Please reload the page.', 'softicon-poll'));
		} finally {
			this.el.classList.remove('alpl_busy');
		}
	}

	apply(state) {
		this.state = state;
		this.inputs.forEach(input => {
			input.checked = state.choices.includes(input.value);
		});

		if (!state.open) {
			this.meta(__('This poll is closed.', 'softicon-poll'));
		}

		if (state.canVote) {
			this.showForm();
			return;
		}

		this.lock();
		if (state.results) {
			this.showResults(false);
		} else {
			this.showForm();
		}

		if (state.needsLogin) {
			this.say(__('Please log in to vote.', 'softicon-poll'), this.config.login);
		} else if (state.voted && !state.results) {
			this.say('closed' === this.config.showResults && state.open ? __('Thanks for voting! The results will be shown when the poll closes.', 'softicon-poll') : __('Thanks for voting!', 'softicon-poll'));
		}
	}

	// no more voting from this page
	lock() {
		this.inputs.forEach(input => {
			input.disabled = true;
		});
		this.voteButton.hidden = true;
	}

	showForm() {
		this.form.hidden = false;
		this.results.hidden = true;
		const canVote = !!this.state?.canVote;
		this.voteButton.hidden = !canVote;
		if (this.showButton) {
			this.showButton.hidden = !canVote || !this.state.results;
		}
		if (canVote) {
			this.inputs.forEach(input => {
				input.disabled = false;
			});
			this.limit();
		}
	}

	// peek: the visitor asked to see the results before voting
	showResults(peek) {
		const { results, choices } = this.state;
		const rows = resultRows(results, this.config.format);

		this.rows.forEach(row => {
			const data = rows[row.dataset.option] || { percent: 0, value: '' };
			row.querySelector('.alpl_row_value').textContent = data.value;
			row.classList.toggle('is-mine', choices.includes(row.dataset.option));
			row.classList.toggle('is-top', data.top);
			row.style.setProperty('--alpl-percent', '0%');
		});

		this.total.textContent = this.config.showTotal ? this.totalText(results.voters) : '';
		this.form.hidden = true;
		this.results.hidden = false;
		if (this.backButton) {
			this.backButton.hidden = !peek;
		}

		// two frames so the bars grow from zero
		requestAnimationFrame(() => requestAnimationFrame(() => this.rows.forEach(row => {
			row.style.setProperty('--alpl-percent', (rows[row.dataset.option]?.percent || 0) + '%');
		})));
	}

	totalText(voters) {
		const number = voters.toLocaleString(document.documentElement.lang || undefined);
		return this.config.multiple ?
			/* translators: %s: number of people who voted */
			sprintf(_n('%s voter', '%s voters', voters, 'softicon-poll'), number) :
			/* translators: %s: number of votes */
			sprintf(_n('%s vote', '%s votes', voters, 'softicon-poll'), number);
	}

	// the results as one sentence for screen readers
	summary() {
		const rows = resultRows(this.state.results, this.config.format);
		const parts = this.rows.map(row => row.querySelector('.alpl_row_label').textContent.trim() + ': ' + (rows[row.dataset.option]?.value || ''));
		return parts.join(', ') + '. ' + (this.config.showTotal ? this.totalText(this.state.results.voters) + '.' : '');
	}

	// at most config.max checkboxes
	limit() {
		const checked = this.inputs.filter(input => input.checked).length;
		if (this.config.multiple) {
			const full = checked >= this.config.max;
			this.inputs.forEach(input => {
				input.disabled = full && !input.checked;
			});
		}
		this.voteButton.disabled = !checked;
	}

	async vote() {
		const choices = this.inputs.filter(input => input.checked).map(input => input.value);
		if (!choices.length || !this.state?.canVote) {
			return;
		}

		this.voteButton.disabled = true;
		this.el.classList.add('alpl_busy');
		try {
			const { ok, data } = await request(this.config, 'vote', { method: 'POST', body: { poll: this.config.id, post: this.config.post, choices } });
			if (ok) {
				this.apply(data);
				if (data.results) {
					this.say(__('Thanks for voting!', 'softicon-poll'), '', this.summary());
				}
			} else if (data.data?.state) {
				this.apply(data.data.state);
				this.say(data.message);
			} else {
				this.say(data.message || __('Your vote could not be saved. Please try again.', 'softicon-poll'));
				this.limit();
			}
		} catch (error) {
			this.say(__('Your vote could not be saved. Please try again.', 'softicon-poll'));
			this.limit();
		} finally {
			this.el.classList.remove('alpl_busy');
		}
	}

	// the status line; with a link the text becomes one, extra is read by screen readers only
	say(text, link = '', extra = '') {
		const doc = this.el.ownerDocument;
		const content = link ? Object.assign(doc.createElement('a'), { href: link, textContent: text }) : doc.createTextNode(text);
		const nodes = [content];
		if (extra) {
			nodes.push(Object.assign(doc.createElement('span'), { className: 'screen-reader-text', textContent: ' ' + extra }));
		}
		this.message.replaceChildren(...nodes);
	}

	meta(text) {
		let meta = this.el.querySelector(':scope > .alpl_meta');
		if (!meta) {
			meta = Object.assign(this.el.ownerDocument.createElement('p'), { className: 'alpl_meta' });
			this.el.append(meta);
		}
		meta.textContent = text;
	}
}

const start = el => {
	if (el.alpl) {
		return;
	}
	try {
		el.alpl = new Poll(el);
		el.alpl.init();
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('SoftIcon Poll:', e);
	}
};

// a poll asks the server for its state only when it gets near the screen
const boot = () => {
	const polls = [...document.querySelectorAll('.alpl_poll[data-alpl]')];
	if (!('IntersectionObserver' in window)) {
		polls.forEach(start);
		return;
	}
	const observer = new IntersectionObserver(entries => entries.forEach(entry => {
		if (entry.isIntersecting) {
			observer.unobserve(entry.target);
			start(entry.target);
		}
	}), { rootMargin: '300px 0px' });
	polls.forEach(el => observer.observe(el));
};

if ('loading' === document.readyState) {
	document.addEventListener('DOMContentLoaded', boot);
} else {
	boot();
}
