// Plugins page: the reason form when the plugin is deactivated (React, from wp.element), and the Opt In / Opt Out link.
// Plain JavaScript without a build step, so the vendor folder works on its own; the words come from fs-lite.php.
(function (wp, lite) {
	if (!wp?.element || !lite) {
		return;
	}
	const { createElement: h, createRoot, useEffect, useRef, useState } = wp.element;
	const row = document.querySelector(`tr[data-plugin="${CSS.escape(lite.plugin)}"]`);

	const post = data => fetch(lite.ajax, {
		method: 'POST',
		credentials: 'same-origin',
		body: new URLSearchParams(data)
	}).then(response => response.json());

	const Reasons = ({ form, href, onClose }) => {
		const [reason, setReason] = useState(null);
		const [info, setInfo] = useState('');
		const [busy, setBusy] = useState(false);
		const first = useRef();
		const leave = () => {
			window.location.href = href;
		};

		useEffect(() => {
			first.current?.focus();
			const key = event => 'Escape' === event.key && onClose();
			document.addEventListener('keydown', key);
			return () => document.removeEventListener('keydown', key);
		}, [onClose]);

		const submit = event => {
			event.preventDefault();
			if (!reason) {
				return;
			}
			setBusy(true);
			post({ action: 'softicon_poll_fs_reason', _ajax_nonce: lite.reason, reason: reason.id, info: reason.ask ? info : '' }).finally(leave);
		};

		return h('div', { className: 'alpl-fs-modal', onClick: event => event.target === event.currentTarget && onClose() },
			h('form', { className: 'alpl-fs-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'alpl-fs-deactivate-title', onSubmit: submit },
				h('h2', { id: 'alpl-fs-deactivate-title' }, form.title),
				h('p', null, form.text),
				h('ul', null, form.reasons.map((item, i) => h('li', { key: item.id },
					h('label', null,
						h('input', { type: 'radio', name: 'reason', value: item.id, ref: 0 === i ? first : undefined, checked: reason?.id === item.id, onChange: () => setReason(item) }),
						' ', item.text
					),
					// the text box of the chosen reason only
					item.ask && reason?.id === item.id && h('input', { type: 'text', maxLength: 128, placeholder: item.ask, 'aria-label': item.ask, value: info, autoFocus: true, onChange: event => setInfo(event.target.value) })
				))),
				h('p', { className: 'alpl-fs-small' }, form.note),
				h('div', { className: 'alpl-fs-actions' },
					h('button', { type: 'button', className: 'button-link alpl-fs-skip', onClick: leave }, form.skip),
					h('span', null,
						h('button', { type: 'button', className: 'button alpl-fs-cancel', onClick: onClose }, form.cancel),
						h('button', { type: 'submit', className: 'button button-primary', disabled: !reason || busy }, form.submit)
					)
				)
			)
		);
	};

	const deactivate = row?.querySelector('.deactivate a');
	if (lite.form && deactivate) {
		const box = document.createElement('div');
		document.body.append(box);
		const root = createRoot(box);
		const close = () => {
			root.render(null);
			deactivate.focus();
		};
		deactivate.addEventListener('click', event => {
			event.preventDefault();
			root.render(h(Reasons, { form: lite.form, href: deactivate.href, onClose: close }));
		});
	}

	row?.querySelector('.alpl-fs-tracking')?.addEventListener('click', event => {
		event.preventDefault();
		const link = event.currentTarget;
		const enable = '1' === link.dataset.enable;
		if (!enable && !window.confirm(lite.optOut)) {
			return;
		}
		link.setAttribute('aria-busy', 'true');
		post({ action: 'softicon_poll_fs_tracking', _ajax_nonce: lite.tracking, enable: enable ? '1' : '' }).then(result => {
			if (result.success && result.data?.url) {
				window.location.href = result.data.url;
			} else if (result.success) {
				window.location.reload();
			} else {
				window.alert(result.data?.message || lite.error);
				link.removeAttribute('aria-busy');
			}
		});
	});
}(window.wp, window.softiconPollFsLite));
