// The Pricing and Free vs Pro tabs; the plans, features and prices come from Freemius (includes/class-dashboard.php plans())
import { createInterpolateElement, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { Checkout } from '@freemius/checkout';
import { useApi } from './api';
import Status from './Status';

const symbols = { usd: '$', eur: '€', gbp: '£', aud: 'A$', cad: 'C$' };

// where people write for help, a refund or anything else
const SUPPORT = 'support@softiconai.com';
// createInterpolateElement puts the address inside it
// eslint-disable-next-line jsx-a11y/anchor-has-content
const mail = <a href={ 'mailto:' + SUPPORT } />;

// buying without risk: the money-back days set in Freemius, a person to write to, and why we care
const Guarantee = ( { days } ) => <div className="alpl-card alpl-guarantee">
	<span className="dashicons dashicons-shield" aria-hidden="true" />
	<div>
		<h3>{ __( 'Try Pro without risk', 'softicon-poll' ) }</h3>
		<p>{ days > 0
			? sprintf(
				/* translators: %d: number of days */
				__( 'If Pro is not right for you, tell us within %d days and you get all your money back, no questions asked.', 'softicon-poll' ),
				days
			)
			: __( 'If Pro is not right for you, tell us and we will make it right.', 'softicon-poll' ) }</p>
		<p>{ createInterpolateElement( sprintf(
			/* translators: %s: email address */
			__( 'Any problem or question? Email us at %s, a real person from our team will help you.', 'softicon-poll' ),
			'<a>' + SUPPORT + '</a>'
		), { a: mail } ) }</p>
		<p className="alpl-guarantee-why">{ __( 'We build SoftIcon Poll for the people who use it, and your satisfaction comes first.', 'softicon-poll' ) }</p>
	</div>
</div>;

// the short version under a Get Pro button
const MoneyBack = ( { days } ) => <p className="alpl-pricing-note alpl-promise">
	<span className="dashicons dashicons-shield" aria-hidden="true" />
	{ days > 0 && sprintf(
		/* translators: %d: number of days */
		__( '%d-day money-back guarantee', 'softicon-poll' ),
		days
	) + ' · ' }
	{ createInterpolateElement( sprintf(
		/* translators: %s: email address */
		__( 'Questions? %s', 'softicon-poll' ),
		'<a>' + SUPPORT + '</a>'
	), { a: mail } ) }
</p>;

const cycles = () => ( {
	lifetime: __( 'one-time', 'softicon-poll' ),
	annual: __( 'per year', 'softicon-poll' ),
	monthly: __( 'per month', 'softicon-poll' ),
} );

const amount = ( number ) => number.toLocaleString( undefined, { minimumFractionDigits: Number.isInteger( number ) ? 0 : 2, maximumFractionDigits: 2 } );
const symbol = ( price ) => symbols[ price.currency ] || price.currency.toUpperCase() + ' ';

// the percent off while a sale's coupon is filled in at checkout, 0 otherwise
const saleOff = ( checkout ) => ( checkout && checkout.coupon && checkout.off > 0 ? checkout.off : 0 );

// as Freemius counts it: the discount rounded to cents, taken off the price
const salePrice = ( price, off ) => Math.round( ( price - ( Math.round( price * off ) / 100 ) ) * 100 ) / 100;

// in a sale: the old price struck through, the sale's name and the price at checkout
const Price = ( { price, off = 0 } ) => <>
	{ off > 0 && <div className="alpl-price-was">
		<s>{ symbol( price ) }{ amount( price.price ) }</s>
		<span className="alpl-sale">{ sprintf(
			/* translators: %d: percent off, e.g. 40 */
			__( 'Black Friday: %d%% off', 'softicon-poll' ),
			off
		) }</span>
	</div> }
	<p className="alpl-price">
		<sup>{ symbol( price ) }</sup>
		{ amount( off > 0 ? salePrice( price.price, off ) : price.price ) }
		<span>{ cycles()[ price.cycle ] }</span>
	</p>
</>;

// under Get Pro in a sale: the code is already in the checkout
const SaleNote = ( { checkout } ) => <div className="alpl-sale-note">
	{ createInterpolateElement( sprintf(
		/* translators: %s: coupon code */
		__( 'Code %s is applied at checkout. The sale ends on 5 December.', 'softicon-poll' ),
		'<b>' + checkout.coupon + '</b>'
	), { b: <strong /> } ) }
</div>;

const sites = ( licenses ) => 'unlimited' === licenses
	? __( 'Unlimited websites', 'softicon-poll' )
	: sprintf(
		/* translators: %d: number of websites */
		_n( '%d website', '%d websites', licenses, 'softicon-poll' ),
		licenses
	);

// the Freemius checkout in a popup; a click with a modifier key, or a failed popup, opens it in a new tab
const openCheckout = ( event, checkout, plan, options, href ) => {
	if ( event.metaKey || event.ctrlKey || event.shiftKey || 0 !== event.button ) {
		return;
	}
	event.preventDefault();
	try {
		new Checkout( { product_id: checkout.product, plan_id: plan.id, public_key: checkout.key } ).open( options );
	} catch ( error ) {
		window.open( href, '_blank', 'noopener' );
	}
};

const ProButton = ( { checkout, plan, price, className } ) => {
	// a running sale's coupon is filled in for the buyer
	const coupon = checkout.coupon ? { coupon: checkout.coupon } : {};
	const href = `${ checkout.base }?plan_id=${ plan.id }&licenses=${ price.licenses }&billing_cycle=${ price.cycle }` +
		( checkout.coupon ? `&coupon=${ encodeURIComponent( checkout.coupon ) }` : '' );
	return <a className={ 'alpl-btn alpl-btn-block ' + className } href={ href } target="_blank" rel="noopener noreferrer"
		onClick={ ( event ) => openCheckout( event, checkout, plan, { licenses: price.licenses, billing_cycle: price.cycle, ...coupon }, href ) }>
		{ __( 'Get Pro', 'softicon-poll' ) } &rarr;
	</a>;
};

// the free trial set in Freemius: without a card when the plan does not ask for one
const TrialButton = ( { checkout, plan, className, children } ) => {
	const mode = plan.trial_card ? 'paid' : 'free';
	const href = `${ checkout.base }?plan_id=${ plan.id }&trial=${ mode }`;
	return <a className={ className } href={ href } target="_blank" rel="noopener noreferrer" onClick={ ( event ) => openCheckout( event, checkout, plan, { trial: mode }, href ) }>{ children }</a>;
};

const trialLabel = ( plan ) => sprintf(
	/* translators: %d: number of days */
	_n( 'Start %d-day free trial', 'Start %d-day free trial', plan.trial, 'softicon-poll' ),
	plan.trial
);

const Trial = ( { checkout, plan } ) => <div className="alpl-card alpl-trial">
	<span className="dashicons dashicons-clock" aria-hidden="true" />
	<div>
		<h3>{ sprintf(
			/* translators: %d: number of days */
			_n( 'Try Pro free for %d day', 'Try Pro free for %d days', plan.trial, 'softicon-poll' ),
			plan.trial
		) }</h3>
		<p>{ plan.trial_card
			? __( 'Every Pro feature on one website. Cancel before the trial ends and you pay nothing.', 'softicon-poll' )
			: __( 'Every Pro feature on one website, no card needed. When the trial ends, pick a plan or keep using the free plugin.', 'softicon-poll' ) }</p>
	</div>
	<TrialButton checkout={ checkout } plan={ plan } className="alpl-btn alpl-btn-coral">{ trialLabel( plan ) } &rarr;</TrialButton>
</div>;

// while Freemius has no paid plan to list, or cannot be reached
const NoPlans = ( { data } ) => <div className="alpl-card alpl-no-plans">
	<span className="dashicons dashicons-clock" aria-hidden="true" />
	<p>{ data.error ? __( 'The Pro plans could not be loaded right now. Please try again later.', 'softicon-poll' ) : __( 'SoftIcon Poll Pro is coming soon.', 'softicon-poll' ) }</p>
</div>;

const Intro = ( { eyebrow, title, children } ) => <div className="alpl-intro">
	<span className="alpl-eyebrow">{ eyebrow }</span>
	<h2>{ title }</h2>
	{ children }
</div>;

const usePlans = () => useApi( '/softicon-poll/v1/dashboard/plans' );

export const Pricing = () => {
	const { data, error, loading } = usePlans();
	if ( loading || error ) {
		return <Status error={ error } />;
	}
	const plan = data.pro;
	const once = plan && 'lifetime' === plan.prices[ 0 ].cycle;
	const off = saleOff( data.checkout );

	return <>
		<Intro eyebrow={ __( 'Pricing', 'softicon-poll' ) } title={ once ? __( 'Pay once, use it for life', 'softicon-poll' ) : __( 'Pick your plan', 'softicon-poll' ) }>
			<p>{ __( 'Every plan has all Pro features; pick how many websites you need.', 'softicon-poll' ) }</p>
		</Intro>

		{ plan && plan.trial > 0 && data.checkout && <Trial checkout={ data.checkout } plan={ plan } /> }

		{ plan ? <div className="alpl-plans alpl-plans-3">
			{ plan.prices.map( ( price ) => <div className="alpl-plan" key={ price.licenses }>
				<span className="alpl-tag">{ sites( price.licenses ) }</span>
				<h3>{ plan.title }</h3>
				<Price price={ price } off={ off } />
				<ProButton checkout={ data.checkout } plan={ plan } price={ price } className="alpl-btn-coral" />
				{ off > 0 && <SaleNote checkout={ data.checkout } /> }
				<ul className="alpl-checks">
					<li>{ sites( price.licenses ) }</li>
					<li>{ __( 'Every free feature', 'softicon-poll' ) }</li>
					{ data.pro_only.map( ( feature ) => <li key={ feature.title }>{ feature.title }</li> ) }
				</ul>
			</div> ) }
		</div> : <NoPlans data={ data } /> }

		{ plan && <Guarantee days={ data.money_back } /> }

		<p className="alpl-pricing-note">
			{ __( 'Secure checkout by Freemius. Pro replaces the free plugin and keeps every poll and vote.', 'softicon-poll' ) }{ ' ' }
			<a href="#/compare">{ __( 'Compare Free and Pro', 'softicon-poll' ) }</a>
		</p>
	</>;
};

const Mark = ( { yes } ) => <span className={ 'alpl-mark ' + ( yes ? 'is-yes' : 'is-no' ) }>
	<span className={ 'dashicons ' + ( yes ? 'dashicons-yes' : 'dashicons-no-alt' ) } aria-hidden="true" />
	<span className="screen-reader-text">{ yes ? __( 'Included', 'softicon-poll' ) : __( 'Not included', 'softicon-poll' ) }</span>
</span>;

export const Compare = () => {
	const { data, error, loading } = usePlans();
	const [ filter, setFilter ] = useState( '' );
	if ( loading || error ) {
		return <Status error={ error } />;
	}
	const plan = data.pro;

	// a section whose name matches keeps all its rows
	const words = filter.trim().toLowerCase();
	const sections = [
		[ __( 'In Free and Pro', 'softicon-poll' ), data.free, true ],
		[ __( 'Only in Pro', 'softicon-poll' ), data.pro_only, false ],
	].map( ( [ title, list, free ] ) => [ title, list.filter( ( feature ) => ! words || title.toLowerCase().includes( words ) || ( feature.title + ' ' + feature.text ).toLowerCase().includes( words ) ), free ] )
		.filter( ( [ , list ] ) => list.length );
	const hasFeatures = data.free.length > 0 || data.pro_only.length > 0;

	return <>
		<Intro eyebrow={ __( 'Compare', 'softicon-poll' ) } title={ __( 'Free vs Pro at a glance', 'softicon-poll' ) }>
			{ data.pro_only.length > 0 && <p>{ createInterpolateElement( sprintf(
				/* translators: %s: number of features */
				__( 'See what you get when you upgrade. %s features are only in Pro.', 'softicon-poll' ),
				'<strong>' + data.pro_only.length.toLocaleString() + '</strong>'
			), { strong: <strong /> } ) }</p> }
		</Intro>

		<div className="alpl-plans">
			<div className="alpl-plan">
				<span className="alpl-tag">{ __( 'Free', 'softicon-poll' ) }</span>
				<h3>{ __( 'Free', 'softicon-poll' ) }</h3>
				<p>{ __( 'Free forever, everything you need to run polls on your site.', 'softicon-poll' ) }</p>
				<p className="alpl-price"><sup>$</sup>0<span>{ __( 'forever', 'softicon-poll' ) }</span></p>
				<span className="alpl-have"><span className="dashicons dashicons-yes" aria-hidden="true" />{ __( 'You already have it', 'softicon-poll' ) }</span>
			</div>
			{ plan && <div className="alpl-plan is-pro">
				<span className="alpl-tag">{ __( 'Pro', 'softicon-poll' ) }</span>
				<h3>{ plan.title }</h3>
				{ plan.text && <p>{ plan.text }</p> }
				<Price price={ plan.prices[ 0 ] } off={ saleOff( data.checkout ) } />
				<ProButton checkout={ data.checkout } plan={ plan } price={ plan.prices[ 0 ] } className="alpl-btn-light" />
				{ saleOff( data.checkout ) > 0 && <SaleNote checkout={ data.checkout } /> }
				{ plan.trial > 0 && <TrialButton checkout={ data.checkout } plan={ plan } className="alpl-more-plans alpl-trial-link">{ trialLabel( plan ) }</TrialButton> }
				{ plan.prices.length > 1 && <a className="alpl-more-plans" href="#/pricing">{ __( 'Plans for more websites', 'softicon-poll' ) }</a> }
			</div> }
		</div>

		{ plan && <MoneyBack days={ data.money_back } /> }

		{ ! plan && <NoPlans data={ data } /> }

		{ hasFeatures && <section className="alpl-breakdown">
			<header>
				<h3 id="alpl-breakdown-title">{ __( 'Feature breakdown', 'softicon-poll' ) }</h3>
				<label className="alpl-compare-filter" htmlFor="alpl-compare-filter">
					<span className="dashicons dashicons-search" aria-hidden="true" />
					<span className="screen-reader-text">{ __( 'Filter features', 'softicon-poll' ) }</span>
					<input id="alpl-compare-filter" type="search" placeholder={ __( 'Filter features…', 'softicon-poll' ) } value={ filter } onChange={ ( event ) => setFilter( event.target.value ) } />
				</label>
			</header>
			<table className="alpl-compare" aria-labelledby="alpl-breakdown-title">
				<thead><tr>
					<th scope="col">{ __( 'Feature', 'softicon-poll' ) }</th>
					<th scope="col">{ __( 'Free', 'softicon-poll' ) }</th>
					<th scope="col" className="is-pro">{ __( 'Pro', 'softicon-poll' ) }</th>
				</tr></thead>
				{ sections.map( ( [ title, list, free ] ) => <tbody key={ title }>
					<tr className="alpl-compare-group"><th scope="rowgroup" colSpan="3">{ title }</th></tr>
					{ list.map( ( feature ) => <tr key={ feature.title }>
						<th scope="row">{ feature.title }{ feature.text && <small>{ feature.text }</small> }</th>
						<td><Mark yes={ free } /></td>
						<td><Mark yes /></td>
					</tr> ) }
				</tbody> ) }
				{ ! sections.length && <tbody><tr><td colSpan="3" className="alpl-compare-empty">{ __( 'No features match.', 'softicon-poll' ) }</td></tr></tbody> }
			</table>
		</section> }
	</>;
};
