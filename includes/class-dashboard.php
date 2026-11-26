<?php
namespace ALPL_Poll;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// The Poll admin page: src/dashboard (React) draws it from config(), each tab a #/route; PHP only adds the menu.
class Dashboard {

	const PAGE = 'softicon-poll';
	// the review request: when a published poll was first seen, and the person's answer
	const REVIEW = 'alpl_review';
	// the Polls tab lists at most this many, newest first
	const LIMIT = 200;
	// the Pro plans and prices read from Freemius, kept for a while
	const CACHE = 'alpl_freemius';

	public function __construct() {
		add_action( 'admin_menu', array( $this, 'menu' ), 9 ); // before WordPress adds All Polls under it
		add_action( 'admin_menu', array( $this, 'add_new_menu' ), 11 ); // after All Polls
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_assets' ) );
		add_filter( 'plugin_action_links_' . plugin_basename( ALPL_PLUGIN_PATH . 'softicon-poll.php' ), array( $this, 'action_links' ) );
		add_filter( 'plugin_row_meta', array( $this, 'row_meta' ), 10, 2 );
	}

	public static function is_pro() {
		return defined( 'ALPL_IS_PRO' ) && ALPL_IS_PRO;
	}

	// SoftIcon Poll Pro without an active license: its features are locked and Pricing shows again
	public static function locked() {
		return self::is_pro() && (bool) apply_filters( 'alpl_pro_locked', false );
	}

	// the Freemius product id and public key, from fs-lite (free) or the Freemius SDK (Pro)
	private static function product() {
		$fs = function_exists( 'softicon_poll_fs' ) ? softicon_poll_fs() : null;
		if ( $fs && method_exists( $fs, 'public_key' ) ) {
			return array( (string) $fs->id(), $fs->public_key() );
		}
		if ( $fs && method_exists( $fs, 'get_public_key' ) ) {
			return array( (string) $fs->get_id(), $fs->get_public_key() );
		}
		return null;
	}

	// the public plans and prices: fs-lite reads them in the free plugin, the Freemius SDK's plugin scope in Pro
	private static function fetch_pricing() {
		$fs = function_exists( 'softicon_poll_fs' ) ? softicon_poll_fs() : null;
		if ( $fs && method_exists( $fs, 'pricing' ) ) {
			return $fs->pricing();
		}
		if ( $fs && method_exists( $fs, 'get_api_plugin_scope' ) ) {
			$result = $fs->get_api_plugin_scope()->get( 'pricing.json' );
			return is_object( $result ) && isset( $result->plans ) && is_array( $result->plans ) ? $result : null;
		}
		return null;
	}

	// kept for 12 hours (1 hour after a failed read or while there is no paid plan); $fetch false only reads what is kept
	public static function freemius( $fetch = true ) {
		$data = get_transient( self::CACHE );
		if ( false === $data && $fetch && ( ! self::is_pro() || self::locked() ) ) {
			$data = self::parse( self::fetch_pricing() );
			set_transient( self::CACHE, $data, $data['error'] || ! $data['pro'] ? HOUR_IN_SECONDS : 12 * HOUR_IN_SECONDS );
		}
		return is_array( $data ) ? $data : self::parse( false );
	}

