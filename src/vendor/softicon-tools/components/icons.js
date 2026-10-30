import { SVG, Path } from '@wordpress/primitives';

// 24x24 icons drawn with one path; plugins make their own with the same helper
export const icon = (d, evenOdd = false) => <SVG viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg' aria-hidden='true' focusable='false'>
	<Path d={d} fillRule={evenOdd ? 'evenodd' : undefined} />
</SVG>;

export const icons = {
	info: icon('M12 2.75a9.25 9.25 0 1 1 0 18.5 9.25 9.25 0 0 1 0-18.5m0 1.5a7.75 7.75 0 1 0 0 15.5 7.75 7.75 0 0 0 0-15.5M11.2 10.6h1.6V17h-1.6zm0-3.4h1.6v1.7h-1.6z', true),
	video: icon('M4.5 4.5h15A1.5 1.5 0 0 1 21 6v12a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V6a1.5 1.5 0 0 1 1.5-1.5m5.5 4v7l6-3.5z'),
	support: icon('M4.5 4h15A1.5 1.5 0 0 1 21 5.5v10a1.5 1.5 0 0 1-1.5 1.5H10l-5 4v-4h-.5A1.5 1.5 0 0 1 3 15.5v-10A1.5 1.5 0 0 1 4.5 4M7 8.5V10h10V8.5zm0 3V13h7v-1.5z', true),
	star: icon('M12 2.75l2.85 5.95 6.55.75-4.85 4.5 1.3 6.5L12 17.2l-5.85 3.25 1.3-6.5L2.6 9.45l6.55-.75z'),
	plugins: icon('M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 0h7v7h-7z')
};
