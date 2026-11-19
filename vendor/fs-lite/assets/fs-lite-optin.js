// The opt-in screen: its own admin page, like the Freemius SDK's. React from wp.element, plain JavaScript without a
// build step so the vendor folder works on its own; every word comes from fs-lite.php (card()).
// Allow asks the server to send the opt-in; if the host blocks that, the browser posts the same fields to Freemius,
// which sends the keys back. Skip is a form to admin-post.php. After Allow, Freemius may email a confirmation link:
// the screen then says where the email went and to look in the spam folder.
(function (wp, card) {
	const root = document.getElementById('alpl-fs-optin');
	if (!wp?.element || !card || !root) {
		return;
	}
	const { createElement: h, createRoot, useState } = wp.element;

	const sendFromBrowser = ({ action, fields }) => {
		const form = document.createElement('form');
		form.method = 'post';
		form.action = action;
		Object.entries(fields).forEach(([name, value]) => {
			const input = document.createElement('input');
			input.type = 'hidden';
			input.name = name;
			input.value = 'boolean' === typeof value ? (value ? '1' : '0') : String(value ?? '');
			form.append(input);
		});
		document.body.append(form);
		form.submit();
	};

	// WordPress, a dotted line and the plugin's icon, as on the SDK's screen
	const Logos = ({ mail }) => h('div', { className: 'alpl-fs-logos', 'aria-hidden': 'true' },
		h('span', { className: 'alpl-fs-logo dashicons dashicons-wordpress' }),
		h('span', { className: 'alpl-fs-dots' }, h('i'), h('i'), h('i')),
		mail ? h('span', { className: 'alpl-fs-logo alpl-fs-logo-mail dashicons dashicons-email-alt' })
			: card.icon ? h('img', { className: 'alpl-fs-logo-plugin', src: card.icon, alt: '', width: 72, height: 72 }) : null
	);

	const Footer = () => h('p', { className: 'alpl-fs-footer' },
		card.footer.powered, ' · ',
		h('a', { href: card.footer.privacy.url, target: '_blank', rel: 'noopener noreferrer' }, card.footer.privacy.label), ' · ',
		h('a', { href: card.footer.terms.url, target: '_blank', rel: 'noopener noreferrer' }, card.footer.terms.label)
	);

	const Screen = () => {
		const [busy, setBusy] = useState(false);
		const [error, setError] = useState('');
		const pending = card.pending;

		const allow = () => {
			setBusy(true);
			setError('');
			fetch(card.ajax, { method: 'POST', credentials: 'same-origin', body: new URLSearchParams({ action: card.allow.action, _ajax_nonce: card.allow.nonce }) })
				.then(response => response.json())
				.then(result => {
					if (result.success && result.data.browser) {
						sendFromBrowser(result.data.browser);
					} else if (result.success) {
						window.location.href = result.data.next;
					} else {
						throw new Error();
					}
				})
				.catch(() => {
					setBusy(false);
					setError(card.allow.error);
				});
		};

		// waiting for the click in the confirmation email
		if (pending) {
			return h('div', { className: 'alpl-fs-card' },
				h(Logos, { mail: true }),
				h('div', { className: 'alpl-fs-body' },
					h('h1', null, pending.title),
					h('p', null, pending.sent, ' ', h('strong', null, pending.email)),
					h('p', null, pending.click),
					h('div', { className: 'alpl-fs-spam', role: 'note' },
						h('span', { className: 'dashicons dashicons-warning', 'aria-hidden': 'true' }),
						h('p', null, h('strong', null, pending.spamTitle), ' ', pending.spam)
					),
					error && h('p', { className: 'alpl-fs-error', role: 'alert' }, error)
				),
				h('div', { className: 'alpl-fs-buttons' },
					h('a', { className: 'button button-primary button-large', href: card.dashboard }, pending.dashboard),
					h('button', { type: 'button', className: 'button button-large', onClick: allow, disabled: busy, 'aria-busy': busy }, busy ? card.allow.busy : pending.resend)
				),
				h(Footer)
			);
		}

		return h('div', { className: 'alpl-fs-card' },
			h(Logos),
			h('div', { className: 'alpl-fs-body' },
				h('h1', null, card.title),
				h('p', null, card.text),
				h('details', null,
					h('summary', null, card.shared),
					h('ul', null, card.permissions.map(item => h('li', { key: item.title },
						h('span', { className: 'dashicons dashicons-' + item.icon, 'aria-hidden': 'true' }),
						h('span', null, h('strong', null, item.title), h('br'), item.text)
					))),
					h('p', { className: 'alpl-fs-note' }, card.note)
				),
				error && h('p', { className: 'alpl-fs-error', role: 'alert' }, error)
			),
			h('div', { className: 'alpl-fs-buttons' },
				h('button', { type: 'button', className: 'button button-primary button-large alpl-fs-allow', onClick: allow, disabled: busy, 'aria-busy': busy }, busy ? card.allow.busy : card.allow.label),
				card.skip && h('form', { method: 'post', action: card.form },
					h('input', { type: 'hidden', name: 'action', value: card.skip.action }),
					h('input', { type: 'hidden', name: '_wpnonce', value: card.skip.nonce }),
					h('button', { type: 'submit', className: 'button button-large' }, card.skip.label)
				)
			),
			h(Footer)
		);
	};

	createRoot(root).render(h(Screen));
}(window.wp, window.softiconPollFsOptIn));
