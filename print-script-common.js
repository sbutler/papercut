/*
 * Copyright (c) 2017 University of Illinois Board of Trustees
 * All rights reserved.
 *
 * Developed by:   Technology Services
 *                 University of Illinois at Urbana Champaign
 *                 https://techservices.illinois.edu/
 *
 * ==== License ====
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal with the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 *     - Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimers.
 *
 *     - Redistributions in binary form must reproduce the above
 *     copyright notice, this list of conditions and the following
 *     disclaimers in the documentation and/or other materials provided
 *     with the distribution.
 *
 *     Neither the names of CITES-ICS, University of Illinois at Urbana-
 *     Champaign, nor the names of its contributors may be used to
 *     endorse or promote products derived from this Software without
 *     specific prior written permission.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE CONTRIBUTORS OR COPYRIGHT HOLDERS BE LIABLE FOR
 * ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 * CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS WITH THE SOFTWARE.
 *
 * ==== Description ====
 *
 * print-script-common.js file for the CITES PaperCut instance. Should
 * be placed in "server/custom/print-script-common.js" for the PaperCut
 * Application Server. Each printer script will need to call two hooks:
 *
 * function printJobHook(inputs, actions) {
 *   if (common_printJobHook(inputs, actions))
 *     return;
 * }
 *
 * function printJobAfterAccountSelectionHook(inputs, actions) {
 *   if (common_printJobAfterAccountSelectionHook(inputs, actions))
 *     return;
 * }
 *
 * Each hook takes an optional third argument that configures options.
 * You can place your own scripts before or after the hooks.
 */
/* jshint multistr: true */

/*
 * ========== Utility Functions ==========
 */

/*
 * Logs to the debug log, including some standard formatting, if debug logging
 * is enabled.
 */
function common_debugLog( inputs, actions, message )
/*{
  actions.log.debug(
    inputs.job.fullPrinterName + " " + inputs.job.username + "@" + inputs.job.clientIP + " - " +
    message
  );
}*/
{}

/*
 * Checks to see if the client is running. This first will short circuit "no"
 * for any webprint jobs.
 */
function common_isClientRunning( inputs )
{
  return !inputs.job.isWebPrintJob && inputs.client.isRunning;
}

/*
 * Get the type of an object. You would think that JavaScript's
 * typeof operator would be enough, but see:
 *
 * http://javascriptweblog.wordpress.com/2011/08/08/fixing-the-javascript-typeof-operator/
 *
 * Most importantly for us, this returns "object" for a plain old
 * JavaScript object.
 */
function common_toType( obj )
{
  return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
}

/*
 * Merge one set of an options object into another. Used to provide
 * defaults and let them be overriden. This will work recursively on
 * plain objects, but not on arrays.
 *
 * Adopted from jQuery.extend()
 */
function common_mergeOptions( tgt, src )
{
  // If the target evaluates to something that is false, then there
  // is likely nothing to merge. Return src.
  if (!tgt)
    return src;
  // If the source isn't a real value, then there is likely nothing
  // to merge. Return tgt.
  if (typeof src === 'undefined' || src === null)
    return tgt;

  for (var key in src)
  {
    if (src.hasOwnProperty( key ))
    {
      var srcCopy = src[ key ];

      // Prevent never-ending loop
      if (tgt === srcCopy)
        continue;

      // Check to see if the source is an object that evaluates to true
      // (ie, not null). Do not merge arrays!
      if (srcCopy && common_toType( srcCopy ) == 'object')
      {
        // Make sure the target is an object, or create a new one
        var tgtCopy = (tgt[ key ] && common_toType( tgt[ key ] ) == 'object') ? tgt[ key ] : {};

        tgt[ key ] = common_mergeOptions( tgtCopy, srcCopy );
      }
      else
        tgt[ key ] = srcCopy;
    }
  }

  return tgt;
}

