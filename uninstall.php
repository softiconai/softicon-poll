<?php
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

// the votes table goes with the plugin; the polls themselves stay in the posts
global $wpdb;
$wpdb->query( $wpdb->prepare( 'DROP TABLE IF EXISTS %i', $wpdb->prefix . 'alpl_votes' ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange -- removes this plugin's own table on uninstall
delete_option( 'alpl_db_version' );
// which post each poll belongs to
delete_post_meta_by_key( '_alpl_poll' );
// the dashboard's review request
delete_option( 'alpl_review' );

// the Freemius opt-in: WordPress runs this file instead of fs-lite's uninstall hook, so it is called here. It tells
// Freemius about the uninstall only if the admin opted in, or chose a reason when deactivating, then removes its option.
require_once __DIR__ . '/includes/freemius.php';
SofticonPoll\fs_lite::uninstall();
