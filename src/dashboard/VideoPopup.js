import { useEffect, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

// youtube-nocookie.com, loaded only after a click
const embedUrl = ( href ) => {
	const url = new URL( href );
	const id = url.searchParams.get( 'v' ) || ( 'youtu.be' === url.hostname ? url.pathname.slice( 1 ) : '' );
	if ( id ) {
		return `https://www.youtube-nocookie.com/embed/${ encodeURIComponent( id ) }?autoplay=1&rel=0`;
	}
	const list = url.searchParams.get( 'list' );
	return list ? `https://www.youtube-nocookie.com/embed/videoseries?list=${ encodeURIComponent( list ) }&autoplay=1&rel=0` : '';
};

const VideoPopup = ( { video, onClose } ) => {
	const dialog = useRef();

	useEffect( () => {
		const el = dialog.current;
		if ( video && el && ! el.open ) {
			el.showModal();
		}
	}, [ video ] );

	// Escape and the backdrop close it; closing removes the iframe, which stops the video
	// eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- a click on the backdrop; the dialog closes on Escape by itself
	return <dialog ref={ dialog } className="alpl-video-popup" aria-label={ video?.title || __( 'Video', 'softicon-poll' ) }
		onClose={ onClose } onClick={ ( event ) => event.target === dialog.current && dialog.current.close() }>
		<button type="button" className="alpl-video-close" aria-label={ __( 'Close', 'softicon-poll' ) } onClick={ () => dialog.current.close() }>
			<span className="dashicons dashicons-no-alt" aria-hidden="true" />
		</button>
		<div className="alpl-video-frame">
			{ video && <iframe src={ embedUrl( video.url ) } title={ video.title } allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen /> }
		</div>
	</dialog>;
};

export default VideoPopup;
