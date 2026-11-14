import apiFetch from '@wordpress/api-fetch';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

// a GET kept for the life of the page, so going back to a tab does not load it again
const cache = {};

export const useApi = ( path ) => {
	const [ state, setState ] = useState( () => cache[ path ] || { loading: true } );
	useEffect( () => {
		if ( cache[ path ] ) {
			return;
		}
		let live = true;
		apiFetch( { path } )
			.then( ( data ) => ( { data } ), ( error ) => ( { error: error.message || __( 'Something went wrong. Please try again.', 'softicon-poll' ) } ) )
			.then( ( result ) => {
				cache[ path ] = result;
				if ( live ) {
					setState( result );
				}
			} );
		return () => {
			live = false;
		};
	}, [ path ] );
	return state;
};
