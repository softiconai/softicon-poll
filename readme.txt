=== SoftIcon Poll – Poll & Survey Block ===
Contributors: softiconai
Tags: poll, survey, voting, block, poll block
Requires at least: 6.5
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 1.1.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

A poll block for the block editor. Votes are saved on your own site, with no account or outside service, and work on cached pages.

== Description ==

**SoftIcon Poll** adds a **Poll** block to the block editor. Write the question and the answers right in the block, publish, and visitors vote. The votes stay in your own WordPress database: no sign-up, no outside service, and nothing about your visitors is sent anywhere.

https://www.youtube.com/watch?v=rA7Lb3rCvKo

= Why choose SoftIcon Poll? =

* **Block first** – the question and answers are edited in place, and the results can be previewed in the editor with your colors.
* **Your data stays with you** – votes are saved in a table on your own site. Nothing about your visitors or their votes is sent to another server.
* **Works with caching plugins** – the page can be cached; the vote and the results come from your site's REST API.
* **One vote per person** – by account for logged-in visitors, otherwise by a browser cookie and a scrambled code made from the IP address. The IP address itself is never saved.
* **Accessible** – real radio buttons and checkboxes, full keyboard use, and the results are read out to screen readers.

= Features =

* Question and any number of answers, with an optional image for each answer
* Answers as a list, or as image cards in 2, 3 or 4 columns
* Shuffle the answers, so each visitor sees them in a new order
* Ready-made polls in the inserter: Yes / No, Rating, Reactions (emoji) and Multiple choice
* One answer, or several answers with an optional limit ("Choose up to 2 answers")
* Show the results after voting, always (with a "View results" link), only when the poll is closed, or never
* Results as percent, number of votes or both, with animated bars and the total number of votes
* Results sorted with the most votes first (optional), and a "Your vote" tag beside the visitor's answer
* Four designs: Default, Card, Minimal and Pill
* Your own text for the Vote button and the thank-you message
* End date and time, or close the poll by hand, with an optional countdown ("Voting ends in 3 hours")
* Only logged-in users can vote (optional); others get a link to log in and come back
* Current results and a "Reset votes" button in the block settings
* Colors for the background, text, accent, bars, border and the Vote button; font size and corner radius; wide and full width alignment
* Works in posts, pages, synced patterns, templates and template parts (for example a poll in the footer of every page)
* A shortcode for the Classic Editor, widgets and page builders such as Elementor, Divi, Beaver Builder, WPBakery, Bricks and Oxygen, for example `[softicon_poll id="123"]`
* Translation ready and right-to-left ready

= Privacy =

Polls on your pages contact no external service: the votes and the results go only between the visitor's browser and your own site.

