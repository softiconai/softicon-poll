import { __ } from '@wordpress/i18n';

// while a tab loads its data, or when it could not
const Status = ( { error } ) => <div className="alpl-card alpl-status" role={ error ? 'alert' : 'status' }>
	{ error ? <><span className="dashicons dashicons-warning" aria-hidden="true" />{ error }</> : <><span className="spinner is-active" />{ __( 'Loading…', 'softicon-poll' ) }</> }
</div>;

export default Status;
