// the free plugin: where a Pro setting would be, a short card that it is in Pro and a link to the dashboard's Pricing
import { __ } from '@wordpress/i18n';
import { ExternalLink } from '@wordpress/components';
import { SVG, Path } from '@wordpress/primitives';

// set by includes/class-block.php editor_info(): whether Pro is active, and the Pricing link for admins
export const editorInfo = window.alplEditor || {};

const crown = <SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
	<Path d="M3 7.5l4.5 3.5L12 4.5l4.5 6.5L21 7.5l-2 10.5H5zm2.6 12h12.8V21H5.6z" />
</SVG>;

const ProNotice = ( { text, href = editorInfo.pricing, video, videoLabel } ) => <div className="alplProNotice">
	<p className="alplProNoticeHead">
		<span className="alplProNoticeCrown">{ crown }</span>
		{ __( 'Pro feature', 'softicon-poll' ) }
	</p>
	<p className="alplProNoticeText">{ text }</p>
	{ /* a new tab, so nothing in the editor is lost; editors who cannot open the dashboard get no link */ }
	{ href && <ExternalLink href={ href } className="alplProNoticeLink">{ __( 'Unlock with Pro', 'softicon-poll' ) }</ExternalLink> }
	{ video && <ExternalLink href={ video } className="alplProNoticeVideo">{ videoLabel }</ExternalLink> }
</div>;

export default ProNotice;
