How To: How to install, use and test the OneTrust <> Segment interoperability capability   
Written By: Joe Ayoub   
Last Updated: 06/25/20   

## Contents
- Artefacts
- Summary
- Installation steps
- Testing
- Settings

### Artefacts: 
- js/index.js
- onetrust_1.html
- onetrust_2.html 
- img/bg.png


#### js/index.js: 
This file contains the main logic that checks the end user's OneTrust consent prefernces, then conditionally loads the Segment analytics.js library based on those preferences. 

#### onetrust_1.html and onetrust_2.html: 
These 2 HTML files host a working version of the OneTrust Consent Manager alongside the index.js code. 

### How it works: 
1. We remove the Segment analytics.load() function from the Segment analytics.js snippet. This prevents the Segment analytics library from loading on the page. 
2. When the user provides their consent preferences via the OneTrust Consent Manager, the code fetches the list of OneTrust categories that have been consented to. 
3. The code then downloads a list of all Segment Destinations and categories for those Destinations that are enabled for this particular website.
4. The code then figures out which Segment Destinations are consented to by matching the categories for each of the Segment Destinations to the OneTrust categories that the user has provided consent for.
5. The code then triggers the Segment analytics.load() event is to load the Segment analytics library to the page. Note: it includes a parameter specifying the list of Destinations that are to be enabled or disabled.  

### Code notes: 

- The following URL is requested to retrieve the list of enabled Destinations for the current website (note, link uses Production OneTrust Write Key): [https://cdn.segment.com/v1/projects/${writeKey}/integrations](https://cdn.segment.com/v1/projects/<writekey>/integrations)

#### OneTrust functions used: 

| Function                             | Purpose                                                                                                             |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| window.OnetrustActiveGroups          | This is a OneTrust function. It returns the list of OneTrust categories that the user has consented to.              |
| window.OptanonWrapper                | This is a OneTrust function. It's triggered when the page has finished loading and OneTrust Consent Manager is ready |
| window.Optanon.OnConsentChanged      | This is a OneTrust function. It's triggered after the user has updated their consent preferences.                    |

### Maintenance: 
No maintenance should be necessary other than the following: 
1. if the Segment Source for the Marketing website changes, the Write Key will need to be updated. See SEGMENT_WRITE_KEY setting below. 
2. if the configuration of the OneTrust Consent manager gets changed (for example if a 5th category were to be added), then that change would need to be reflected in the ONE_TRUST_SEGMENT_MAPPING setting

### Settings: 
There are 2 important settings that should be considered. 
- SEGMENT_WRITE_KEY: replace this with the Write Key for your Segment Source. The value to update is in the index.js file and is called 'const SEGMENT_WRITE_KEY'. 
- ONE_TRUST_SEGMENT_MAPPING: This object contains mappings of OneTrust consent categories to Segment Destination categories. The object can be found in the index.js file as 'const ONE_TRUST_SEGMENT_MAPPING'. 
-- There are 4 OneTrust categories named 1, 2, 3, 4. 1 doesn't map to any Segment Destinations, and will always be enabled. 2 ,3 and 4 map to Segment Destination categories. 


