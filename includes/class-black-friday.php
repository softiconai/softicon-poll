<?php
namespace ALPL_Poll;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Black Friday 2026 (site time): a banner on the dashboard and All Polls, closed for good per person, and a Plugins list link
class Black_Friday {

	const START   = '2026-11-26 00:00:00';
	const END     = '2026-12-05 23:59:59';
	const URL     = 'https://softiconai.com/products/poll/pricing/';
	const CODE    = 'FSBFCM2026';
	const OFF     = '40%';
	const KEY     = 'alpl_bfcm_2026';
	const PRO     = 'ALPL_IS_PRO';
	const SCREENS = array( 'toplevel_page_softicon-poll', 'edit-alpl_poll' );

	public function __construct() {
		$tz = wp_timezone();
		if ( time() < ( new \DateTime( self::START, $tz ) )->getTimestamp() || time() > ( new \DateTime( self::END, $tz ) )->getTimestamp() ) {
			return;
		}
		add_action('admin_enqueue_scripts', array( $this, 'assets' ));
		add_action('admin_notices', array( $this, 'banner' ));
		add_action('wp_ajax_' . self::KEY, array( $this, 'dismiss' ));
		add_filter('plugin_action_links_' . plugin_basename( ALPL_PLUGIN_PATH . 'softicon-poll.php' ), array( $this, 'link' ), 20);
	}

	private static function name() {
		return __('SoftIcon Poll', 'softicon-poll');
	}

	private static function items() {
		return array( __('Analytics', 'softicon-poll'), __('CSV export', 'softicon-poll'), __('Live results', 'softicon-poll'), __('QR code voting', 'softicon-poll') );
	}

	private static function show() {
		$screen = get_current_screen();
		return ! defined( self::PRO ) && $screen && in_array( $screen->id, self::SCREENS, true ) && current_user_can( 'manage_options' ) && ! get_user_meta( get_current_user_id(), self::KEY, true );
	}

	public function link( $links ) {
		if ( ! defined( self::PRO ) ) {
			$links[] = '<a href="' . esc_url( self::URL ) . '" target="_blank" rel="noopener" style="color:#d63638;font-weight:700">' .
				/* translators: %s: the discount, e.g. 40% */
				esc_html( sprintf( __('Black Friday: Save %s!', 'softicon-poll'), self::OFF ) ) . '</a>';
		}
		return $links;
	}

	public function dismiss() {
		check_ajax_referer( self::KEY, 'nonce' );
		if ( current_user_can( 'manage_options' ) ) {
			update_user_meta( get_current_user_id(), self::KEY, 1 );
		}
		wp_send_json_success();
	}

