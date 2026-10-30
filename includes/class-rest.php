<?php
namespace ALPL_Poll;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// The page only holds the question and answers; whether this visitor voted and the results come from here,
// so a page cache can keep the poll without freezing it.
class Rest {

	const NS         = 'softicon-poll/v1';
	const RATE_LIMIT = 20; // votes per address per minute
	// posts shown on pages that are not their own: a poll in one of these can be voted on from any page
	const SHARED = array( 'wp_template', 'wp_template_part', 'wp_block' );

	public function __construct() {
		add_action( 'rest_api_init', array( $this, 'routes' ) );
	}

	public function routes() {
		$id = '(?P<id>[a-z0-9]{6,32})';

		// public on purpose: visitors of cached pages have no nonce; the poll is read from its own post and every value is checked
		register_rest_route(
			self::NS,
			'/results/' . $id,
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'results' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			self::NS,
			'/vote',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'vote' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'poll'    => array(
						'type'     => 'string',
						'required' => true,
						'pattern'  => '^[a-z0-9]{6,32}$',
					),
					'choices' => array(
						'type'     => 'array',
						'required' => true,
						'items'    => array( 'type' => 'string' ),
						'maxItems' => 100,
					),
				),
			)
		);

		// a poll copied from another post gets a new id in the editor, or the two would share their votes
		register_rest_route(
			self::NS,
			'/id-taken/' . $id,
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'id_taken' ),
				'permission_callback' => function () {
					return current_user_can( 'edit_posts' );
				},
				'args'                => array(
					'post' => array(
						'type'     => 'integer',
						'required' => true,
					),
				),
			)
		);

		// the editor's Votes panel
		register_rest_route(
			self::NS,
			'/manage/' . $id,
			array(
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( $this, 'manage' ),
					'permission_callback' => array( $this, 'can_manage' ),
				),
				array(
					'methods'             => \WP_REST_Server::DELETABLE,
					'callback'            => array( $this, 'reset' ),
					'permission_callback' => array( $this, 'can_manage' ),
				),
			)
		);
	}

	// editors manage every poll, authors the polls whose own post they can edit
	public function can_manage( $request ) {
		if ( current_user_can( 'edit_others_posts' ) ) {
			return true;
		}
		$owner = Block::owner( $request['id'] );
		return $owner && current_user_can( 'edit_post', $owner );
	}

	// browsers send Origin with requests from other sites: a form there may not vote for its visitors,
	// nor a script read how they voted
	private static function cross_site( \WP_REST_Request $request ) {
		$origin = $request->get_header( 'origin' );
		if ( ! $origin ) {
			return false;
		}
		$hosts = array( wp_parse_url( home_url(), PHP_URL_HOST ), wp_parse_url( site_url(), PHP_URL_HOST ) );
		return ! in_array( wp_parse_url( $origin, PHP_URL_HOST ), $hosts, true );
	}

	// the settings always come from the poll's own post, never from a copy of the block elsewhere,
	// so nobody can open a closed poll or change its rules by saving a copy with other settings
	private static function poll( $poll_id ) {
		$owner = get_post( Block::owner( $poll_id ) );
		$found = null;
		if ( $owner ) {
			$shared = in_array( $owner->post_type, self::SHARED, true ) && 'publish' === $owner->post_status;
			// published and not behind a password, or a draft its editor previews
			$viewable = ( is_post_publicly_viewable( $owner ) && ! post_password_required( $owner ) ) || current_user_can( 'edit_post', $owner->ID );
			$found    = $shared || $viewable ? Block::find( $owner->ID, $poll_id ) : null;
		}
		if ( ! $found ) {
			return new \WP_Error( 'alpl_not_found', __( 'This poll could not be found.', 'softicon-poll' ), array( 'status' => 404 ) );
		}
		$settings          = Block::settings( $found );
		$settings['owner'] = $owner->ID;
		return $settings;
	}

	// what view.js needs: can this visitor vote, what did they choose, and the results when they may see them
	private static function state( $settings ) {
		$id   = $settings['id'];
		$rows = Votes::choices_of( $id, Votes::voter( $id ) );
		// a poll for logged-in users counts accounts only, not the browser
		$cookie      = ! $settings['loginOnly'] && Votes::has_cookie( $id );
		$voted       = (bool) $rows || $cookie;
		$open        = Block::is_open( $settings );
		$needs_login = $settings['loginOnly'] && ! is_user_logged_in();
		// a match by address alone may be someone else on the same network: they learn a vote was cast, not which
		$own = is_user_logged_in() || $cookie;

		switch ( $settings['showResults'] ) {
			case 'always':
				$show = true;
				break;
			case 'closed':
				$show = ! $open;
				break;
			case 'never':
				$show = current_user_can( 'edit_post', $settings['owner'] );
				break;
			default:
				$show = $voted || ! $open;
		}

		$results = null;
		if ( $show ) {
			$all    = Votes::results( $id );
			$counts = array();
			// votes for answers removed since then are left out
			foreach ( $settings['options'] as $option ) {
				$counts[ $option['id'] ] = isset( $all['counts'][ $option['id'] ] ) ? $all['counts'][ $option['id'] ] : 0;
			}
			$results = array(
				'counts' => (object) $counts,
				'voters' => $all['voters'],
			);
		}

		return array(
			'open'       => $open,
			'voted'      => $voted,
			'choices'    => $own ? array_values( array_diff( $rows, array( Votes::BALLOT ) ) ) : array(),
			'canVote'    => $open && ! $voted && ! $needs_login,
			'needsLogin' => $open && ! $voted && $needs_login,
			'results'    => $results,
		);
	}

	private static function respond( $data ) {
		$response = rest_ensure_response( $data );
		// per visitor, a CDN must not keep one visitor's answer for the next
		foreach ( wp_get_nocache_headers() as $name => $value ) {
			if ( $value ) {
				$response->header( $name, $value );
			}
		}
		return $response;
	}

	private static function other_site_error() {
		return new \WP_Error( 'alpl_other_site', __( 'Please vote on the site itself.', 'softicon-poll' ), array( 'status' => 403 ) );
	}

	public function results( \WP_REST_Request $request ) {
		if ( self::cross_site( $request ) ) {
			return self::other_site_error();
		}
		$settings = self::poll( $request['id'] );
		return is_wp_error( $settings ) ? $settings : self::respond( self::state( $settings ) );
	}

	// counts requests per address for a minute; the address is hashed for the key too
	private static function rate_limited() {
		$key   = 'alpl_rate_' . wp_hash( 'rate|' . Votes::network() );
		$count = (int) get_transient( $key );
		if ( $count >= (int) apply_filters( 'alpl_rate_limit', self::RATE_LIMIT ) ) {
			return true;
		}
		set_transient( $key, $count + 1, MINUTE_IN_SECONDS );
		return false;
	}

	// the page shows the right state from the error's data
	private static function refuse( $code, $message, $status, $state ) {
		return new \WP_Error(
			$code,
			$message,
			array(
				'status' => $status,
				'state'  => $state,
			)
		);
	}

	public function vote( \WP_REST_Request $request ) {
		if ( self::cross_site( $request ) ) {
			return self::other_site_error();
		}
		if ( self::rate_limited() ) {
			return new \WP_Error( 'alpl_rate_limited', __( 'Too many votes from your network. Please try again in a minute.', 'softicon-poll' ), array( 'status' => 429 ) );
		}

		$settings = self::poll( $request['poll'] );
		if ( is_wp_error( $settings ) ) {
			return $settings;
		}

		$state = self::state( $settings );
		if ( ! $state['open'] ) {
			return self::refuse( 'alpl_closed', __( 'This poll is closed.', 'softicon-poll' ), 403, $state );
		}
		if ( $state['needsLogin'] ) {
			return self::refuse( 'alpl_login', __( 'Please log in to vote.', 'softicon-poll' ), 403, $state );
		}
		$voted = __( 'You have already voted.', 'softicon-poll' );
		if ( $state['voted'] ) {
			return self::refuse( 'alpl_voted', $voted, 409, $state );
		}

		$allowed = wp_list_pluck( $settings['options'], 'id' );
		$choices = array_values( array_unique( array_map( array( Block::class, 'option_id' ), (array) $request['choices'] ) ) );
		if ( ! $choices || array_diff( $choices, $allowed ) || count( $choices ) > $settings['max'] ) {
			return new \WP_Error( 'alpl_invalid', __( 'Please choose a valid answer.', 'softicon-poll' ), array( 'status' => 400 ) );
		}

		$id = $settings['id'];
		// another request of the same voter got in first
		if ( ! Votes::add( $id, Votes::voter( $id ), $choices ) ) {
			return self::refuse( 'alpl_voted', $voted, 409, self::state( $settings ) );
		}

		// the browser remembers the vote too, for visitors whose address changes
		if ( ! $settings['loginOnly'] ) {
			setcookie(
				Votes::cookie( $id ),
				Votes::cookie_value( $id ),
				array(
					'expires'  => time() + YEAR_IN_SECONDS,
					'path'     => COOKIEPATH ? COOKIEPATH : '/',
					'domain'   => COOKIE_DOMAIN ? COOKIE_DOMAIN : '',
					'secure'   => is_ssl(),
					'httponly' => true,
					'samesite' => 'Lax',
				)
			);
			$_COOKIE[ Votes::cookie( $id ) ] = Votes::cookie_value( $id );
		}

		return self::respond( self::state( $settings ) );
	}

	public function id_taken( \WP_REST_Request $request ) {
		$owner = Block::owner( $request['id'] );
		return self::respond( array( 'taken' => $owner && absint( $request['post'] ) !== $owner ) );
	}

	// every count, also for answers removed since; an empty list stays a JSON object
	private static function raw_results( $poll_id ) {
		$results           = Votes::results( $poll_id );
		$results['counts'] = (object) $results['counts'];
		return $results;
	}

	public function manage( \WP_REST_Request $request ) {
		return self::respond( self::raw_results( $request['id'] ) );
	}

	public function reset( \WP_REST_Request $request ) {
		Votes::reset( $request['id'] );
		return self::respond( self::raw_results( $request['id'] ) );
	}
}