In the admin, after activation, the plugin asks once if you want to share basic data with us through Freemius (wp.freemius.com, api.freemius.com). It is optional, and nothing about you or your site is sent unless you click "Allow & Continue". See "Does the plugin collect any data?" below. Freemius [terms](https://freemius.com/terms/) and [privacy policy](https://freemius.com/privacy/).

== Installation ==

1. In your WordPress admin go to Plugins > Add New, search for "SoftIcon Poll" and click Install, then Activate. Or upload the plugin folder to `/wp-content/plugins/` and activate it on the Plugins screen.
2. Edit a post or page, add the **Poll** block (or search for "poll"), write the question and the answers.
3. Choose when the results show, an end date and the colors in the block settings, then publish.

== Frequently Asked Questions ==

= Do I need an account or an outside service? =

No. Everything runs on your own site, and the votes are saved in your own database (in a table named `wp_alpl_votes`, with your table prefix). The only outside service is an optional opt-in for you, the site admin; see "Does the plugin collect any data?".

= How does "one vote per person" work? =

A logged-in visitor votes once per account. A visitor who is not logged in is recognised by a browser cookie and by a scrambled code made from the IP address, so clearing cookies does not allow a second vote.

People who share one internet connection, for example a family or an office, share one IP address, so only one of them can vote while not logged in. If that matters for your poll, turn on "Only logged-in users" in the Voting panel: then every account votes once.

= My site is behind Cloudflare or another proxy. Does that matter? =

Behind Cloudflare the plugin reads the visitor's real address from Cloudflare's header, but only when the request really comes from Cloudflare, so the header can't be faked.

Behind another proxy or load balancer, every visitor may seem to come from the proxy's address, and then only one vote would be possible. Return the real address with the `alpl_voter_ip` filter, for example:

`add_filter( 'alpl_voter_ip', function ( $ip ) { return $_SERVER['HTTP_X_REAL_IP'] ?? $ip; } );`

Only do this when your proxy always sets that header, or visitors could fake it.

= Does it work with caching plugins? =

Yes. The page holds only the question and answers. Whether the visitor has voted, and the results, are loaded from your site when the poll comes into view, so a cached page still shows the current results and a poll you have closed.

= Why do the percentages add up to more than 100%? =

Only in polls that allow several answers. The percent is the share of people who voted that picked that answer, so if every voter picks two answers the shares add up to 200%.

= Does it work with the Classic Editor or page builders? =

Yes. Go to Poll → All Polls in the admin menu, click Add a poll, write the question and answers in the block editor and publish it. The list shows its shortcode, such as `[softicon_poll id="123"]`, and a click copies it. Paste it in the Classic Editor, a text widget, Elementor's Shortcode widget (the poll shows in Elementor's preview too), a Code module in Divi, an HTML module in Beaver Builder, a Text Block in WPBakery, or the Shortcode element in Bricks and Oxygen. Change the poll there later and every page with its shortcode shows the change. All pages with the same shortcode share one set of votes. Poll → Dashboard lists every poll on the site, with its shortcode, under the Polls tab.

= Can I put a poll in the sidebar or footer? =

Yes, with a block theme: add it to a template or template part (for example the footer) in the Site Editor, and it works on every page that uses it. With a classic theme's widget area, put the poll's shortcode in a Shortcode or Text widget, or put the poll in a synced pattern and add that pattern to the widget area.

= What happens if I copy a poll to another post? =

The copy gets its own new id when you open it in the editor, so the two polls keep separate votes. A poll inside a synced pattern keeps one set of votes wherever the pattern is used.

= How do I reset the votes? =

Select the poll, open the Votes panel in the block settings and click "Reset votes". You are asked to confirm first.

= Is it GDPR friendly? =

The plugin saves the chosen answers and a scrambled code made from the user account or the IP address; the code can't be turned back into the address. Visitors who are not logged in get a cookie named `alpl_voted_` followed by the poll's id, for one year. Suggested text for your privacy policy is added under Settings > Privacy > Policy Guide.

= Does the plugin collect any data? =

**From your visitors: nothing.** The votes are saved on your own site, and nothing about your visitors is sent anywhere.

**From you, the site admin: only if you say yes.** After activation, the plugin asks once if you would like to opt in. Click "Skip" and nothing about you or your site is ever sent; the plugin works exactly the same either way.

