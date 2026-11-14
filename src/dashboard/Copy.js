import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

// the clipboard API needs https; local http sites copy through a hidden text box
export const copyText = ( text ) => {
	if ( window.navigator.clipboard && window.isSecureContext ) {
		return window.navigator.clipboard.writeText( text );
	}
	const box = document.createElement( 'textarea' );
	box.value = text;
	box.setAttribute( 'readonly', '' );
	box.style.position = 'fixed';
	box.style.opacity = '0';
	document.body.append( box );
	box.select();
	const done = document.execCommand( 'copy' );
	box.remove();
	return done ? Promise.resolve() : Promise.reject();
};

export const shortcode = ( id ) => `[softicon_poll id="${ id }"]`;

export const Copy = ( { text, label } ) => {
	const [ copied, setCopied ] = useState( false );
	return <button type="button" className={ 'alpl-copy' + ( copied ? ' is-copied' : '' ) } aria-label={ label }
		onClick={ () => copyText( text ).then( () => {
			setCopied( true );
			setTimeout( () => setCopied( false ), 1600 );
		} ).catch( () => {} ) }>
		<span className={ 'dashicons ' + ( copied ? 'dashicons-yes' : 'dashicons-admin-page' ) } aria-hidden="true" />
		{ copied ? __( 'Copied', 'softicon-poll' ) : __( 'Copy', 'softicon-poll' ) }
	</button>;
};

// a shortcode or a line of code with its Copy button
export const Code = ( { text, label } ) => <div className="alpl-code">
	<code>{ text }</code>
	<Copy text={ text } label={ label } />
</div>;