/*
 * ========== Hooks ==========
 *
 * Each hook accepts the same options.
 *
 * - discountGroups: object where the keys are PaperCut group
 *   names and the values are objects of color/bw rates. For
 *   example:
 *
 *     { 'CITES-ICS-Staff': { color: 0.20, bw: 0.05 } }
 *
 *   Note that the rates are floats, not strings. The best
 *   discount among all the groups and the original rate
 *   is the one applied.
 *
 *   Default: false
 *
 *
 * - freeGroups: array of group names for users who should
 *   get free printing. For example:
 *
 *     [ 'FreeUsers-Group1', 'FreeUsers-Group2' ]
 *
 *   If a user is in one of these groups then their cost will
 *   be set to 0.00. You can set this to be false if you do not
 *   want to offer any free printing.
 *
 *   Default: '__AUTO__'. Using a list of the printer's
 *   "Department:%name%" groups, will build a list of
 *   "CITES-PaperCut-FreeUsers-%name%" groups.
 *
 *
 * - notifyPrinted: display a message to the user when their
 *   job has been released for printing.
 *
 *   Default: false
 *
 *
 * - noClientAccount: what account to select for the client
 *   when they aren't running PCClient or one of the web
 *   clients. This lets people who have the account selection
 *   dialog enabled still print w/o a client.
 *
 *   Default: '[personal]'
 *
 *
 * - siteRestrictUsers: object to configure whether some users
 *   are restricted to printing only at specific sites. This
 *   value is an object of sub-options. You can override any
 *   single option or all of them. To disable the feature
 *   entirely, set this to false.
 *
 *
 * - siteRestrictUsers.restrictGroupName: initial group to check
 *   to see if a user should be restricted to specific sites.
 *   This group should almost certainly be a nested group containing
 *   all of your site specific groups.
 *
 *   Default: 'CITES-PaperCut-SiteUsers'
 *
 *
 * - siteRestrictUsers.printerNameRegexp: regular expression
 *   object to locate the site name from the printer name. This
 *   takes the site name as the first capture group. For example,
 *   suppose the printer in Undergrad room 250 is named
 *   "ug-250-color". The regular expression needs to choose
 *   "ug" as the site name.
 *
 *   This requires all of your printers to share a common naming
 *   convention. The default expects "%site%-%room%-[color,bw]".
 *
 *   Default: /^([a-z0-9]+)[_-]/i
 *
 *
 * - siteRestrictUsers.groupNameTemplate: template string to
 *   build the name of the restriction group based on the site.
 *   The site name found from the printer is always uppercased.
 *   For example, if "ug" is used for the Undergrad then the
 *   site restriction group is "CITES-PaperCut-SiteUsers-UG".
 *
 *   Default: 'CITES-PaperCut-SiteUsers-%site%'
 *
 *
 * - checkAccountPrinterGroup: only available in the after
 *   account selection hook. This controls if the selected account
 *   is checked for a printer group prefix in the name, and if
 *   so it will check that the printer is a memeber of the group.
 *   This is a way to use account naming conventions to limit them
 *   to only specific printer groups.
 *
 *   For example, suppose the "CITES-ICS Staff Credit" account
 *   should be limited to the "Department:ICS" printer group. You
 *   would have to name the account as such:
 *
 *     "[Department:ICS] CITES-ICS Staff Credit".
 *
 *   Default: true
 *
 *
 * - externalAccount.choiceEnabled: whether to allow a choice
 *   to bill to the external account or not. This will only be
 *   considered if the printer is in the "Account:External"
 *   group.
 *
 *   Default: true
 *
 *
 * - externalAccount.choiceAlways: always popup the choice dialog,
 *   even if the user has saved their previous response.
 *
 *   Default: false
 *
 *
 * - externalAccount.choiceDefault: whether the external account
 *   is the default choice or not. If true, then select the
 *   external account by default or when the PCClient is not
 *   running and the user has not made a choice already. This
 *   will only be considered if the printer is in the
 *   "Account:External" group.
 *
 *   Default: false
 *
 *
 * - externalAccount.enableUserGroups: list of user groups that the
 *   external account will be enabled for. This will only be
 *   considered if the printer is in the "Account:External" group.
 *
 *   Default: [ 'CITES-PaperCut-ExternalAccountUsers' ]
 *
 *
 * - personalAccounts.names: list of personal accounts that are allowed for
 *   this printer. These accounts will have the highest priority when jobs are
 *   charged to the personal account.
 *
 *   Default: []
 *
 *
 * - personalAccounts.addDefaults: add the default personal account for the
 *   system. The default personal accounts enable external (Illini Cash;
 *   Heartland) and Banner billing. If you specify "false" then these accounts
 *   will not be added and the user will only be able to print using credits or
 *   shared accounts.
 *
 *   Default: true
 */

