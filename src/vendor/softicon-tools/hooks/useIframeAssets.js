import { useEffect } from '@wordpress/element';
import { useRefEffect } from '@wordpress/compose';

// WordPress prints a handle's inline parts next to its main tag, with these ids
const parts = id => {
	if (id.endsWith('-js')) {
		const handle = id.slice(0, -3);
		return { before: [`${handle}-js-translations`, `${handle}-js-extra`, `${handle}-js-before`], main: id, after: [`${handle}-js-after`] };
	}
	if (id.endsWith('-css')) {
		return { before: [], main: id, after: [`${id.slice(0, -4)}-inline-css`] };
	}
	return { before: [], main: id, after: [] };
};

// a cloned <script> never runs, so scripts are rebuilt; async off keeps them in the order added
const copy = (el, doc) => {
	if ('SCRIPT' !== el.tagName) {
		return doc.importNode(el, true);
	}
	const script = doc.createElement('script');
	[...el.attributes].forEach(({ name, value }) => script.setAttribute(name, value));
	script.async = false;
	script.text = el.text;
	return script;
};

/**
 * @param {string[]} ids    Element ids as WordPress prints them: `{handle}-css`, `{handle}-js`.
 *                          The handle's inline styles and inline/translation scripts come along.
 * @param {Document} target Document to copy into, usually the editor canvas iframe.
 * @param {Document} source Document to copy from, the top window by default.
 * @return {string[]} Ids that were copied.
 */
export const copyAssets = (ids, target, source = document) => {
	const copied = [];
	if (!target?.head || target === source) {
		return copied;
	}
	const add = (id, parent = target.head) => {
		const el = source.getElementById(id);
		if (!el || target.getElementById(id)) {
			return null;
		}
		const node = copy(el, target);
		parent.appendChild(node);
		copied.push(id);
		return node;
	};

	ids.filter(Boolean).forEach(id => {
		const { before, main, after } = parts(id);
		before.forEach(part => add(part));
		const node = add(main);
		// an inline "after" script must wait until the main file has loaded and run
		if (node && 'SCRIPT' === node.tagName && node.src) {
			node.addEventListener('load', () => after.forEach(part => add(part)), { once: true });
		} else {
			after.forEach(part => add(part));
		}
	});
	return copied;
};

/**
 * Makes sure a block's stylesheets and scripts exist inside the block editor canvas iframe.
 *
 * WordPress puts block assets into the iframe when the editor opens. A block installed while
 * editing, from a search in the block inserter (the block directory), gets its assets loaded in
 * the top window only, so the block shows up unstyled. This copies the given ids across.
 *
 * Usage in a block's Edit component:
 *
 *     const assetsRef = useIframeAssets( [ 'my-block-style-css', 'swiper-css', 'swiper-js' ] );
 *     const blockProps = useBlockProps( { ref: assetsRef } ); // optional, see below
 *
 * Ids are the element ids WordPress prints: `{handle}-css` for styles, `{handle}-js` for scripts.
 * A handle's inline styles (`-inline-css`) and inline or translation scripts come along with it.
 * Passing the returned ref to the block wrapper also covers canvases other than the main one
 * (the site editor, patterns); without it the hook still syncs every `editor-canvas` iframe.
 *
 * @param {string[]} ids Element ids to copy.
 * @return {Function} Ref for the block's wrapper element.
 */
export default function useIframeAssets(ids) {
	const key = ids.join(' ');

	useEffect(() => {
		const list = key.split(' ');
		const frames = [...document.querySelectorAll('iframe[name="editor-canvas"]')];
		const sync = () => frames.forEach(frame => copyAssets(list, frame.contentDocument));
		sync();
		// the canvas may still be loading, or load again (device preview, template editing)
		frames.forEach(frame => frame.addEventListener('load', sync));
		return () => frames.forEach(frame => frame.removeEventListener('load', sync));
	}, [key]);

	return useRefEffect(node => {
		copyAssets(key.split(' '), node.ownerDocument);
	}, [key]);
}
