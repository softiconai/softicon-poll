import { createBlock, registerBlockType } from '@wordpress/blocks';
import { dispatch, select, subscribe } from '@wordpress/data';
import domReady from '@wordpress/dom-ready';
import metadata from './block.json';
import './style.scss';
import './editor.scss';
import Edit from './Components/Backend/Edit';
import { blockIcon } from './utils/icons';
import { variations } from './utils/variations';

registerBlockType( metadata, {
	icon: blockIcon,
	edit: Edit,
	variations,
	// Dynamic block, the markup comes from render.php.
	save: () => null,
} );

// the dashboard's Welcome tab opens the editor with ?alpl_start=…: block, a new page that gets an empty poll at once;
// shortcode, a new poll under All Polls, whose block is already there. Either way the block shows the steps (utils/guide.js)
domReady( () => {
	const url = new URL( window.location.href );
	const mode = url.searchParams.get( 'alpl_start' );
	if ( null === mode ) {
		return;
	}
	url.searchParams.delete( 'alpl_start' );
	window.history.replaceState( window.history.state, '', url.toString() );
	if ( 'block' !== mode ) {
		return;
	}
	// the editor is often ready before this runs, and then nothing in the stores changes: check now, else wait
	let done = false;
	const start = () => {
		const editor = select( 'core/editor' );
		const ready = editor?.__unstableIsEditorReady ? editor.__unstableIsEditorReady() : !! editor?.getCurrentPostId();
		if ( done || ! ready ) {
			return;
		}
		done = true;
		// the editor can still reset the new page's blocks right after it is ready: add the poll a moment later,
		// and again if it is gone, a few times
		let tries = 0;
		const add = () => {
			const blocks = select( 'core/block-editor' ).getBlocks();
			if ( blocks.some( ( block ) => metadata.name === block.name ) || ++tries > 6 ) {
				return;
			}
			dispatch( 'core/block-editor' ).insertBlocks( createBlock( metadata.name ), blocks.length );
			setTimeout( add, 700 );
		};
		setTimeout( add, 400 );
	};
	const unsubscribe = subscribe( () => {
		start();
		if ( done ) {
			unsubscribe();
		}
	} );
	start();
	if ( done ) {
		unsubscribe();
	}
} );