function common_printJobHook( inputs, actions, options )
{
  common_debugLog( inputs, actions, "running common_printJobHook (" +
    "isAnalysisComplete = " + (inputs.job.isAnalysisComplete ? "yes" : "no") +
    "; isClientRunning = " + (common_isClientRunning( inputs ) ? "yes" : "no") +
  ")" );

  var _options = common_mergeOptions({
    discountGroups: false,
    freeGroups: '__AUTO__',
    externalAccount: {
      choiceEnabled: true,
      choiceAlways: false,
      choiceDefault: true,
      enableUserGroups: [ 'CITES-PaperCut-ExternalAccountUsers' ]
    },
    notifyPrinted: false,
    personalAccounts: {
      names: [],
      addDefaults: true
    },
    siteRestrictUsers: {
      groupNameTemplate: 'CITES-PaperCut-SiteUsers-%site%',
      printerNameRegexp: /^([a-z0-9]+)[_-]/i,
      restrictGroupName: 'CITES-PaperCut-SiteUsers'
    }
  }, options);

  var _personalAccounts = _options.personalAccounts.names || [];

  if (_options.externalAccount && _options.personalAccounts.addDefaults && common_externalAccount( inputs, actions, _options.externalAccount, _personalAccounts ))
    return true;
  if (_personalAccounts.length > 0)
    actions.job.changePersonalAccountChargePriority( _personalAccounts );

  if (_options.freeGroups)
    common_freeGroups( inputs, actions, _options.freeGroups );
  if (_options.discountGroups)
    common_discountGroups( inputs, actions, _options.discountGroups );

  if (_options.siteRestrictUsers && common_siteRestrictUsers( inputs, actions, _options.siteRestrictUsers ))
    return true;
  if (_options.notifyPrinted && common_notifyPrinted( inputs, actions ))
    return true;

  return false;
}

function common_printJobAfterAccountSelectionHook( inputs, actions, options )
{
  common_debugLog( inputs, actions, "running common_printJobAfterAccountSelectionHook (" +
    "isAnalysisComplete = " + (inputs.job.isAnalysisComplete ? "yes" : "no") +
    "; isClientRunning = " + (common_isClientRunning( inputs ) ? "yes" : "no") +
    "; sharedAccount = " + inputs.job.selectedSharedAccountName +
  ")" );

  var _options = common_mergeOptions({
    discountGroups: false,
    freeGroups: '__AUTO__',
    checkAccountPrinterGroup: true,
    noClientAccount: '[personal]',
    personalAccounts: {
      names: [],
      addDefaults: true
    }
  }, options);

  var _personalAccounts = _options.personalAccounts.names || [];
  if (_options.personalAccounts.addDefaults) {
      // Add just one, we don't need to check for "Default"
      _personalAccounts.push( 'External' );
  }

  if (_options.noClientAccount)
    common_noClientAccount( inputs, actions, _options.noClientAccount );

  if (common_hasBillingAccounts( inputs, actions, _personalAccounts ))
    return true;

  if (_options.freeGroups)
    common_freeGroups( inputs, actions, _options.freeGroups );
  if (_options.discountGroups)
    common_discountGroups( inputs, actions, _options.discountGroups );

  if (_options.checkAccountPrinterGroup && common_checkAccountPrinterGroup( inputs, actions ))
    return true;

  return false;
}

/*
 * ========== Feature Functions ==========
 */

/*
 * Looks at the selected shared account name and sees if it starts with
 * a "[Group Name]". If so, then check to see if the printer is in
 * that group. If so, allow the print job. Otherwise, prompt the user
 * to see if the job should be printed or not.
 *
 * If the client is not running and the groups don't match then the job
 * is canceled.
 *
 * Returns true if further processing should be stopped.
 */
function common_checkAccountPrinterGroup( inputs, actions )
{
  var acctPrintersRe = /^\[([^\\\]]+)\]/i;

  var acctName = inputs.job.selectedSharedAccountName;
  /* Don't do anything for personal accounts */
  if (!acctName)
  {
    common_debugLog( inputs, actions, "personal account selected" );
    return false;
  }

  var acctParts = acctPrintersRe.exec( acctName );
  /* Don't do anything is we aren't a restricted account */
  if (!acctParts)
  {
    common_debugLog( inputs, actions, "account not restricted (" + acctName + ")" );
    return false;
  }

  var printerGroup = acctParts[ 1 ];
  /* If this printer is in the specified group, exit */
  if (inputs.printer.isInGroup( printerGroup ))
  {
    common_debugLog( inputs, actions, "printer is in the account group (" + acctName + ")" );
    return false;
  }

  /* Restricted account selected, printer is not in the group.
   * Ask the client what they want to do about it. */
  if (common_isClientRunning( inputs ))
  {
    actions.client.promptOK(
        "<html>The shared account <strong>\"" + acctName + "\"</strong> " +
        "cannot be used with this printer. You must resubmit the job and either " +
        "charge to a different account or charge to your personal account.</html>"
        );
    // don't actually care about the response
    actions.job.cancelAndLog( "Shared account only for \"" + printerGroup + "\" printers" );
    return true;
  }
  else
  {
    actions.job.cancelAndLog( "Shared account only for \"" + printerGroup + "\" printers; client not running" );
    return true;
  }

  return false;
}

