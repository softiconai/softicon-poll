// Settings panels for SoftIcon blocks: an accordion of panels, icon tiles, (i) tips, color rows and help cards.
// Styles in ../styles/panels.scss; wrap the inspector content in <TabPanel className='siSettings'> or any .siSettings element.
import { __, sprintf } from '@wordpress/i18n';
import { createContext, useContext, useState } from '@wordpress/element';
import { ColorPalette } from '@wordpress/block-editor';
import { Button, ColorIndicator, Dropdown, PanelBody, ToggleControl, Tooltip } from '@wordpress/components';
import { icons } from './icons';

// one open panel per settings tab: opening a panel closes the one that was open
const Accordion = createContext({ open: null, toggle: () => {} });

export const PanelGroup = ({ initial, children }) => {
	const [open, setOpen] = useState(initial);
	const toggle = id => setOpen(current => (current === id ? null : id));
	return <Accordion.Provider value={{ open, toggle }}>{children}</Accordion.Provider>;
};

// a settings panel; its controls are spaced evenly by .siFields, badge is a short tag like "New"
export const Panel = ({ id, title, badge, children }) => {
	const { open, toggle } = useContext(Accordion);
	return <PanelBody className='siPanel' title={<>{title}{badge && <span className='siBadge'>{badge}</span>}</>} opened={open === id} onToggle={() => toggle(id)}>
		<div className='siFields'>{children}</div>
	</PanelBody>;
};

// the help text behind an (i), shown on hover and keyboard focus; screen readers get it as the button name
export const Tip = ({ text }) => <Tooltip text={text} placement='top' className='siTipBubble'>
	<button type='button' className='siTip' aria-label={text}>{icons.info}</button>
</Tooltip>;

// a field's name with its tip, a line to the right and an optional action (Reset);
// the control below hides its own label from sight only
export const FieldHead = ({ label, tip, action }) => <div className='siFieldHead'>
	<span className='siFieldLabel'>{label}</span>
	{tip && <Tip text={tip} />}
	<span className='siFieldLine' aria-hidden='true' />
	{action}
</div>;

// a small Reset beside a field name, off while the value is the default
export const Reset = ({ onClick, disabled }) => <Button className='siReset' variant='secondary' size='small' onClick={onClick} disabled={disabled}>
	{__('Reset', 'softicon-poll')}
</Button>;

export const ToggleRow = ({ label, tip, checked, onChange }) => <div className='siToggleRow'>
	<ToggleControl label={label} checked={checked} onChange={onChange} __nextHasNoMarginBottom />
	{tip && <Tip text={tip} />}
</div>;

// choices as icon tiles; options: [{ value, label, icon }]
export const Tiles = ({ label, tip, value, options, onChange }) => <div className='siTiles'>
	<FieldHead label={label} tip={tip} />
	<div className='siTilesGrid' role='radiogroup' aria-label={label} style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
		{options.map(option => <button key={option.value} type='button' role='radio' aria-checked={value === option.value}
			className={'siTile' + (value === option.value ? ' is-selected' : '')} onClick={() => onChange(option.value)}>
			{option.icon}
			<span>{option.label}</span>
		</button>)}
	</div>
</div>;

// the color's name on the left, its swatch on the right, the palette in a popover
export const ColorRow = ({ label, value, onChange }) => <Dropdown
	className='siColorRow'
	popoverProps={{ placement: 'left-start', offset: 36 }}
	renderToggle={({ isOpen, onToggle }) => <Button className='siColorToggle' onClick={onToggle} aria-expanded={isOpen}
		/* translators: %s: a color setting, like Background */
		aria-label={sprintf(__('%s color', 'softicon-poll'), label) + (value ? ': ' + value : '')}>
		<span className='siColorName'>{label}</span>
		<ColorIndicator colorValue={value || undefined} className={value ? '' : 'is-empty'} />
	</Button>}
	renderContent={() => <div className='siColorPopover'>
		<ColorPalette value={value} onChange={val => onChange(val || '')} clearable />
	</div>}
/>;

// links as cards: [{ href, label, icon }]
export const HelpCards = ({ cards }) => <div className='siHelpCards'>
	{cards.map(card => <a key={card.href} className='siHelpCard' href={card.href} target='_blank' rel='noopener noreferrer'>
		{card.icon}
		<span>{card.label}</span>
		<span className='screen-reader-text'>{__('(opens in a new tab)', 'softicon-poll')}</span>
	</a>)}
</div>;
