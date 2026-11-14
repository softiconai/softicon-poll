import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { useCopyToClipboard } from '@wordpress/compose';
import { Button } from '@wordpress/components';
import { Panel } from '../../../../vendor/softicon-tools/components/Panels';

// the post type of Poll → All Polls (includes/class-shortcode.php)
export const POLL_TYPE = 'alpl_poll';

// a poll made under Poll → All Polls: its shortcode for the Classic Editor and page builders
const ShortcodePanel = () => {
	const { id, published } = useSelect( ( select ) => {
		const editor = select( 'core/editor' );
		return { id: editor?.getCurrentPostId?.(), published: 'publish' === editor?.getEditedPostAttribute?.( 'status' ) };
	}, [] );
	const code = `[softicon_poll id="${ id }"]`;
	const [ copied, setCopied ] = useState( false );
	const ref = useCopyToClipboard( code, () => {
		setCopied( true );
		setTimeout( () => setCopied( false ), 1600 );
	} );

	return <Panel id="shortcode" title={ __( 'Shortcode', 'softicon-poll' ) }>
		<div className="alplStack">
			<code className="alplCode">{ code }</code>
			<Button ref={ ref } variant="secondary" size="small">{ copied ? __( 'Copied', 'softicon-poll' ) : __( 'Copy', 'softicon-poll' ) }</Button>
			{ ! published && <p className="alplHelp alplWarn">{ __( 'Publish the poll first, the shortcode shows only published polls.', 'softicon-poll' ) }</p> }
			<p className="alplHelp">{ __( 'Paste it in the Classic Editor, a widget, or a page builder: the Shortcode widget in Elementor, a Code module in Divi, an HTML module in Beaver Builder, a Text Block in WPBakery, or the Shortcode element in Bricks and Oxygen.', 'softicon-poll' ) }</p>
		</div>
	</Panel>;
};

export default ShortcodePanel;
