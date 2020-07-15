// This needs to be changed to the Write Key for the Outreach Marketing website Source
// Outreach's Production Marketing site's Write Key is tozXNEm73pVqQw1d5Fho7T6JmO2s0wqr
// OUtreach's Staging Marketing site's Write Key is KiEzQHVjmk3OzB7ELs7NgzU6OvLyG4cH
const SEGMENT_WRITE_KEY = 'f0mkFrd38lR8LW97t73odW9VkiQP532m';

// For list of Segment Destination categories see https://github.com/segmentio/consent-manager/blob/81ceaf02563d96b36aaff990cfaebd3f848678b0/src/consent-manager/categories.js#L1
const ONE_TRUST_SEGMENT_MAPPING = {
    /* Strictly Necessary Cookies */
    1: [], // These do not map to any categories in segment.
    /* Performance Cookies */
    2: [    'A/B Testing',
            'Analytics',
            'Attribution',
            'Email',
            'Enrichment',
            'Heatmaps & Recordings',
            'Raw Data',
            'Realtime Dashboards',
            'Referrals',
            'Surveys',
            'Video'
    ],
    /* Functional Cookies*/
    3: [
            'CRM',
            'Customer Success',
            'Deep Linking',
            'Helpdesk',
            'Livechat',
            'Performance Monitoring',
            'Personalization',
            'SMS & Push Notifications',
            'Security & Fraud'
    ],
    /* Targeting Cookies */
    4: [
            'Advertising', 
            'Tag Managers'
    ]
};

let previousOneTrustGroupIds = [];

// Returns a list of Segment Destinations / Integrations that the user has consented to (by consenting to OneTrust categories)
function getConsentedIntegrations(enabledIntegrations, oneTrustGroupIds) {
    
    // Get consented segment categories.
    const segmentCategories = oneTrustGroupIds
        .map(oneTrustGroupId => ONE_TRUST_SEGMENT_MAPPING[oneTrustGroupId])
        .filter(value => value.length > 0)
        .flat(); // Filter out `empty` mappings.

    console.log(`segmentCategories consented to: ${segmentCategories}`)

    // Filter enabled integrations by consented segment categories.
    const consentedIntegrations = enabledIntegrations.filter(
        enabledIntegration => {
            const isConsented = segmentCategories.includes(
                enabledIntegration.category
            );
            return isConsented;
        }
    );

    console.log (`getConsentedIntegrations returned: ${consentedIntegrations.map(i => i.id)}`);

    return consentedIntegrations;
}

// oneTrustIntegration.initialize() should be called when the page has finished loading
const oneTrustIntegration = {
    initialize() {


        // Attach a handler for the OneTrust OptanonWrapper function. OptanonWrapper is a function that OneTrust Consent Manager calls when the page has loaded 
        // Here's a description of that this function is for (taken from OneTrust website)
        // 
        // It functions as a holder for the helper methods which are used to block or control any script or html tags which cause cookies to be set. 
        // The wrapper is executed on each page load, or whenever the user saves changes to the privacy settings in the Preference Center.
        window.OptanonWrapper = function () {
            
            updateAJS();    

            if (window.Optanon && window.Optanon.OnConsentChanged) {
                
                // Attach a handler for the OneTrust OnConsentChanged function. OnConsentChanged is a function that OneTru
                window.Optanon.OnConsentChanged(async function () {
                
                    updateAJS(); 
                
                });
            }
        };
    },
};

// Updates Segment Analytics library on the website
async function updateAJS(){
             
    const writeKey = segmentUtil.getWriteKey();

    // Get group ids from optanon.
    const oneTrustGroupIds = oneTrustUtil.getConsentGroupIds();

    // See if there are any changes to one trust group ids.
    if ( arraysEqual(oneTrustGroupIds, previousOneTrustGroupIds) ) {
        return;
    }
    
    previousOneTrustGroupIds = oneTrustGroupIds;

    // Get integrations enabled for this write key.
    const enabledIntegrations = await segmentUtil.fetchDestinationForWriteKey(
        writeKey
    );

    // Retrieve segment specific consented integrations.
    const consentedIntegrations = await getConsentedIntegrations(
        enabledIntegrations,
        oneTrustGroupIds
    );

    const destinationPreferences = {};
    consentedIntegrations.forEach(consentedIntegration => {
        destinationPreferences[consentedIntegration.id] = true;
    });

    console.log(
        'loading consented analytics.js integrations:',
        consentedIntegrations.map(ci => ci.name)
    );

    // Enable consented integrations.
    segmentUtil.conditionallyLoadAnalytics({
        writeKey,
        destinations: enabledIntegrations,
        destinationPreferences,
        isConsentRequired: true,
        shouldReload: true,
    });

}

// Returns an array of OneTrust group ids that are currently consented for (explicitly or implicitly)
const oneTrustUtil = {
    getConsentGroupIds() {
        const groupIds = (window.OnetrustActiveGroups
            ? window.OnetrustActiveGroups.split(',')
            : []
        ).filter(a => a);

        return groupIds;
    },
}

// function to check if 2 arrays contain exactly the same contents
const arraysEqual = (_arr1, _arr2)=> {
    if (!Array.isArray(_arr1) || ! Array.isArray(_arr2) || _arr1.length !== _arr2.length)
    return false;

  var arr1 = _arr1.concat().sort();
  var arr2 = _arr2.concat().sort();

  for (var i = 0; i < arr1.length; i++) {

      if (arr1[i] !== arr2[i])
          return false;

  }

  return true;
}

