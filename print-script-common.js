/*
 * Copyright (c) 2014 University of Illinois Board of Trustees
 * All rights reserved.
 * 
 * Developed by:   CITES-ICS
 *                 University of Illinois at Urbana Champaign
 *                 http://www.cites.illinois.edu/ics
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

/*
 * ========== Utility Functions ==========
 */

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
 */

function common_printJobHook( inputs, actions, options )
{
  var _options = common_mergeOptions({
    discountGroups: false,
    notifyPrinted: false,
    noClientAccount: '[personal]',
    siteRestrictUsers: {
      groupNameTemplate: 'CITES-PaperCut-SiteUsers-%site%',
      printerNameRegexp: /^([a-z0-9]+)[_-]/i,
      restrictGroupName: 'CITES-PaperCut-SiteUsers'
    }
  }, options);

  if (_options.noClientAccount)
    common_noClientAccount( inputs, actions, _options.noClientAccount );
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
  var _options = common_mergeOptions({
    discountGroups: false,
    checkAccountPrinterGroup: true,
    notifyPrinted: false,
    noClientAccount: '[personal]',
    siteRestrictUsers: {
      groupNameTemplate: 'CITES-PaperCut-SiteUsers-%site%',
      printerNameRegexp: /^([a-z0-9]+)[_-]/i,
      restrictGroupName: 'CITES-PaperCut-SiteUsers'
    }
  }, options);

  if (_options.noClientAccount)
    common_noClientAccount( inputs, actions, _options.noClientAccount );
  if (_options.discountGroups)
    common_discountGroups( inputs, actions, _options.discountGroups );

  if (_options.siteRestrictUsers && common_siteRestrictUsers( inputs, actions, _options.siteRestrictUsers ))
    return true;
  if (_options.checkAccountPrinterGroup && common_checkAccountPrinterGroup( inputs, actions ))
    return true;
  if (_options.notifyPrinted && common_notifyPrinted( inputs, actions ))
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
    actions.log.debug(
        inputs.job.fullPrinterName + " " +
        inputs.job.username + "@" + inputs.job.clientIP + " - " +
        "personal account selected"
        );
    return false;
  }

  var acctParts = acctPrintersRe.exec( acctName );
  /* Don't do anything is we aren't a restricted account */
  if (!acctParts)
  {
    actions.log.debug(
        inputs.job.fullPrinterName + " " +
        inputs.job.username + "@" + inputs.job.clientIP + " - " +
        "account not restricted (" + acctName + ")"
        );
    return false;
  }

  var printerGroup = acctParts[ 1 ];
  /* If this printer is in the specified group, exit */
  if (inputs.printer.isInGroup( printerGroup ))
  {
    actions.log.debug(
        inputs.job.fullPrinterName + " " +
        inputs.job.username + "@" + inputs.job.clientIP + " - " +
        "printer is in the account group (" + acctName + ")"
        );
    return false;
  }

  /* Restricted account selected, printer is not in the group.
   * Ask the client what they want to do about it. */
  if (inputs.client.isRunning)
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
        actions.log.debug(
            inputs.printer.fullPrinterName + " " +
            groupName + " - groupRate.bw is not a number"
        );
        continue;
      }
      if (typeof groupRate.color != 'number')
      {
        actions.log.debug(
            inputs.printer.fullPrinterName + " " +
            groupName + " - groupRate.color is not a number"
        );
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
    actions.job.setCost( jobCost );
}

/*
 * Checks to see if the client is running, and if it is not then select an account
 * for the user. This is useful for cases when the user must select an account but
 * their doing it from a machine without the PCClient or from a method that does not
 * support client selection (ie: Google Cloud Print).
 */
function common_noClientAccount( inputs, actions, accountName )
{
  if (!(('selectedSharedAccount' in inputs.job) && inputs.job.selectedSharedAccount) && !inputs.client.isRunning)
  {
    if (accountName === '' || accountName == '[personal]')
      actions.job.chargeToPersonalAccount();
    else
      actions.job.chargeToSharedAccount( accountName );
  }
}

/*
 * Notify the user that their job has been/will be printed.
 *
 * Returns true if further processing should be stopped.
 */
function common_notifyPrinted( inputs, actions )
{
  if (!inputs.client.isRunning)
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
    return false;

  // Try to take the site name from the first part of the
  // printer name
  var printerNameParts = inputs.printer.printerName.match( options.printerNameRegexp );
  // Check that we got a site name from this printer name
  if (!printerNameParts || !printerNameParts[ 1 ])
    return false;

  var siteGroupName = options.groupNameTemplate.replace( '%site%', printerNameParts[ 1 ].toUpperCase() );
  if (inputs.user.isInGroup( siteGroupName ))
    // User is fine, exit
    return false;

  // User is a site restricted user but is not in this
  // site group. Cancel the job and send an error
  // message. From this point on the function should
  // return true.
  actions.job.cancelAndLog( 'Site restricted user is not in group ' + siteGroupName );
  if (inputs.client.isRunning)
    actions.client.sendMessage(
        "PRINTING DENIED\n\n" +
        'You do not have permission to print on "' + inputs.printer.printerName + '".'
    );

  return true;
}
