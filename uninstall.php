<?php
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

// the Freemius opt-in: WordPress runs this file instead of fs-lite's uninstall hook, so it is called here. It tells
// Freemius about the uninstall only if the admin opted in, or chose a reason when deactivating, then removes its option.
require_once __DIR__ . '/includes/freemius.php';

// SoftIcon Poll Pro uses the same table and polls; while it is installed, the data stays for it
$alpl_keep_data = file_exists( WP_PLUGIN_DIR . '/softicon-poll-pro/softicon-poll.php' );

// each site of a network has its own votes, opt-in and cache
$alpl_sites = is_multisite() ? get_sites(
	array(
		'fields' => 'ids',
		'number' => 0,
	)
) : array( 0 );
foreach ( $alpl_sites as $alpl_site ) {
	if ( $alpl_site ) {
		switch_to_blog( $alpl_site );
	}
	SofticonPoll\fs_lite::uninstall();
	// the plans read from Freemius and the dashboard's review request
	delete_transient( 'alpl_freemius' );
	delete_option( 'alpl_review' );

	if ( ! $alpl_keep_data ) {
		// the votes table goes with the plugin; the polls themselves stay in the posts
		global $wpdb;
		$wpdb->query( $wpdb->prepare( 'DROP TABLE IF EXISTS %i', $wpdb->prefix . 'alpl_votes' ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange -- removes this plugin's own table on uninstall
		delete_option( 'alpl_db_version' );
		// which post each poll belongs to
		delete_post_meta_by_key( '_alpl_poll' );
		// SoftIcon Poll Pro's written "Other" answers and its settings
		$wpdb->query( $wpdb->prepare( 'DROP TABLE IF EXISTS %i', $wpdb->prefix . 'alpl_answers' ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange -- removes the Pro version's own table on uninstall
		delete_option( 'alpl_pro' );
		delete_option( 'alpl_pro_db' );
	}

	if ( $alpl_site ) {
		restore_current_blog();
	}
}
