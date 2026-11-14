// a YouTube link that plays in the popup; Cmd/Ctrl-click still opens YouTube
const VideoLink = ( { url, title, play, className, children } ) => <a className={ className } href={ url } target="_blank" rel="noopener noreferrer"
	onClick={ ( event ) => {
		if ( event.metaKey || event.ctrlKey || event.shiftKey || 0 !== event.button ) {
			return;
		}
		event.preventDefault();
		play( { url, title } );
	} }>{ children }</a>;

export default VideoLink;
