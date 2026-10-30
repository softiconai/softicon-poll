# SoftIcon Poll

A poll block for the WordPress block editor. Votes are saved on your own site, with no account or outside service, and the poll keeps working on cached pages.

[Report an issue](https://github.com/softiconai/softicon-poll/issues) · Requires WordPress 6.5+ · PHP 7.4+ · GPLv2 or later

## Features

- Question and answers written right in the block, with an optional image per answer
- One answer or several, with a limit on how many
- Results after voting, always, when the poll closes, or never; as percent, votes or both, with animated bars
- End date or close by hand; optionally only for logged-in users
- One vote per visitor: by account when logged in, otherwise by browser cookie and a salted hash of the IP address (the address itself is never stored)
- Works behind page caches: the vote and the results come from the REST API
- Current results and "Reset votes" in the block sidebar
- Real radio buttons and checkboxes, keyboard friendly, results announced to screen readers, RTL ready

## Development

```bash
npm install
npm run start   # watch
npm run build   # production build
npm run zip     # build + .pot + release zip
```

PHP is in `includes/` (`block.php` settings and poll lookup, `votes.php` the `{prefix}alpl_votes` table, `rest.php` the `softicon-poll/v1` routes). `src/vendor/softicon-tools/` is copied from the shared SoftIcon tools folder before every build.

## Support

Email softiconai@gmail.com.
