import { useEffect, useState } from '@wordpress/element';

// '#/polls' -> 'polls'
const read = ( keys ) => {
	const hash = window.location.hash.replace( /^#\/?/, '' ).split( /[/?]/ )[ 0 ];
	return hash || keys[ 0 ];
};

const useRoute = ( keys ) => {
	const [ route, setRoute ] = useState( () => read( keys ) );
	useEffect( () => {
		const change = () => {
			setRoute( read( keys ) );
			window.scrollTo( 0, 0 );
		};
		window.addEventListener( 'hashchange', change );
		return () => window.removeEventListener( 'hashchange', change );
	}, [ keys ] );
	return route;
};

export default useRoute;