If you click "Allow & Continue", this is shared with us through [Freemius](https://freemius.com), the service we use to manage our users:

* **Your profile:** your first name, last name and email address.
* **Your site:** the site address, title and language, and an anonymous site ID (a one-way code made on your site, so the same site is not counted twice).
* **Versions:** your WordPress, PHP and SoftIcon Poll versions.
* **Plugin events:** when the plugin is activated, deactivated, updated or deleted.

We never collect your posts, pages, polls or votes, anything about your visitors, or the list of your other plugins and themes.

**Why we ask:** to email you about security fixes and important new features, to know which WordPress and PHP versions we must keep supporting, and to learn what to improve.

**Changed your mind?** Click "Opt Out" under SoftIcon Poll on the Plugins page and nothing more is sent. To have your data deleted, email us at softiconai@gmail.com.

**When you deactivate the plugin**, a short form asks why. Answering is optional ("Skip & Deactivate" is always there). If you choose a reason, it is sent only when you delete the plugin. If you never opted in, only the reason and the anonymous site ID are sent, never your name or email.

The opt-in is a small built-in client (vendor/fs-lite/fs-lite.php) instead of the full Freemius SDK. It connects to wp.freemius.com and api.freemius.com and nowhere else. If your server is not allowed to reach Freemius, your browser sends the same opt-in to wp.freemius.com instead, and Freemius sends you back to the plugin's dashboard.

= What is removed when I delete the plugin? =

Deleting the plugin removes the votes table, its settings, the opt-in choice and the note of which post each poll belongs to. The polls in your posts stay as blocks. Deleting a post for good also deletes the votes of the polls made in it.

= Where is the source code? =

The plugin includes its unminified source in the `src` folder; the files in `build` are made from it with `npm run build`. It is also on GitHub: [github.com/softiconai/softicon-poll](https://github.com/softiconai/softicon-poll).

== Screenshots ==

1. A poll on the page: the visitor picks an answer and votes.
2. The results after voting: percent and number of votes for each answer, the visitor's answer in bold, and the total.
3. Ready-made polls: Rating, Reactions (number of votes only) and Yes / No, each with its own accent color.
4. Answers with images, "Choose up to 2 answers" and an end date.
5. The question and answers are written right in the block. The Results panel sets when and how the results show.
6. The current votes in the block settings, with Refresh and Reset votes.
7. The Style tab: background, text, accent, bar and border colors.
8. Ready-made polls in the block inserter: search for "poll".

== Changelog ==

= 1.1.1 =
* Faster pages with many polls: the polls on a page now load together in one request instead of one request each.
* "Only logged-in users" is now at the top of the Voting panel, so it is easier to find.
* New: the Welcome tab of the Poll dashboard asks how you want to add your poll: as a Block (a new page with an empty poll) or with a Shortcode (a new poll under All Polls, for the Classic Editor and page builders). The way that fits your site is marked, and the poll then shows the steps for the way you picked. After activation the dashboard opens.
* New: an optional opt-in after activation, on a screen of its own, for security and feature update emails, through Freemius. "Allow & Continue" or "Skip" then opens the Poll dashboard. Nothing about you or your site is sent unless you click "Allow & Continue", and your visitors are never tracked. See "Does the plugin collect any data?" in the FAQ.

= 1.1.0 =
* New: four designs for the poll, Default, Card, Minimal and Pill, in the block's Styles.
* New: your own text for the Vote button and the thank-you message (Texts panel).
* New: "Most votes first" sorts the results by votes.
* New: a "Your vote" tag beside the answer the visitor picked.
* New: answers as image cards in 2, 3 or 4 columns (Layout in the Answers panel).
* New: "Shuffle the answers" shows them in a new order for each visitor.
* New: a countdown to the end date.
* New: colors for the Vote button and its text, and font size and corner radius controls.
* New: a shortcode for the Classic Editor, widgets and page builders. Make a poll under Poll → All Polls, publish it and paste its shortcode, such as `[softicon_poll id="123"]`. In Elementor's Shortcode widget the poll shows right away in the editor.
* New: a Poll dashboard in the admin menu (Poll → Dashboard): getting started for the block editor, the Classic Editor, page builders and themes; a list of every poll on the site with the post it is in, open or closed, the number of voters and its shortcode; and help with quick answers.
* Fix: colors from a theme palette written as rgb() or rgba() now show on the page too (WordPress 7.1 removes rgb() from a block's style, so they are saved as hex).

= 1.0.2 =
* New name in the plugin list: SoftIcon Poll – Poll & Survey Block.

= 1.0.1 =
* The voting REST responses set their no-cache headers through set_headers(), so the plugin passes the Block Directory check.

= 1.0.0 =
* First release.
