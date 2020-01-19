/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
 
 /*
   Author:         Derrick Vuong
   Company:        Salesforce
   Description:    src/aura/AddressValidation/AddressValidationHelper.js
   Date/Time:      5/21/2019, 1:35:56 PM

   History:
   When        Who          What
                            
   TODO:
   
 */
({
    callServer: function(component, method, callback, params) {
        let action = component.get(method);
        if (params) {
            action.setParams(params);
        }
        
        action.setCallback(this,function(response) {
            let state = response.getState();
            if (state === "SUCCESS") {
                // pass returned value to callback function
                callback.call(this, response.getReturnValue());
            } else if (state === "ERROR") {
                // generic error handler
                let errors = response.getError();
                if (errors) {
                    console.log("Errors", errors);
                    if (errors[0] && errors[0].message) {
                        throw new Error("Error" + errors[0].message);
                    }
                } else {
                    throw new Error("Unknown Error");
                }
            }
        });
        
        $A.enqueueAction(action);
    },
    setTitle : function(cmp) {
        /* Set the Dynamic Component Labels */
        let titleLabel = '$Label.' + cmp.get("v.titleLabel");
        cmp.set("v.title", $A.getReference(titleLabel));
    },
    setValidation : function(cmp) {
        cmp.set('v.validate', function() {
            let locationSelected = cmp.get("v.locationSelected");
            
            let isRequired = cmp.get("v.isRequired");
            let fieldsRequired = cmp.get("v.fieldsRequired");

            let showAddressFields = cmp.get("v.showAddressFields");
            let showCountyField = cmp.get("v.showCountyField");

            let locationValue = cmp.get("v.location").trim();
            let addressFieldEmpty = false;
            let addressFields = [];
            addressFields.push(cmp.get("v.fullStreetAddress"));
            addressFields.push(cmp.get("v.locality"));
            addressFields.push(cmp.get("v.country"));
            addressFields.push(cmp.get("v.administrative_area_level_1"));
            addressFields.push(cmp.get("v.postal_code"));
            showCountyField ? addressFields.push(cmp.get("v.administrative_area_level_2")) : "";

            addressFields.forEach(function(value) {
                value == null || value == "" ? addressFieldEmpty = true : "";
            })

            if(fieldsRequired && isRequired) {
                console.log("Fields Required and Search Required");
                console.log("Address Fields: ", addressFields);

                if(locationValue.length > 0 && !addressFieldEmpty) {
                    return { isValid: true };
                }
                else {
                    console.log("Location Value: " + locationValue);
                    console.log("Location Length: " + locationValue.length);
                    console.log("Location Length > 0: ", locationValue.length > 0);
                    console.log("Address Fields Empty: ", addressFieldEmpty);
                    return { isValid: false, errorMessage: 'All address fields is required. Please search and select a valid location and have all fields filled to proceed.' };
                }
            }
            else if(!fieldsRequired && isRequired) {
                if(locationValue.length > 0)
                    return { isValid: true };
                else
                    return { isValid: false, errorMessage: 'The address field is required. Please search and select a valid location to proceed.' };
            }
            else if(showAddressFields && fieldsRequired) {
                if(!addressFieldEmpty) 
                    return { isValid: true };
                else
                    return { isValid: false, errorMessage: 'All Address fields are required. Please fill in all fields available to proceed.' };
            }
        })
    },
    initialiseMapData : function(cmp, helper) {
        let lat = cmp.get("v.latitude"), lng = cmp.get("v.longitude");

        if(lat != null && lng != null) {
            let formattedAddress = cmp.get("v.formattedAddress");
            if(formattedAddress) {
                this.showMap(cmp, lat, lng, 'Selected Address', formattedAddress);
            }
            else {
                this.showMap(cmp, lat, lng, 'Default Address');
            }

            // Set search area around the default latitude and longitude 
            cmp.set("v.currentLatitude", lat);
            cmp.set("v.currentLongitude", lng);
        }
        else {
            let geoSuccess = function(position) {
                /* Get the current users' location if location tracking is enabled */
                let startPos = position;
                helper.showMap(cmp, startPos.coords.latitude, startPos.coords.longitude, 'Current Location');
                
                /* Set the current latitude and longitude to filter the suggestion API to nearby suggestions only */
                cmp.set("v.currentLatitude", startPos.coords.latitude);
                cmp.set("v.currentLongitude", startPos.coords.longitude);
            };

            navigator.geolocation.getCurrentPosition(geoSuccess, function (error) {
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        cmp.set("v.mapLoadError", "Allow location tracking to show your current positon")
                        break;
                    case error.POSITION_UNAVAILABLE:
                        cmp.set("v.mapLoadError", "Location information is unavailable")
                        break;
                    case error.TIMEOUT:
                        cmp.set("v.mapLoadError", "The request to get user location timed out")
                        break;
                    case error.UNKNOWN_ERROR:
                        cmp.set("v.mapLoadError", "An unknown error occurred")
                        break;
                }
            });
        }
    },
    showMap : function(cmp, lat, lng, title, description) {
        // let desc = '<span style="color: red;">' + description + '</span>';

        let showMap = cmp.get("v.showMap");
        if(showMap == true) {
            cmp.set("v.markerAvailable", false);
            cmp.set("v.mapMarkers", [
                {
                    location: {
                        'Latitude': lat,
                        'Longitude': lng
                    },
                    title: title,
                    description: description
                }
            ]);
            cmp.set("v.markerAvailable", true);
        }
    },
    startSearch : function(cmp) {
        /* Check if the search timeout exists yet and clear it if exists */
        let searchTimeout = cmp.get('v.searchTimeout');
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        /* Set timeout before starting the search to reduce number of API calls made
            keystrokes within 300ms will not make the call */ 
        searchTimeout = window.setTimeout(
            $A.getCallback(() => {
                /* Set search parameters of location input plus users' longitude and latitude if available */
                let params = {
                    "input" : cmp.get("v.location"),
                    "latitude" : cmp.get("v.currentLatitude"),
                    "longitude" : cmp.get("v.currentLongitude"),
                    "sessionToken" : cmp.get("v.UUID")
                }

                /* Make the server call to get Places Suggestion API results */
                this.callServer(
                        cmp,
                        "c.getSuggestions",
                        function(response){
                                let resp = JSON.parse(response);

                                if(resp.status === "OK") {
                                    cmp.set('v.predictions', resp.predictions);
                                }
                                else if(resp.error_message) { // If an error message is returned
                                    cmp.set("v.apiError", resp.error_message + " Please contact the admin.");
                                }
                                else if(resp.status == "ZERO_RESULTS") { // If no results found
                                    cmp.set('v.predictions', null);
                                }
                                else { // If an unknown error is returned
                                    cmp.set("v.apiError", "Failed to get response with Google Places API key. Unknown error.");
                                }
                                cmp.set("v.searching", false);
                            }
                    ,params);
                /* Clear timeout when search is completed */
                cmp.set('v.searchTimeout', null);
            }), 300); // Wait for 300 ms before sending search request
        cmp.set('v.searchTimeout', searchTimeout);
    },
    getPlaceDetails: function(cmp, placeid) {
        let params = {
            "placeId" : placeid,
            "sessionToken" : cmp.get("v.UUID")
        }
        
        this.callServer(
            cmp,
            "c.getPlaceDetails",
            function(response){
                let placeDetails = JSON.parse(response);
                
                if(placeDetails.status === "OK") {
                    let place = placeDetails.result;
                    let formattedAddress;

                    place.formatted_address ? formattedAddress = place.formatted_address : formattedAddress = place.name;
                    cmp.set('v.location', formattedAddress);

                    // Clear any previously existing address fields with data
                    cmp.set('v.predictions', []);
                    let fullStreetAddress = '';
                    this.clearAddressFields(cmp);

                    cmp.set("v.placeId", placeid);
                    
                    // List of address components and type to check for in the response API JSON
                    let componentForm = {
                        premise                     : 'long_name',
                        street_number               : 'short_name',
                        route                       : 'long_name',
                        locality                    : 'long_name',
                        sublocality_level_1         : 'long_name',
                        neighborhood                : 'long_name',
                        administrative_area_level_1 : 'short_name',
                        administrative_area_level_2 : 'long_name',
                        country                     : 'long_name',
                        postal_code                 : 'short_name'
                    };
                    
                    // Temp variable to store the neighborhood value if 'sublocality_level_1' or 'locality' is empty
                    let tmpNeighborhood; // Known address use cases - LONDON
                
                    for (let i = 0; i < place.address_components.length; i++) {
                        let addressType = place.address_components[i].types[0];
                        
                        if (componentForm[addressType]) {
                            let val = place.address_components[i][componentForm[addressType]];
                            
                            if(addressType == "sublocality_level_1" || addressType == "locality") {
                                cmp.set("v.locality", val);
                            }
                            else if(addressType == "neighborhood") {
                                tmpNeighborhood = val;
                            }
                            else {
                                cmp.set("v." + addressType, val);

                                if(addressType == "premise") {
                                    fullStreetAddress += val + "\n";
                                }
                                else if(addressType == "street_number" || addressType == "route") {
                                    fullStreetAddress += val + " ";
                                }
                            }
                        }
                    }

                    if(cmp.get("v.locality") == null || cmp.get("v.locality") == '') {
                        cmp.set("v.locality", tmpNeighborhood);
                    }

                    cmp.set("v.formattedAddress", formattedAddress);
                    cmp.set("v.fullStreetAddress", fullStreetAddress);
                    cmp.set("v.latitude", place.geometry.location.lat);
                    cmp.set("v.longitude", place.geometry.location.lng);

                    this.showMap(cmp, place.geometry.location.lat, place.geometry.location.lng, 'Selected Address', formattedAddress);
                    cmp.set("v.locationSelected", true);
                }
                else if(placeDetails.error_message) { // If an error message is returned
                    cmp.set("v.apiError", placeDetails.error_message + " Please contact the admin.");
                }
                else {
                    cmp.set("v.apiError", "Failed to get response with Google Places API key. Unknown error.");
                }
            },
            params
        );
    },
    clearAddressFields : function(cmp) {
        cmp.set("v.locationSelected", false);
        cmp.set("v.placeId", null);
        cmp.set("v.latitude", null);
        cmp.set("v.longitude", null);
        cmp.set("v.premise", null);
        cmp.set("v.fullStreetAddress", null);
        cmp.set("v.street_number", null);
        cmp.set("v.route", null);
        cmp.set("v.locality", null);
        cmp.set("v.administrative_area_level_1", null);
        cmp.set("v.administrative_area_level_2", null);
        cmp.set("v.postal_code", null);
        cmp.set("v.country", null);
        cmp.set("v.formattedAddress", null);
    },

    // UUID Generator - https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
    generateUUID : function() { // Public Domain/MIT
        let d = new Date().getTime();
        if (typeof performance !== 'undefined' && typeof performance.now === 'function'){
            d += performance.now(); //use high-precision timer if available
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            let r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }
})