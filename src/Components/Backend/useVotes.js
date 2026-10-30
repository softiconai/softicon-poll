import apiFetch from '@wordpress/api-fetch';
import { useCallback, useEffect, useState } from '@wordpress/element';

// the poll's votes for the editor; null until loaded or when this user may not see them
const useVotes = ( pollId ) => {
	const [ results, setResults ] = useState( null );
	const [ busy, setBusy ] = useState( false );
	const path = pollId ? '/softicon-poll/v1/manage/' + pollId : '';

	const run = useCallback( ( method ) => {
		if ( ! path ) {
			return Promise.resolve();
		}
		setBusy( true );
		return apiFetch( { path, method } )
			.then( setResults )
			.catch( () => setResults( null ) )
			.finally( () => setBusy( false ) );
	}, [ path ] );

	useEffect( () => {
		run( 'GET' );
	}, [ run ] );

	return { results, busy, refresh: () => run( 'GET' ), reset: () => run( 'DELETE' ) };
};

export default useVotes;