	// the free plan's features, and the first paid plan with its features and prices
	private static function parse( $result ) {
		$data = array(
			'error'      => ! is_object( $result ),
			'free'       => array(),
			'pro'        => null,
			'money_back' => 0,
		);
		if ( ! is_object( $result ) ) {
			return $data;
		}
		$data['money_back'] = isset( $result->plugin->money_back_period ) ? absint( $result->plugin->money_back_period ) : 0;

		foreach ( $result->plans as $plan ) {
			$features = array();
			foreach ( isset( $plan->features ) && is_array( $plan->features ) ? $plan->features : array() as $feature ) {
				if ( ! empty( $feature->title ) ) {
					$features[] = array(
						'title' => sanitize_text_field( $feature->title ),
						'text'  => isset( $feature->description ) ? sanitize_text_field( $feature->description ) : '',
					);
				}
			}

			$prices = array();
			foreach ( isset( $plan->pricing ) && is_array( $plan->pricing ) ? $plan->pricing : array() as $price ) {
				foreach ( array( 'lifetime', 'annual', 'monthly' ) as $cycle ) {
					if ( isset( $price->{ $cycle . '_price' } ) && is_numeric( $price->{ $cycle . '_price' } ) ) {
						$prices[] = array(
							'licenses' => empty( $price->licenses ) ? 'unlimited' : absint( $price->licenses ),
							'price'    => (float) $price->{ $cycle . '_price' },
							'cycle'    => $cycle,
							'currency' => isset( $price->currency ) ? sanitize_key( $price->currency ) : 'usd',
						);
						break;
					}
				}
			}

			if ( $prices && null === $data['pro'] ) {
				// fewest sites first, unlimited last
				usort(
					$prices,
					function ( $a, $b ) {
						$a = 'unlimited' === $a['licenses'] ? PHP_INT_MAX : $a['licenses'];
						$b = 'unlimited' === $b['licenses'] ? PHP_INT_MAX : $b['licenses'];
						return $a <=> $b;
					}
				);
				$data['pro'] = array(
					'id'         => isset( $plan->id ) ? absint( $plan->id ) : 0,
					'title'      => isset( $plan->title ) ? sanitize_text_field( $plan->title ) : '',
					'text'       => isset( $plan->description ) ? sanitize_text_field( $plan->description ) : '',
					'features'   => $features,
					'prices'     => $prices,
					// the free trial set in Freemius: its days (0: none), and whether it asks for a card first
					'trial'      => isset( $plan->trial_period ) ? absint( $plan->trial_period ) : 0,
					'trial_card' => ! empty( $plan->is_require_subscription ),
				);
			} elseif ( ! $prices && isset( $plan->name ) && 'free' === $plan->name ) {
				$data['free'] = $features;
			}
		}
		return $data;
	}

	// the Pro features the free plan does not have
	public static function pro_only( $data ) {
		if ( ! $data['pro'] ) {
			return array();
		}
		$free = array_map( 'strtolower', wp_list_pluck( $data['free'], 'title' ) );
		return array_values(
			array_filter(
				$data['pro']['features'],
				function ( $feature ) use ( $free ) {
					return ! in_array( strtolower( $feature['title'] ), $free, true );
				}
			)
		);
	}

	// the videos; a click plays one in a popup on the dashboard
	public static function videos() {
		return array(
			'https://www.youtube.com/watch?v=rA7Lb3rCvKo' => __( 'SoftIcon Poll in 30 seconds', 'softicon-poll' ),
			'https://www.youtube.com/watch?v=xaLxre2veIs' => __( 'Members-only polls: only logged-in users can vote', 'softicon-poll' ),
		);
	}

	// the dashboard is one page; each tab is a #/route in it
	public static function url( $tab = '' ) {
		return admin_url( 'admin.php?page=' . self::PAGE ) . ( $tab ? '#/' . $tab : '' );
	}

	public function menu() {
		add_menu_page(
			__( 'SoftIcon Poll', 'softicon-poll' ),
			__( 'Poll', 'softicon-poll' ),
			'manage_options',
			self::PAGE,
			array( $this, 'render' ),
			'dashicons-chart-bar',
			58
		);
		// with All Polls under it (includes/class-shortcode.php) the menu needs its own first item
		add_submenu_page( self::PAGE, __( 'SoftIcon Poll', 'softicon-poll' ), __( 'Dashboard', 'softicon-poll' ), 'manage_options', self::PAGE, array( $this, 'render' ) );
	}

	// a post type shown under another menu gets no Add New item of its own
	public function add_new_menu() {
		$type = get_post_type_object( Shortcode::TYPE );
		if ( $type ) {
			add_submenu_page( self::PAGE, $type->labels->add_new_item, $type->labels->add_new_item, $type->cap->create_posts, 'post-new.php?post_type=' . Shortcode::TYPE );
		}
	}