	public function assets() {
		if ( ! self::show() ) {
			return;
		}
		$k = '.' . self::KEY;
		wp_register_style( self::KEY, false, array(), '1' );
		wp_enqueue_style( self::KEY );
		wp_add_inline_style( self::KEY, "$k{position:relative;clear:both;display:flex;margin:12px 20px 16px 2px;background:#fff;border:1px solid #dcdcde;border-radius:4px;overflow:hidden}$k-side{flex:0 0 150px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:20px 12px;background:#eef4ff;text-align:center;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#1d2327}$k-side img{width:56px;height:56px;border-radius:12px}$k-body{flex:1;min-width:0;padding:16px 20px}$k-body h2{margin:0 0 6px;font-size:16px;line-height:1.4}$k-body p{margin:0 0 10px;max-width:760px;color:#3c434a}$k-list{flex:0 0 210px;display:flex;flex-direction:column;justify-content:center;gap:8px;padding:16px 48px 16px 24px;border-left:1px solid #f0f0f1}$k-list strong{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#646970}$k-list ul{display:flex;flex-direction:column;gap:8px;margin:0}$k-list a{font-weight:600;text-decoration:none}$k-list li{margin:0;font-weight:500}$k-list li:before{content:'\\2713';margin-right:6px;font-weight:700}$k-body code{padding:1px 6px;border:1px dashed #d63638;border-radius:3px;background:#fff5f5;color:#d63638;font-weight:700}$k-cta{margin-top:14px}$k-cta a{display:inline-block;padding:10px 18px;border:1px solid #2271b1;border-radius:4px;background:#f0f6fc;color:#2271b1;font-weight:600;text-decoration:none;white-space:nowrap}$k-cta a:hover,$k-cta a:focus{border-color:#9f1239;background:#9f1239;color:#fff}$k-close{position:absolute;top:8px;right:8px;width:28px;height:28px;padding:0;border:0;background:none;color:#2271b1;font-size:22px;line-height:1;cursor:pointer}$k-close:hover{color:#d63638}@media (max-width:782px){{$k}{flex-wrap:wrap;margin-right:10px}$k-side{display:none}$k-body{padding-right:44px}$k-list{flex-basis:100%;padding:12px 20px 16px;border-left:0;border-top:1px solid #f0f0f1}}" );
		wp_register_script( self::KEY, false, array(), '1', true );
		wp_enqueue_script( self::KEY );
		wp_add_inline_script( self::KEY, "document.querySelectorAll('$k-close').forEach(function(b){b.addEventListener('click',function(){var d=new FormData();d.append('action','" . self::KEY . "');d.append('nonce',b.getAttribute('data-nonce'));fetch(window.ajaxurl,{method:'POST',body:d,credentials:'same-origin'});b.parentNode.remove();});});" );
	}

	public function banner() {
		if ( ! self::show() ) {
			return;
		}
		$k = self::KEY;
		?>
		<div class="<?php echo esc_attr( $k ); ?>">
			<div class="<?php echo esc_attr( $k ); ?>-side">
				<img src="<?php echo esc_url( ALPL_PLUGIN_URL . 'assets/images/icon-128x128.png' ); ?>" alt="">
				<?php echo esc_html( self::name() ); ?>
			</div>
			<div class="<?php echo esc_attr( $k ); ?>-body">
				<h2><?php
					/* translators: 1: plugin name, 2: the discount, e.g. 40% */
					echo esc_html( sprintf( __('%1$s\'s Biggest Black Friday Sale is Live – %2$s OFF!', 'softicon-poll'), self::name(), self::OFF ) );
				?></h2>
				<p><?php
					/* translators: 1: plugin name, 2: the discount, 3: the coupon code */
					echo wp_kses( sprintf( __('The biggest deal of the year: get %1$s Pro at %2$s off until 5 December with code %3$s, and unlock every Pro feature at the lowest price of the year.', 'softicon-poll'), esc_html( self::name() ), esc_html( self::OFF ), '<code>' . esc_html( self::CODE ) . '</code>' ), array( 'code' => array() ) );
				?></p>
				<div class="<?php echo esc_attr( $k ); ?>-cta"><a href="<?php echo esc_url( self::URL ); ?>" target="_blank" rel="noopener"><?php esc_html_e('Unlock PRO Features →', 'softicon-poll'); ?></a></div>
			</div>
			<div class="<?php echo esc_attr( $k ); ?>-list">
				<strong><?php esc_html_e('Pro features', 'softicon-poll'); ?></strong>
				<ul><?php foreach ( self::items() as $item ) : ?><li><?php echo esc_html( $item ); ?></li><?php endforeach; ?></ul>
				<a href="<?php echo esc_url( self::URL ); ?>" target="_blank" rel="noopener"><?php esc_html_e('And much more →', 'softicon-poll'); ?></a>
			</div>
			<button type="button" class="<?php echo esc_attr( $k ); ?>-close" data-nonce="<?php echo esc_attr( wp_create_nonce( self::KEY ) ); ?>" aria-label="<?php esc_attr_e('Dismiss', 'softicon-poll'); ?>">&times;</button>
		</div>
		<?php
	}
}