/*
 * Applies discount rates for specific groups. This will check if the user is a
 * member of any of the groups, and use the cheapest discount (or the original
 * cost if it is less).
 */
function common_discountGroups( inputs, actions, groupRates )
{
  if (!inputs.job.isAnalysisComplete)
    return;

  var jobCost = inputs.job.cost;

  for (var groupName in groupRates)
  {
    if (groupRates.hasOwnProperty( groupName ) && inputs.user.isInGroup( groupName ))
    {
      var groupRate = groupRates[ groupName ];

      // Sanity check for groupRate.bw and groupRate.color
      if (typeof groupRate.bw != 'number')
      {
        common_debugLog( inputs, actions, groupName + " - groupRate.bw is not a number" );
        continue;
      }
      if (typeof groupRate.color != 'number')
      {
        common_debugLog( inputs, actions, groupName + " - groupRate.color is not a number" );
        continue;
      }

      var discountCost = (inputs.job.totalGrayscalePages * groupRate.bw) +
        (inputs.job.totalColorPages * groupRate.color);

      // PaperCut only allows non-negative job costs
      if ((discountCost >= 0) && (discountCost < jobCost))
        jobCost = discountCost;
    }
  }

  if (jobCost != inputs.job.cost)
  {
    common_debugLog( inputs, actions, "found discount rate: " + jobCost );
    actions.job.setCost( jobCost );
  }
}

/*
 * Checks to see if the external account processing should be enabled, and optionally
 * offers some choices to the user on whether they want to use it or not.
 *
 * This code bails early if the printer is not in the "Account:External" group or if
 * the user is not in one of the proper user groups.
 */
function common_externalAccount( inputs, actions, options, personalAccounts )
{
  common_debugLog( inputs, actions, "adding default accounts" );

  personalAccounts = personalAccounts || [];
  personalAccounts.push( 'External' );
  personalAccounts.push( 'Default' );

  if (!inputs.printer.isInGroup( 'Account:External' ))
  {
    common_debugLog( inputs, actions, "printer not in the Account:External group" );
    return false;
  }

  for (var userGroupIdx = 0; userGroupIdx < options.enableUserGroups.length; userGroupIdx++)
  {
    var userGroup = options.enableUserGroups[ userGroupIdx ];
    if (!inputs.user.isInGroup( userGroup ))
    {
      common_debugLog( inputs, actions, "user is not in a required external account group: " + userGroup );
      return false;
    }
  }

  var defaultDisabled = null;

  if (options.choiceEnabled)
    defaultDisabled = common_externalAccount_processChoice( inputs, actions, options );

  if ((defaultDisabled && defaultDisabled.value) || (!defaultDisabled && options.choiceDefault))
  {
    common_debugLog( inputs, actions, "default account is disabled; removing" );
    personalAccounts.pop();
  }

  return false;
}