	public function action_links( $links ) {
		array_unshift( $links, '<a href="' . esc_url( self::url() ) . '">' . esc_html__( 'Dashboard', 'softicon-poll' ) . '</a>' );
		if ( ! self::is_pro() ) {
			$links[] = '<a href="' . esc_url( self::url( 'compare' ) ) . '" style="color:#be123c;font-weight:600">' . esc_html__( 'Free vs Pro', 'softicon-poll' ) . '</a>';
		}
		return $links;
	}

	public function row_meta( $links, $file ) {
		if ( plugin_basename( ALPL_PLUGIN_PATH . 'softicon-poll.php' ) === $file ) {
			$links[] = '<a href="' . esc_url( self::url( 'videos' ) ) . '">' . esc_html__( 'Video tutorials', 'softicon-poll' ) . '</a>';
		}
		return $links;
	}

	// a new file gets a new URL, so a browser never keeps an old copy after an update
	public static function version( $file ) {
		$time = file_exists( ALPL_PLUGIN_PATH . $file ) ? filemtime( ALPL_PLUGIN_PATH . $file ) : false;
		return $time ? ALPL_PLUGIN_VERSION . '.' . $time : ALPL_PLUGIN_VERSION;
	}

	public function enqueue_assets( $hook ) {
		if ( 'toplevel_page_' . self::PAGE !== $hook ) {
			return;
		}
		wp_enqueue_style( 'alpl-dashboard', ALPL_PLUGIN_URL . 'assets/css/dashboard.css', array(), self::version( 'assets/css/dashboard.css' ) );
		$script = file_exists( ALPL_PLUGIN_PATH . 'build/dashboard.asset.php' ) ? require ALPL_PLUGIN_PATH . 'build/dashboard.asset.php' : array(
			'dependencies' => array(),
			'version'      => ALPL_PLUGIN_VERSION,
		);
		wp_enqueue_script( 'alpl-dashboard', ALPL_PLUGIN_URL . 'build/dashboard.js', $script['dependencies'], $script['version'], true );
		wp_set_script_translations( 'alpl-dashboard', 'softicon-poll', ALPL_PLUGIN_PATH . 'languages' );
		wp_add_inline_script( 'alpl-dashboard', 'window.alplDashboard = ' . wp_json_encode( self::config() ) . ';', 'before' );
		// add-ons enqueue their tabs here; a script that adds tabs makes itself a dependency of alpl-dashboard
		do_action( 'alpl_dashboard_assets' );
	}

	// the tab names; their content is React (src/dashboard), an add-on adds its own through the alpl.dashboard.tabs JS filter
	public static function tabs() {
		$tabs = array(
			'welcome' => __( 'Welcome', 'softicon-poll' ),
			'polls'   => __( 'Polls', 'softicon-poll' ),
		);
		// the Pro pages, under Manage (self::groups()); the free plugin shows what each one does, Pro adds the real ones
		if ( ! self::is_pro() ) {
			foreach ( self::groups()[0]['items'] as $item ) {
				$tabs[ $item['key'] ] = $item['label'];
			}
		}
		if ( ! self::is_pro() || self::locked() ) {
			$tabs['pricing'] = __( 'Pricing', 'softicon-poll' );
			$tabs['compare'] = __( 'Free vs Pro', 'softicon-poll' );
		}
		$tabs['help'] = __( 'Help', 'softicon-poll' );
		return apply_filters( 'alpl_dashboard_tabs', $tabs );
	}

