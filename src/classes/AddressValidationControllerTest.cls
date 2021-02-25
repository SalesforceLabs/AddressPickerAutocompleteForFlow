@isTest(SeeAllData=true)
public class AddressValidationControllerTest {    
    @isTest
    static void validateGetSuggestions() {
        //Test.setMock(AddressValidationController.class, new AddressValidationController());
        Test.startTest();
        Test.setMock(HttpCalloutMock.class, new MockHttpResponseGenerator());
        
        String searchString = '201 Sussex St', latitude = '0.00', longitude = '0.00', sToken = 'abc123', filters = 'US,AU';
        String searchResults = AddressValidationController.getSuggestions(searchString, latitude, longitude, sToken);
        String searchResultsWithFilters = AddressValidationController.getSuggestionsWithFilters(searchString, latitude, longitude, sToken, filters);
        
        System.assertNotEquals(null, searchResults);
        //String placeId = 'ChIJ9Rr6fhsUyYcRtMLEzbOtijM';
        
        Test.stopTest();
    }
    @isTest
    static void validateGetPlaceDetails() {
        Test.startTest();
        Test.setMock(HttpCalloutMock.class, new MockHttpResponseGenerator());
        
        String placeId = 'ChIJ9Rr6fhsUyYcRtMLEzbOtijM', sToken = 'abc123';
        String searchResults = AddressValidationController.getPlaceDetails(placeId, sToken);
        
        System.assertNotEquals(null, searchResults);
        
        Test.stopTest();
    }
    @isTest
    static void describeLabelsTest() {
        Boolean TestOk = AddressValidationController.describeLabels();
        system.assert(TestOk == true);
    }
}