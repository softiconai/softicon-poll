<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class ALPL_Poll {

	public static $instance;

	private function __construct() {
		$this->load_classes();
	}

	public static function get_instance() {
		if ( self::$instance ) {
			return self::$instance;
		}

		self::$instance = new self();
		return self::$instance;
	}

	public function load_classes() {

		require_once ALPL_PLUGIN_PATH . 'includes/class-block.php';
		require_once ALPL_PLUGIN_PATH . 'includes/class-votes.php';
		require_once ALPL_PLUGIN_PATH . 'includes/class-rest.php';

		new ALPL_Poll\Block();
		new ALPL_Poll\Votes();
		new ALPL_Poll\Rest();

		// add-ons such as SoftIcon Poll Pro hook in here
		do_action( 'alpl_loaded' );
	}
}
