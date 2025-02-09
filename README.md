PaperCut
========

This site collects some PaperCut utilities used by the CITES PaperCut
implementation. This includes our Shibboleth setup and our common
print scripts.

# Shibboleth

We handle SSO for PaperCut by placing it behind a Linux Apache reverse proxy,
and handle the Shibboleth portion at the proxy level. Included in this
repository are the basic Apache configurations we use to make this work.

For Shibboleth, the configuration only uses the `uid` attribute for a
login name. The proxy expects it in the Apache environment as `uid`,
so if your `attribute-map.xml` names it another way either change it there
or change it in the proxy configuration.

PaperCut needs to be configured as "WebAuth" with your proxy IP address
and the name of the header the login information will be sent as. We use
`SSO-USER`, although any name will work as long as you adjust the
configuration. We've also only enabled SSO for the "user login". Admin
and other logins continue to use the native PaperCut authentication.

The logout URL will be `https://papercut.example.org/Shibboleth.sso/Logout`.
You should also configure PaperCut with your proxy IP address for
"Trusted Proxy Servers for Mobile Client access" if you intend to use
SSO on the `/ios` and `/client` endpoints.

The Apache configuration is setup to use "papercut.example.org" for
the SSO endpoint, and "papercut-app.example.org" for the PaperCut
Application Server. It runs SSO on ports 80 and 443, and standard user
authentication on ports 9191 and 9192 (for admins or other users who
can't use SSO).

It also assumes that your SSL configuration is available as
`/etc/apache2/vhosts.d/ssl.include`. If you don't have it there, or you
define it in another way, you will need to adjust the `00papercut.conf`
file.

# print-script-common.js

You install the script by placing it in your
"server/custom/" directory on the PaperCut Application Server. It will
be loaded for every printer script. To run the common functions you
will need to install some additional hooks. We do this in our template
printer:

```javascript
function printJobHook(inputs, actions) {
  if (common_printJobHook(inputs, actions))
    return;
}

function printJobAfterAccountSelectionHook(inputs, actions) {
  if (common_printJobAfterAccountSelectionHook(inputs, actions))
    return;
}
```

Each hook takes a third argument which is an optional options hash.
For example, to disabled the "siteRestrictUsers" feature you would:

```javascript
// Example: don't restrict site users
function printJobHook(inputs, actions) {
  var options = {
    siteRestrictUsers: false
  };

  if (common_printJobHook(inputs, actions, options))
    return;
}

function printJobAfterAccountSelectionHook(inputs, actions) {
  var options = {
    siteRestrictUsers: false
  };

  if (common_printJobAfterAccountSelectionHook(inputs, actions, options))
    return;
}
```

The features are described next with examples.

## discountGroups

Allows you to offer discounted page rates to specific PaperCut
user groups. You configure this feature by passing in an object
where the keys are group names and the values are another object
of color/bw rates. For example, suppose you want to offer the
"CITES-ICS-Student-Staff" group a rate of "0.20/0.05" and the 
"CITES-ICS-Staff" group a rate of "0.10/0.01". You would pass
in a options object of:

```javascript
// Example: charge a couple groups discount rates
var options = {
  discountGroups: {
    'CITES-ICS-Student-Staff': { color: 0.20, bw: 0.05 },
    'CITES-ICS-Staff': { color: 0.10, bw: 0.01 }
  }
};
```

Note: if a user is in multiple groups they are given the single
best discount rate.

Default: `false`

## notifyPrinted

Displays a message to the user that their job has been held in
a queue for printing.

```javascript
// Example: notify users their job is held
var options = {
  notifyPrinted: true
};
```

Default: `false`

## noClientAccount

What account to select when the user has the account selection
popup enabled, but are not running the PCClient or one of the
web clients. This can be any shared account, or the special
value `'[personal]'`.

```javascript
// Example: change the account clientless users default to
var options = {
  noClientAccount: 'CITES-ICS Staff Credit'
};
```

Default: `'[personal]'`

## siteRestrictUsers

Allows you to restrict some users to printing at only specific
sites. Mostly used for conference users who are given credit
at only a specific location. However, it can be used for any
user you might want to limit. The value of this key is an object
that configures the sub-options. Alternately, you can specify
`false` to disable the feature.

### siteRestrictUsers.restrictGroupName

Name of a PaperCut group that lets the feature know a user is
restricted. If a user is not in this group then printing is
allowed. If the user is in this group, then an additional site
group is checked to see if they are allowed at this site.

This group should almost certainly be a nested group containing
all of your site groups. That way when a user is added to a
site group they are automatically restricted at all other sites.

```javascript
// Example: change the restricted users group
var options = {
  siteRestrictUsers: {
    restrictGroupName: 'CITES-ICS-RestrictedUsers'
  }
};
```

Default: `'CITES-PaperCut-SiteUsers'`

### siteRestrictUsers.printerNameRegexp

The feature looks for the site name in the printer name. This
requires you to adopt a standard for naming printers in your
department. By default, it takes all letters and numbers
before the first `-` or `_` as the site name.

If you use some other naming convention then you can change
the regular expression using this option. The first capture
group will be used as the site name.

```javascript
// Example: take letters/numbers after 'site-'
var options = {
  siteRestrictUsers: {
    printerNameRegexp: /site-([a-z0-9]+)-/i
  }
};
```

Default: `/^([a-z0-9]+)[_-]/i`

### siteRestrictUsers.groupNameTemplate

Tells the feature how to use the site name to build a PaperCut
group name. The site name used is always uppercased, since
PaperCut checks groups in a case sensetive fashion.

It will replaces "%site%" in the string with the uppercase
site name.

```javascript
// Example: change the restricted site name group
var options = {
  siteRestrictUsers: {
    groupNameTemplate: 'CITES-ICS-RestrictedUsers-%site%'
  }
};
```

Default: `'CITES-PaperCut-SiteUsers-%site%'`

## checkAccountPrinterGroup

*Only available in the after account selection hook.*

PaperCut does not offer a way to limit shared accounts to
only specific printers. This feature lets you do that through
scripting and by adopting a naming convention for your shared
accounts.

This controls if the selected account is checked for a printer group
prefix, and if so checks if the printer is in that group. Restricted
shared accounts must be prefixed with `[Printer Group] `. For
example, suppose you have a shared account for CITES-ICS Staff
credit that should be restricted to the "Department:ICS" printers.
You would name this shared account:

    [Department:ICS] CITES-ICS Staff Credit

When the script see the account name starts with `[.*] ` it will take
that for a printer group and check that the printer is a member.

```javascript
// Example: disabled the check account printer group feature
var options = {
  checkAccountPrinterGroup: false
};
```

Default: `true`
