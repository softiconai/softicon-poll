import { InspectorControls } from '@wordpress/block-editor';
import { TabPanel } from '@wordpress/components';
import { applyFilters } from '@wordpress/hooks';
import { useSelect } from '@wordpress/data';
import General from './General/General';
import Style from './Style/Style';
import ShortcodePanel, { POLL_TYPE } from './General/ShortcodePanel';
import { PanelGroup } from '../../../vendor/softicon-tools/components/Panels';
import { tabs } from '../../../utils/options';

const Settings = ( { attributes, setAttributes, votes } ) => {
	// a poll under Poll → All Polls opens on its shortcode
	const isPollPost = useSelect( ( select ) => POLL_TYPE === select( 'core/editor' )?.getCurrentPostType?.(), [] );
	const firstPanel = isPollPost ? 'shortcode' : 'answers';

	return <InspectorControls>
		<TabPanel className="siSettings" tabs={ tabs }>
			{ ( tab ) => <PanelGroup key={ tab.name } initial={ 'style' === tab.name ? 'colors' : firstPanel }>
				{ 'general' === tab.name && isPollPost && <ShortcodePanel /> }

				{ 'general' === tab.name && <General { ...{ attributes, setAttributes, votes } } /> }

				{ 'style' === tab.name && <Style { ...{ attributes, setAttributes } } /> }

				{ /* Add-ons append their own panels to either tab. */ }
				{ applyFilters( 'alpl.block.inspector', null, { tab: tab.name, attributes, setAttributes } ) }
			</PanelGroup> }
		</TabPanel>
	</InspectorControls>;
};

export default Settings;
