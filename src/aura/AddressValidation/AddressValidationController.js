/*
    Author:         Derrick Vuong
    Company:        Salesforce
    Description:    src/aura/AddressValidation/AddressValidationController.js
    Date/Time:      5/14/2019, 6:03:38 PM

    History:
    When        Who         What
    14/05/19    DV          - Allow set default location using lat + lng
                            - Allow return 'back' to search using place id

    20/05/19    DV          - Added UUID for session token to reduce billing costs

    21/05/19    DV          - Checks if sublocality_level_1 or locality is available as sets it into v.locality as City
                            - County field added as additional optional field

    23/05/19    DV          - Bug fix on handling v.searchTimeout when deleting the input after typing
                            - Reduced padding around layoutItems to better fit the area and adjusted box size of suggestions
                            - Relabeled markers
                            - Enable component to reuse existing data instead of querying the API again using Place ID
    
    26/07/19    DV          - Updated field labels to use 'Custom Labels'
                            - Updated Component Title to use a dynamic 'Custom Label Name'
                            - Added handling for when the City only shows in the neighborhood field

    17/10/19    DV          - Added 'Required' attribute and validation
                            - Cleaned up init methods into helper classes

    18/10/19    DV          - Split 'Required' into 'Search Required' and 'Detailed Address Fields Required'

    15/03/22    KK          - Added dynamically making address details/county fields required (=red asteriks sshows) if option is set in Flow
          
   TODO:
    1. Input for country restrictions(?)
    2. Input for custom fields to retrieve(?)
 */
({
    doInit : function(cmp, event, helper) {
        helper.setTitle(cmp);
        helper.checkValidFilter(cmp);
        helper.setValidation(cmp);
        helper.initialiseMapData(cmp, helper);

        
        // set address fields as required if configured as such in Flow
        let fieldsRequired = cmp.get("v.fieldsRequired"); // Flow attribute "Detailed Address Fields Required"

        if(fieldsRequired) {
            
            // if the address fields are shown while all fields are required, they're mandatory as well
            if(cmp.get("v.showAddressFields")) {
                let divFullAddress = cmp.find('fullAddress');
                divFullAddress.set('v.required', true);
            }

            // if county field is shown while all fields are required, it's mandatory as well
            if(cmp.get("v.showCountyField")) {
                let divCounty = cmp.find('countyInput');
                divCounty.set('v.required', true);
            }
        }
    },
    /* When typing the search text in input field */
    onAddressInput : function(cmp, event, helper) {
        let locationInput = cmp.get("v.location");
        
        /* Check if the location input isn't empty */
        if(locationInput != null && locationInput != "") {
            let UUID = cmp.get("v.UUID");

            /* Set searching status to true for lightning:input */
            cmp.set("v.searching", true);

            /* Generate UUID session token for current search session if it doesn't exist yet */
            if(UUID == null || UUID == "") {
                cmp.set("v.UUID", helper.generateUUID());
            }

            helper.startSearch(cmp);
        }
        else { // When text input is empty, clear all address fields
            var searchTimeout = cmp.get('v.searchTimeout');
            if(searchTimeout) { // Stop search if the input was deleted
                clearTimeout(searchTimeout);
                cmp.set("v.searching", false);
            }

            cmp.set('v.predictions', []);
            helper.clearAddressFields(cmp);
        }
    },
    /* When selecting a prediction available in the address suggestion list */
    onAddressSelect : function(cmp, event, helper) { 
        cmp.set("v.locationSelected", false);

        let selected = event.currentTarget;
        let placeid = selected.getAttribute("data-placeid");
        let UUID = cmp.get("v.UUID");

        /* Clear UUID session token after suggestion is selected */
        if(UUID != null && UUID != "") {
            cmp.set("v.UUID", "");
        }
        
        helper.getPlaceDetails(cmp, placeid);
    },
})