function common_externalAccount_processChoice( inputs, actions, options )
{
  var defaultDisabled = null;
  var now = Date.now();

  // Try to parse the stored property and set to null if it is badly formatted
  // or expired
  try
  {
    var tmpArr = inputs.user.getProperty( 'techsvc-default-disabled' ).split( '|' );

    defaultDisabled = {
      value: tmpArr[ 0 ] && tmpArr[ 0 ] != 'false',
      expires: parseFloat( tmpArr[ 1 ] )
    };

    if (!defaultDisabled.expires || now >= defaultDisabled.expires)
      defaultDisabled = null;
  }
  catch (ex)
  {
    defaultDisabled = null;
  }

  if (((defaultDisabled === null) || options.choiceAlways) && common_isClientRunning( inputs ))
  {
    var bannerChecked = options.choiceDefault ? '' : 'checked';
    var externalChecked = options.choiceDefault ? 'checked' : '';

    var response = actions.client.promptForForm(
      "<html>\
      <p>You have an option for how you would like your print jobs to be billed. Please \
      choose one of the following:</p> \
      \
      <table> \
        <tr> \
          <td><input name='personalAccount' value='external' type='radio' id='personalAccount-external' " + externalChecked + "></td> \
          <td><strong><label for='personalAccount-external'>Bill Me Now (iCard Illini Cash)</label></strong></td> \
        </tr> \
        <tr> \
          <td></td> \
            <td>Your print jobs will be billed immediately using your iCard Illini Cash. \
              If you do not have sufficient funds in your iCard Illini Cash \
              then you will need to add funds before you can release your print job.</td> \
        </tr> \
        \
        <tr> \
          <td><input name='personalAccount' value='banner' type='radio' id='personalAccount-banner' " + bannerChecked + "></td> \
          <td><strong><label for='personalAccount-banner'>Bill Me Later (Banner)</label></strong></td> \
        </tr> \
        <tr> \
          <td></td> \
          <td>Your print jobs will appear in your student bill at the end of \
            the month. If you print less than $5 during a semester then you \
            will not be billed until after the semester has ended.</td> \
        </tr> \
        \
        <tr> \
          <td></td> \
          <td><strong><label for='rememberSeconds'>Remember This Choice:</label></strong><br> \
            <select name='rememberSeconds' id='rememberSeconds'> \
              <option value='0'>Ask Me Each Time</option> \
              <option value='2592000'>1 Month</option> \
              <option value='10368000'>4 Months</option> \
            </select></td> \
        </tr> \
      </table> \
      </html>",
      {
        hideJobDetails: true,
        dialogTitle: "Print Job Billing"
      }
    );

    if (response != "TIMEOUT" && response != "CANCEL" && response.personalAccount)
    {
      defaultDisabled = {
        value: response.personalAccount != 'banner',
        expires: response.rememberSeconds * 1000 + now
      };

      if (response.rememberSeconds || options.choiceAlways)
      {
        var tmpStr = [
          defaultDisabled.value ? "true" : "false",
          defaultDisabled.expires
        ].join( '|' );

        actions.user.onCompletionSaveProperty( "techsvc-default-disabled", tmpStr, { saveWhenCancelled: true } );
      }
    }
  }

  return defaultDisabled;
}

/*
 * Checks to see if any users should get free printing. Either a list of user group
 * names is provided, or if '__AUTO__' then a list is built from the printer's
 * "Department:%name%" groups. The cost is set to 0.00 if the user is in one of
 * these groups.
 */
function common_freeGroups( inputs, actions, freeGroups )
{
  if (!inputs.job.isAnalysisComplete)
    return;

  // Exit if there is a shared account selected; that means the free user wanted
  // to bill something specifically
  if (inputs.job.selectedSharedAccountName)
  {
    // Recalculate the cost if it was zero previously b/c no shared account
    // selection had happened yet.
    if (inputs.job.cost === 0.0) {
      common_debugLog( inputs, actions, "recalculating job cost since shared account is selected" );
      actions.job.setCost(
        inputs.job.calculateCostForPrinter( inputs.printer.printerName )
      );
    }
  }
  else if (inputs.job.cost > 0.0)
  {
    // If we are using __AUTO__ then build the list of group names from the printer's groups
    if (freeGroups == '__AUTO__')
    {
      freeGroups = [];
      for (var printerGroupIdx = 0; printerGroupIdx < inputs.printer.groups.length; printerGroupIdx++)
      {
        var printerGroup = inputs.printer.groups[ printerGroupIdx ];

        if (printerGroup.substr( 0, 11 ).toUpperCase() != 'DEPARTMENT:')
          continue;

        var printerDepartment = printerGroup.substr( 11 ).toUpperCase();
        if (!printerDepartment)
          continue;

        var freeGroupName = 'CITES-PaperCut-FreeUsers-' + printerDepartment;

        common_debugLog( inputs, actions, "adding free users group: " + freeGroupName );
        freeGroups.push( freeGroupName );
      }
    }

    // Check the user's memberships
    var freeUser = false;
    for (var freeGroupIdx = 0; !freeUser && (freeGroupIdx < freeGroups.length); freeGroupIdx++)
    {
      var freeGroup = freeGroups[ freeGroupIdx ];

      if (inputs.user.isInGroup( freeGroup ))
        freeUser = true;
    }

    // Set cost to 0.00 if the user is a free user
    if (freeUser)
    {
      common_debugLog( inputs, actions, "user in a free group; setting cost to 0.0" );
      actions.job.setCost( 0 );
    }
  }
}

