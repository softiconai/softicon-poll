import { __ } from '@wordpress/i18n';
import { ColorRow, Panel, ToggleRow } from '../../../../vendor/softicon-tools/components/Panels';

const Style = ( { attributes, setAttributes } ) => {
	const { animateBars } = attributes;
	const set = ( key ) => ( val ) => setAttributes( { [ key ]: val } );
	const color = ( key ) => ( { value: attributes[ key ], onChange: set( key ) } );

	return <>
		<Panel id="colors" title={ __( 'Colors', 'softicon-poll' ) }>
			<div className="siColors">
				<ColorRow label={ __( 'Background', 'softicon-poll' ) } { ...color( 'bgColor' ) } />
				<ColorRow label={ __( 'Text', 'softicon-poll' ) } { ...color( 'textColor' ) } />
				<ColorRow label={ __( 'Accent', 'softicon-poll' ) } { ...color( 'accentColor' ) } />
				<ColorRow label={ __( 'Bar background', 'softicon-poll' ) } { ...color( 'barBgColor' ) } />
				<ColorRow label={ __( 'Border', 'softicon-poll' ) } { ...color( 'borderColor' ) } />
				<ColorRow label={ __( 'Button', 'softicon-poll' ) } { ...color( 'buttonColor' ) } />
				<ColorRow label={ __( 'Button text', 'softicon-poll' ) } { ...color( 'buttonTextColor' ) } />
			</div>
			<p className="alplHelp">{ __( 'Accent colors the bars, the chosen answer and the Vote button. Button colors win over the accent. Without either the button follows your theme. Font size and corner radius are in the Typography and Border panels. The toolbar\'s chart button previews the results.', 'softicon-poll' ) }</p>
		</Panel>

		<Panel id="bars" title={ __( 'Result bars', 'softicon-poll' ) }>
			<ToggleRow label={ __( 'Animate the bars', 'softicon-poll' ) } tip={ __( 'The bars grow when the results appear. Visitors who prefer less motion see them without it.', 'softicon-poll' ) } checked={ animateBars } onChange={ set( 'animateBars' ) } />
		</Panel>
	</>;
};

export default Style;
