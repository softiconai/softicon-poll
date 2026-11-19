// the Welcome tab's "Block" or "Shortcode" choice opens the editor with ?alpl_start=block|shortcode: the Poll block then
// shows the steps for that way (Edit.js). Read once on load, before src/index.js takes it out of the address
const mode = new URLSearchParams( window.location.search ).get( 'alpl_start' );

export default [ 'block', 'shortcode' ].includes( mode ) ? mode : null;