	// the Pro pages show as one Manage tab with its own menu (src/dashboard/App.js), in the free plugin and in Pro
	public static function groups() {
		$item = function ( $key, $icon, $label, $text ) {
			return array(
				'key'   => $key,
				'icon'  => $icon,
				'label' => $label,
				'text'  => $text,
			);
		};
		return array(
			array(
				'key'   => 'manage',
				'label' => __( 'Manage', 'softicon-poll' ),
				'items' => array(
					$item( 'analytics', 'chart-area', __( 'Analytics', 'softicon-poll' ), __( 'Votes, answers and exports', 'softicon-poll' ) ),
					$item( 'settings', 'shield', __( 'Settings', 'softicon-poll' ), __( 'CAPTCHA for your polls', 'softicon-poll' ) ),
				),
			),
		);
	}

	// a tab placed just before Help
	public static function before_help( $tabs, $key, $label ) {
		$at = array_search( 'help', array_keys( $tabs ), true );
		$at = false === $at ? count( $tabs ) : $at;
		return array_slice( $tabs, 0, $at, true ) + array( $key => $label ) + array_slice( $tabs, $at, null, true );
	}

	private static function config() {
		$tabs = array();
		foreach ( self::tabs() as $key => $label ) {
			$tabs[] = array(
				'key'   => $key,
				'label' => $label,
			);
		}
		$videos = array();
		foreach ( self::videos() as $url => $title ) {
			$videos[] = array(
				'url'   => $url,
				'title' => $title,
			);
		}
		$config = array(
			'tabs'       => $tabs,
			'pro'        => self::is_pro(),
			// Pro without a license: these tabs open the "this is a Pro feature" popup instead
			'locked'     => self::locked(),
			'groups'     => self::groups(),
			'lockedTabs' => self::locked() ? array_values( (array) apply_filters( 'alpl_dashboard_locked_tabs', array() ) ) : array(),
			'activate'   => self::locked() ? esc_url_raw( (string) apply_filters( 'alpl_activate_url', '' ) ) : '',
			'version'    => ALPL_PLUGIN_VERSION,
			'icon'       => ALPL_PLUGIN_URL . 'assets/images/icon-128x128.png',
			'videos'     => $videos,
			'review'     => self::review(),
			// the message after the Freemius opt-in screen (vendor/fs-lite): thanks, or the confirmation email to click;
			// the full Freemius SDK of SoftIcon Poll Pro shows its own notices and has no notice()
			'notice'     => function_exists( 'softicon_poll_fs' ) && method_exists( softicon_poll_fs(), 'notice' ) ? softicon_poll_fs()->notice() : null,
			'urls'       => array(
				'newPage'  => admin_url( 'post-new.php?post_type=page' ),
				'newPoll'  => admin_url( 'post-new.php?post_type=' . Shortcode::TYPE ),
				'allPolls' => admin_url( 'edit.php?post_type=' . Shortcode::TYPE ),
			),
			'start'      => self::start(),
			// the Help tab's "Your site details", copied into a support topic (only copied, never sent)
			'site'       => array(
				'wp'    => get_bloginfo( 'version' ),
				'php'   => PHP_VERSION,
				'theme' => wp_get_theme()->get( 'Name' ),
			),
		);
		return apply_filters( 'alpl_dashboard_config', $config );
	}

	// plain text for React, which escapes it: get_the_title() turns & into &#038;
	private static function plain( $html ) {
		return trim( html_entity_decode( wp_strip_all_tags( (string) $html ), ENT_QUOTES, 'UTF-8' ) );
	}

	// Getting started (src/dashboard/GettingStarted.js): the editors on this site, and the newest polls with their shortcodes
	private static function start() {
		$polls = array();
		foreach ( get_posts(
			array(
				'post_type'        => Shortcode::TYPE,
				'post_status'      => 'publish',
				'numberposts'      => 5,
				'orderby'          => 'modified',
				'suppress_filters' => false,
			)
		) as $poll ) {
			$title   = self::plain( get_the_title( $poll ) );
			$polls[] = array(
				'id'    => (int) $poll->ID,
				'title' => '' !== $title ? $title : __( '(no title)', 'softicon-poll' ),
				'edit'  => (string) get_edit_post_link( $poll->ID, 'raw' ),
			);
		}
		$count = wp_count_posts( Shortcode::TYPE );
		return array(
			'polls'      => $polls,
			'total'      => isset( $count->publish ) ? (int) $count->publish : 0,
			'elementor'  => did_action( 'elementor/loaded' ) > 0,
			'classic'    => class_exists( 'Classic_Editor' ),
			'blockTheme' => function_exists( 'wp_is_block_theme' ) && wp_is_block_theme(),
			'siteEditor' => admin_url( 'site-editor.php' ),
		);
	}