// Utility functions. 
// conditionallyLoadAnalytics() - conditionally loads the Segment library with only the categories of consented Destinations enabled
// fetchDestinationForWriteKey() - Fetches a list of Destinations that have been enabled in the Segment UI for a specific Segment Source (based on the Write Key as an input)
const segmentUtil = {
    
    // Lifted from @segmentio/consent-manager
    // Conditionally loads the Segment library with only the categories of Destinations that the user has provided consent to
    conditionallyLoadAnalytics({
        writeKey,
        destinations,
        destinationPreferences,
        isConsentRequired,
        shouldReload = true,
    }) {
        
        const integrations = { All: false, 'Segment.io': true };
        let isAnythingEnabled = false;

        if (!destinationPreferences) {
            if (isConsentRequired) {
                console.log(`conditionallyLoadAnalytics(): Not loading AJS as consent required and no preferences provided`);
                return;
            }

            // Load a.js normally when consent isn't required and there's no preferences
            if (!analytics.initialized) {
                console.log(`conditionallyLoadAnalytics(): loading AJS normally as consent not required and no preferences given`);
                analytics.load(writeKey);
            }
            return;
        }

        for (const destination of destinations) {
            const isEnabled = Boolean(destinationPreferences[destination.id]);
            if (isEnabled) {
                isAnythingEnabled = true;
            }
            integrations[destination.id] = isEnabled;
        }

        // Reload the page if the trackers have already been initialised so that
        // the user's new preferences can take affect
        if (analytics.initialized) {
            if (shouldReload) {
                window.location.reload();
            }
            return;
        }

        // Don't load a.js at all if nothing has been enabled
        if (isAnythingEnabled) {
            console.log(`conditionallyLoadAnalytics(): loading AJS with integrations enabled: ${JSON.stringify(integrations)}`);
            analytics.load(writeKey, { integrations });
        }
    },

    // Fetches a list of Destinations that have been enabled in the Segment UI for a specific Segment Source (based on the Write Key as an input)
    async fetchDestinationForWriteKey(writeKey) {
        if (!writeKey) {
            return [];
        }
        // Get list of currently enabled Segment Destinations, based on the Write Key
        const res = await window.fetch(
            `https://cdn.segment.com/v1/projects/${writeKey}/integrations`
        );

        if (!res.ok) {
            throw new Error(
                `Failed to fetch integrations for write key ${writeKey}: HTTP ${res.status} ${res.statusText}`
            );
        }

        const destinations = await res.json();

        // Rename creationName to id to abstract the weird data model
        for (const destination of destinations) {
            destination.id = destination.creationName;
            delete destination.creationName;
        }
        return destinations;
    },

    getWriteKey() {
        return SEGMENT_WRITE_KEY;
    }
};

// Fires when the doc is ready. This could be replaced with another function from a library if needed
(function(funcName, baseObj) {
    // The public function name defaults to window.docReady
    // but you can pass in your own object and own function name and those will be used
    // if you want to put them in a different namespace
    funcName = funcName || "docReady";
    baseObj = baseObj || window;
    var readyList = [];
    var readyFired = false;
    var readyEventHandlersInstalled = false;

    // call this when the document is ready
    // this function protects itself against being called more than once
    function ready() {
        if (!readyFired) {
            // this must be set to true before we start calling callbacks
            readyFired = true;
            for (var i = 0; i < readyList.length; i++) {
                // if a callback here happens to add new ready handlers,
                // the docReady() function will see that it already fired
                // and will schedule the callback to run right after
                // this event loop finishes so all handlers will still execute
                // in order and no new ones will be added to the readyList
                // while we are processing the list
                readyList[i].fn.call(window, readyList[i].ctx);
            }
            // allow any closures held by these functions to free
            readyList = [];
        }
    }

    function readyStateChange() {
        if ( document.readyState === "complete" ) {
            ready();
        }
    }

    // This is the one public interface
    // docReady(fn, context);
    // the context argument is optional - if present, it will be passed
    // as an argument to the callback
    baseObj[funcName] = function(callback, context) {
        if (typeof callback !== "function") {
            throw new TypeError("callback for docReady(fn) must be a function");
        }
        // if ready has already fired, then just schedule the callback
        // to fire asynchronously, but right away
        if (readyFired) {
            setTimeout(function() {callback(context);}, 1);
            return;
        } else {
            // add the function and context to the list
            readyList.push({fn: callback, ctx: context});
        }
        // if document already ready to go, schedule the ready function to run
        if (document.readyState === "complete") {
            setTimeout(ready, 1);
        } else if (!readyEventHandlersInstalled) {
            // otherwise if we don't have event handlers installed, install them
            if (document.addEventListener) {
                // first choice is DOMContentLoaded event
                document.addEventListener("DOMContentLoaded", ready, false);
                // backup is window load event
                window.addEventListener("load", ready, false);
            } else {
                // must be IE
                document.attachEvent("onreadystatechange", readyStateChange);
                window.attachEvent("onload", ready);
            }
            readyEventHandlersInstalled = true;
        }
    }
})("docReady", window);

docReady(oneTrustIntegration.initialize);
