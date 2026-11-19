// The message after the Freemius opt-in (vendor/fs-lite notice()): thanks after Allow, or the confirmation email still
// to click. The opt-in itself is a screen of its own after activation (vendor/fs-lite/assets/fs-lite-optin.js).
export const OptInNotice = ( { notice } ) => <div className={ 'notice inline alpl-notice notice-' + notice.type } role={ 'error' === notice.type ? 'alert' : 'status' }>
	<p>{ notice.text }</p>
</div>;