/*
 * Checks to see if the client is running, and if it is not then select an account
 * for the user. This is useful for cases when the user must select an account but
 * their doing it from a machine without the PCClient or from a method that does not
 * support client selection (ie: Google Cloud Print).
 */
function common_noClientAccount( inputs, actions, accountName )
{
  if (!inputs.job.selectedSharedAccountName && !common_isClientRunning( inputs ))
  {
    if (accountName === '' || accountName == '[personal]')
    {
      common_debugLog( inputs, actions, "no client running; setting personal account" );
      actions.job.chargeToPersonalAccount();
    }
    else
    {
      common_debugLog( inputs, actions, "no client running; setting shared account " + accountName );
      actions.job.chargeToSharedAccount( accountName );
    }
  }
}

/*
 * Notify the user that their job has been/will be printed.
 *
 * Returns true if further processing should be stopped.
 */
function common_notifyPrinted( inputs, actions )
{
  if (!common_isClientRunning( inputs ))
    return false;

  if (!inputs.job.isAnalysisComplete)
    return false;

  actions.client.sendMessage(
      "The following job is queued for printing on " + inputs.job.printerName + ": " +
      inputs.job.documentName + " (cost: " + inputs.utils.formatCost( inputs.job.cost ) + ")."
  );

  return false;
}

/*
 * Check that a user has an account to bill to. If there are no personal accounts
 * available, and a shared account is not selected, then cancel the job and
 * send an error message to the user.
 *
 * Returns true if futher processing should be stopped.
 */
function common_hasBillingAccounts( inputs, actions, personalAccounts )
{
  if (!inputs.job.isAnalysisComplete)
    return false;

  common_debugLog( inputs, actions, "personal accounts: " + personalAccounts.join( "; " ) );

  /* Only run if...
     1. The job has a cost
     2. The user has no personal accounts available (credit or default)
     3. There is no selected shared account */
  if ((inputs.job.cost > 0.0) && (personalAccounts.length <= 0) && !inputs.job.selectedSharedAccountName)
  {
    actions.job.cancelAndLog( "No personal accounts available and no shared account selected. Default billing accounts are not allowed for this user and printer." );
    if (common_isClientRunning( inputs ))
      actions.client.sendMessage(
        "PRINTING DENIED\n\n" +
        "You do not have any personal accounts for this printer. Please select a shared account or talk to your local IT staff if you have questions."
      );

    return true;
  }

  return false;
}

/*
 * Check to see if the user is in the CITES-PaperCut-SiteUsers
 * group. If so, then get the site name from the printer name
 * and check that they are also in the site specific group.
 * Reject their job if they are not.
 *
 * Returns true if further processing should be stopped.
 *
 * Options supported:
 *  - restrictGroupName: initial group name to check if the user
 *    should be restricted at all.
 *  - printerNameRegexp: regular expression to match against the
 *    printer name. The first capture group will be used as the
 *    site name.
 *  - groupNameTemplate: template for building the site restricted
 *    group. Replaces '%site%' with the upercase site name from the
 *    printer name.
 */
function common_siteRestrictUsers( inputs, actions, options )
{
  if (!inputs.user.isInGroup( options.restrictGroupName ))
  {
    common_debugLog( inputs, actions, "user is not in the restricted group: " + options.restrictGroupName );
    return false;
  }

  // Try to take the site name from the first part of the
  // printer name
  var printerNameParts = inputs.printer.printerName.match( options.printerNameRegexp );
  // Check that we got a site name from this printer name
  if (!printerNameParts || !printerNameParts[ 1 ])
  {
    common_debugLog( inputs, actions, "unable to get the site name from the printer name: " + options.printerNameRegexp );
    return false;
  }

  var siteGroupName = options.groupNameTemplate.replace( '%site%', printerNameParts[ 1 ].toUpperCase() );
  if (inputs.user.isInGroup( siteGroupName ))
  {
    common_debugLog( inputs, actions, "user is in the site group: " + siteGroupName );
    return false;
  }

  // User is a site restricted user but is not in this
  // site group. Cancel the job and send an error
  // message. From this point on the function should
  // return true.
  actions.job.cancelAndLog( 'Site restricted user is not in group ' + siteGroupName );
  if (common_isClientRunning( inputs ))
    actions.client.sendMessage(
        "PRINTING DENIED\n\n" +
        'You do not have permission to print on "' + inputs.printer.printerName + '".'
    );

  return true;
}
