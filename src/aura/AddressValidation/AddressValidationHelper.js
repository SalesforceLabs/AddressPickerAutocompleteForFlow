/*
   Author:         Derrick Vuong
   Company:        Salesforce
   Description:    src/aura/AddressValidation/AddressValidationHelper.js
   Date/Time:      5/21/2019, 1:35:56 PM

   History:
    When        Who         What
    15/03/22    KK          - Added setting currentLatitude/Longitude when search is successful to display them if showGeolocation is enabled
                         
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
        let labels = {
            SEARCH_AND_ALL_ADDRESS_FIELDS_REQUIRED : $A.get("$Label.c.Search_and_All_Address_Fields_Required"),
            SEARCH_AND_ADDRESS_FIELD_REQUIRED : $A.get("$Label.c.Search_and_Address_Field_Required"),
            FILLED_ADDRESS_FIELDS_REQUIRED : $A.get("$Label.c.Filled_Address_Fields_Required"),
        }

        cmp.set('v.validate', function() {
            // let locationSelected = cmp.get("v.locationSelected");
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
                if(locationValue.length > 0 && !addressFieldEmpty) {
                    return { isValid: true };
                } else {
                    return { isValid: false, errorMessage: labels.SEARCH_AND_ALL_ADDRESS_FIELDS_REQUIRED };
                }
            } else if(!fieldsRequired && isRequired) {
                if(locationValue.length > 0)
                    return { isValid: true };
                else
                    return { isValid: false, errorMessage: labels.SEARCH_AND_ADDRESS_FIELD_REQUIRED };
            } else if(showAddressFields && fieldsRequired) {
                if(!addressFieldEmpty) 
                    return { isValid: true };
                else
                    return { isValid: false, errorMessage: labels.FILLED_ADDRESS_FIELDS_REQUIRED };
            }
        })
    },
    initialiseMapData : function(cmp, helper) {
        let lat = cmp.get("v.latitude"), lng = cmp.get("v.longitude");
        let labels = {
            SELECTED_ADDRESS : $A.get("$Label.c.Selected_Address"),
            DEFAULT_ADDRESS : $A.get("$Label.c.Default_Address"),
            CURRENT_LOCATION : $A.get("$Label.c.Current_Location"),
            ENABLE_LOCATION_TRACKING : $A.get("$Label.c.Enable_Location_Tracking"),
            POSITION_UNAVAILABLE : $A.get("$Label.c.Position_Unavailable"),
            REQUEST_TIMED_OUT : $A.get("$Label.c.Request_Timed_Out"),
            UNKNOWN_ERROR : $A.get("$Label.c.Unknown_Error")
        }

        if(lat != null && lng != null) {
            let formattedAddress = cmp.get("v.formattedAddress");
            if(formattedAddress) {
                this.showMap(cmp, lat, lng, labels.SELECTED_ADDRESS, formattedAddress);
            }
            else {
                this.showMap(cmp, lat, lng, labels.DEFAULT_ADDRESS);
            }

            // Set search area around the default latitude and longitude 
            cmp.set("v.currentLatitude", lat);
            cmp.set("v.currentLongitude", lng);
        }
        else {
            let geoSuccess = function(position) {
                /* Get the current users' location if location tracking is enabled */
                let startPos = position;
                helper.showMap(cmp, startPos.coords.latitude, startPos.coords.longitude, labels.CURRENT_LOCATION);
                
                /* Set the current latitude and longitude to filter the suggestion API to nearby suggestions only */
                cmp.set("v.currentLatitude", startPos.coords.latitude);
                cmp.set("v.currentLongitude", startPos.coords.longitude);
            };

            navigator.geolocation.getCurrentPosition(geoSuccess, function (error) {
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        cmp.set("v.mapLoadError", labels.ENABLE_LOCATION_TRACKING)
                        break;
                    case error.POSITION_UNAVAILABLE:
                        cmp.set("v.mapLoadError", labels.POSITION_UNAVAILABLE)
                        break;
                    case error.TIMEOUT:
                        cmp.set("v.mapLoadError", labels.REQUEST_TIMED_OUT)
                        break;
                    case error.UNKNOWN_ERROR:
                        cmp.set("v.mapLoadError", labels.UNKNOWN_ERROR)
                        break;
                }
            });
        }
    },
    showMap : function(cmp, lat, lng, title, description) {
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
        let labels = {
            CONTACT_ADMIN : $A.get("$Label.c.Please_contact_your_admin"),
            API_UNKNOWN_ERROR : $A.get("$Label.c.API_Unknown_Error"),
        }
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
                    "sessionToken" : cmp.get("v.UUID"),
                    "countryFilters" : cmp.get("v.countryFilters")
                }

                /* Make the server call to get Places Suggestion API results */
                this.callServer(
                        cmp,
                        "c.getSuggestionsWithFilters",
                        function(response){
                                let resp = JSON.parse(response);

                                if(resp.status === "OK") {
                                    cmp.set('v.predictions', resp.predictions);
                                } else if(resp.error_message) { // If an error message is returned
                                    cmp.set("v.apiError", resp.error_message + " " + labels.CONTACT_ADMIN);
                                } else if(resp.status == "ZERO_RESULTS") { // If no results found
                                    cmp.set('v.predictions', null);
                                } else { // If an unknown error is returned
                                    cmp.set("v.apiError", labels.API_UNKNOWN_ERROR);
                                }
                                cmp.set("v.searching", false);
                            }
                    , params);
                /* Clear timeout when search is completed */
                cmp.set('v.searchTimeout', null);
            }), 300); // Wait for 300 ms before sending search request
        cmp.set('v.searchTimeout', searchTimeout);
    },
    getPlaceDetails: function(cmp, placeid) {
        let labels = {
            SELECTED_ADDRESS : $A.get("$Label.c.Selected_Address"),
            CONTACT_ADMIN : $A.get("$Label.c.Please_contact_your_admin"),
            API_UNKNOWN_ERROR : $A.get("$Label.c.API_Unknown_Error"),
        }

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
                    // Clear any previously existing address fields with data
                    cmp.set('v.predictions', []);
                    this.clearAddressFields(cmp);

                    let place = placeDetails.result, fullStreetAddress = "", formattedAddress, componentForm, i, lat, lng;
                    // Temp variable to store the neighborhood value if 'sublocality_level_1' or 'locality' is empty
                    let tmpNeighborhood; // Known address use cases - LONDON

                    // List of address components and type to check for in the response API JSON
                    componentForm = {
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
                    cmp.set("v.placeId", placeid);

                    // Premise was removed from the Place Details API
                    if(place.types.includes("establishment")) {
                        fullStreetAddress = place.name + "\n";
                        cmp.set("v.premise", place.name);
                    }

                    for (i = 0; i < place.address_components.length; i++) {
                        let addressType = place.address_components[i].types[0];
                        
                        if (componentForm[addressType]) {
                            let val = place.address_components[i][componentForm[addressType]];
                            
                            if(addressType == "sublocality_level_1" || addressType == "locality") {
                                cmp.set("v.locality", val);
                            } else if(addressType == "neighborhood") {
                                tmpNeighborhood = val;
                            } else {
                                cmp.set("v." + addressType, val);
                                if(addressType == "street_number" || addressType == "route") {
                                    fullStreetAddress += val + " ";
                                }
                            }
                        }
                    }

                    if(cmp.get("v.locality") == null || cmp.get("v.locality") == '') {
                        cmp.set("v.locality", tmpNeighborhood);
                    }

                    formattedAddress = place.formatted_address ? place.formatted_address : place.name;
                    lat = place.geometry.location.lat;
                    lng = place.geometry.location.lng;

                    cmp.set('v.location', formattedAddress);
                    cmp.set("v.formattedAddress", formattedAddress);
                    cmp.set("v.fullStreetAddress", fullStreetAddress);
                    cmp.set("v.latitude", lat);
                    cmp.set("v.longitude", lng);
                    
                    //set current values to display the correct Lat/Lng if these fields are shown
                    cmp.set("v.currentLatitude", lat);
                    cmp.set("v.currentLongitude", lng);

                    this.showMap(cmp, lat, lng, labels.SELECTED_ADDRESS, formattedAddress);
                    cmp.set("v.locationSelected", true);
                } else if(placeDetails.error_message) { // If an error message is returned
                    cmp.set("v.apiError", placeDetails.error_message + " " + labels.CONTACT_ADMIN);
                } else {
                    cmp.set("v.apiError", labels.API_UNKNOWN_ERROR);
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
    checkValidFilter : function(cmp) {
        const labels = {
            COUNTRY_FILTER_LIMIIT : $A.get("$Label.c.Country_Filter_Limit"),
            COUNTRY_FILTER_FORMAT : $A.get("$Label.c.Country_Filter_Format"),
        }
        const countryFilters = cmp.get("v.countryFilters");
        if(countryFilters != '' && countryFilters != null) {
            let countryFiltersArr = countryFilters.split(",");

            if(countryFiltersArr.length > 5) {
                cmp.set("v.apiError", labels.COUNTRY_FILTER_LIMIIT);
            } else {
                countryFiltersArr.forEach(country => {
                    if(country.length != 2) {
                        cmp.set("v.apiError", labels.COUNTRY_FILTER_FORMAT);
                    }
                })
            }
        }
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