/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
 
 /*
   Author:         Derrick Vuong
   Company:        Salesforce
   Description:    src/classes/AddressValidationController.cls
   Date/Time:      5/20/2019, 4:49:47 PM

   History:
   When        Who         What
                               
   TODO:
   
 */
global with sharing class AddressValidationController {
    @AuraEnabled
    global static string getSuggestions(String input, String latitude, String longitude, String sessionToken) {
        /* https://developers.google.com/places/web-service/autocomplete#place_types */

        String url = 'https://maps.googleapis.com/maps/api/place/autocomplete/json?'
            + 'input=' + EncodingUtil.urlEncode(input, 'UTF-8')
            + '&key=' + getKey()
            + '&sessiontoken=' + sessionToken;
        if(latitude != null && longitude != null) {
            url += '&location=' + latitude + ',' + longitude + '&radius=1000';
        }

        String response = getResponse(url);
        return response;
    }
    @AuraEnabled
    global static string getPlaceDetails(String placeId, String sessionToken) {
        /* https://developers.google.com/places/web-service/details#PlaceDetailsResults */

        String url = 'https://maps.googleapis.com/maps/api/place/details/json?'
            + 'placeid=' + EncodingUtil.urlEncode(placeId, 'UTF-8')
            + '&key=' + getKey()
            + '&sessiontoken=' + sessionToken;
            // + '&fields=address_components,formatted_address,geometry,name,adr_address,photos';
            
            // Available Places Detail Fields
            // address_component, adr_address, formatted_address, geometry, icon, name, 
            // permanently_closed, photo, place_id, plus_code, type, url, utc_offset, vicinity

        String response = getResponse(url);
        return response;
    }
    
    global static string getResponse(string strURL){
        Http h = new Http();
        HttpRequest req = new HttpRequest();
        HttpResponse res = new HttpResponse();
        req.setMethod('GET');
        req.setEndpoint(strURL);
        req.setTimeout(120000);
        res = h.send(req); 
        String responseBody = res.getBody(); 
        return responseBody;
    }

    private static string getKey(){
        List<PlacesAPI__c> placesAPIs = [SELECT Id, key__c FROM PlacesAPI__c LIMIT 1];
        for(PlacesAPI__c placesAPI : placesAPIs) {
            if(placesApi != null) {
                string APIkey = placesAPI.key__c;
                return APIkey;
            }
        }

        system.debug('##### FlowAddress: #####');
        system.debug('API key not found. Check Custom Settings.');
        return null;
    }

    // https://salesforce.stackexchange.com/questions/185617/packaging-custom-labels-used-in-lightning-helpers-and-controllers
    // Include any dynamic custom labels that are referenced in Lightning in alphabetical order
    global static Boolean describeLabels()
    {
        String ComponentTitle = System.Label.Title;
        return true ;
    }

}