	// registered on every request (REST calls are not admin pages), see includes/class-alpl-poll.php
	public static function routes() {
		$admin = function () {
			return current_user_can( 'manage_options' );
		};
		register_rest_route(
			Rest::NS,
			'/dashboard/polls',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'polls' ),
				'permission_callback' => $admin,
			)
		);
		register_rest_route(
			Rest::NS,
			'/dashboard/plans',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'plans' ),
				'permission_callback' => $admin,
			)
		);
		register_rest_route(
			Rest::NS,
			'/dashboard/review',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'review_answer' ),
				'permission_callback' => $admin,
				'args'                => array(
					'answer' => array(
						'type'     => 'string',
						'required' => true,
						'enum'     => array( 'later', 'done' ),
					),
				),
			)
		);
	}

	// The Polls tab: every poll on the site, newest first. A poll id's owner is the post with its oldest meta row
	// (Block::owner()); the votes are counted for all of them in one query.
	public static function polls() {
		global $wpdb;
		$rows = $wpdb->get_results( $wpdb->prepare( "SELECT m.meta_value AS poll_id, m.post_id FROM {$wpdb->postmeta} m INNER JOIN ( SELECT MIN(meta_id) AS first_id FROM {$wpdb->postmeta} WHERE meta_key = %s GROUP BY meta_value ) o ON o.first_id = m.meta_id ORDER BY m.meta_id DESC LIMIT %d", Block::META, self::LIMIT + 1 ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- read on the dashboard only
		$rows = (array) $rows;
		$more = count( $rows ) > self::LIMIT;
		$rows = array_slice( $rows, 0, self::LIMIT );

		_prime_post_caches( array_map( 'intval', wp_list_pluck( $rows, 'post_id' ) ), false, false );
		$voters = Votes::voters( wp_list_pluck( $rows, 'poll_id' ) );

		$polls = array();
		foreach ( $rows as $row ) {
			$post = get_post( (int) $row->post_id );
			if ( ! $post ) {
				continue;
			}
			$id       = (string) $row->poll_id;
			$found    = Block::find( $post->ID, $id );
			$settings = $found ? Block::settings( $found ) : null;
			$type     = get_post_type_object( $post->post_type );
			$status   = get_post_status_object( $post->post_status );
			$title    = self::plain( get_the_title( $post ) );
			$open     = $settings ? Block::is_open( $settings ) : null;

			$polls[] = array(
				'id'        => $id,
				'question'  => $settings ? self::plain( $settings['question'] ) : '',
				'found'     => (bool) $settings,
				'open'      => $open,
				// the end date in the site's own format, while the poll is still open
				'ends'      => $open && $settings['endDate'] ? wp_date( get_option( 'date_format' ) . ' ' . get_option( 'time_format' ), $settings['endDate']->getTimestamp() ) : '',
				'voters'    => isset( $voters[ $id ] ) ? $voters[ $id ] : 0,
				'post'      => array(
					'id'     => (int) $post->ID,
					'title'  => '' !== $title ? $title : __( '(no title)', 'softicon-poll' ),
					'type'   => $type ? $type->labels->singular_name : $post->post_type,
					'status' => 'publish' !== $post->post_status && $status ? $status->label : '',
					'edit'   => (string) get_edit_post_link( $post->ID, 'raw' ),
					'view'   => is_post_publicly_viewable( $post ) ? (string) get_permalink( $post ) : '',
				),
				// a poll made under Poll → All Polls has a shortcode, a poll in a page or post does not
				'shortcode' => Shortcode::TYPE === $post->post_type ? Shortcode::code( $post->ID ) : '',
			);
		}

		return rest_ensure_response(
			array(
				'polls' => $polls,
				'more'  => $more,
				'limit' => self::LIMIT,
			)
		);
	}

	// when a published poll was first seen, when it was last looked for, "later" until when, and "done"
	private static function review_state() {
		return wp_parse_args(
			get_option( self::REVIEW, array() ),
			array(
				'since'   => 0,
				'checked' => 0,
				'later'   => 0,
				'done'    => false,
			)
		);
	}

	// a short review request on this dashboard only: 3 days after a published poll is first seen, until
	// the person reviews, says they did, or asks again later (30 days)
	public static function review() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return null;
		}
		$review = self::review_state();
		if ( $review['done'] || $review['later'] > time() ) {
			return null;
		}
		// a published page, post or poll with the block, looked for at most once a day until one is found
		if ( ! $review['since'] && $review['checked'] < time() - DAY_IN_SECONDS ) {
			$found             = new \WP_Query(
				array(
					'post_type'      => array_merge( array_values( get_post_types( array( 'exclude_from_search' => false ) ) ), array( Shortcode::TYPE ) ),
					'post_status'    => 'publish',
					's'              => 'wp:' . Block::NAME,
					'sentence'       => true,
					'posts_per_page' => 1,
					'fields'         => 'ids',
					'no_found_rows'  => true,
				)
			);
			$review['checked'] = time();
			$review['since']   = $found->posts ? time() : 0;
			update_option( self::REVIEW, $review, false );
		}
		if ( ! $review['since'] || $review['since'] > time() - 3 * DAY_IN_SECONDS ) {
			return null;
		}
		return array( 'url' => 'https://wordpress.org/support/plugin/softicon-poll/reviews/#new-post' );
	}

	public static function review_answer( \WP_REST_Request $request ) {
		$review = self::review_state();
		if ( 'done' === $request->get_param( 'answer' ) ) {
			$review['done'] = true;
		} else {
			$review['later'] = time() + 30 * DAY_IN_SECONDS;
		}
		update_option( self::REVIEW, $review, false );
		return rest_ensure_response( array( 'ok' => true ) );
	}

	// the Pricing and Free vs Pro tabs: the plans from Freemius and what the checkout needs;
	// ?cached=1 only reads what is kept and never asks Freemius
	public static function plans( $request = null ) {
		$data             = self::freemius( ! ( $request && $request->get_param( 'cached' ) ) );
		$data['pro_only'] = self::pro_only( $data );
		$product          = ( self::is_pro() && ! self::locked() ) ? null : self::product();
		$data['checkout'] = ! $product ? null : array(
			'product' => $product[0],
			'key'     => $product[1],
			// no image: the checkout shows the product icon set in Freemius, and the site's own address is not sent
			'base'    => 'https://checkout.freemius.com/plugin/' . $product[0] . '/',
			'coupon'  => Black_Friday::coupon(),
			// the percent off, for the sale prices on the cards
			'off'     => Black_Friday::coupon() ? (int) Black_Friday::OFF : 0,
		);
		return rest_ensure_response( $data );
	}

	// React draws the whole page into #alpl-dashboard
	public function render() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		?>
		<div class="wrap alpl-dash-notices">
			<h1 class="screen-reader-text"><?php echo esc_html( self::is_pro() ? __( 'SoftIcon Poll Pro', 'softicon-poll' ) : __( 'SoftIcon Poll', 'softicon-poll' ) ); ?></h1>
			<hr class="wp-header-end">
		</div>
		<div id="alpl-dashboard" class="alpl-dash">
			<noscript><p><?php esc_html_e( 'The Poll dashboard needs JavaScript.', 'softicon-poll' ); ?></p></noscript>
		</div>
		<?php
	}
}
