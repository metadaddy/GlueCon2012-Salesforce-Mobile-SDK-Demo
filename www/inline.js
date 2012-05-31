//Sample code for Hybrid REST Explorer

// Converts an ArrayBuffer directly to base64, without any intermediate 'convert to string then
// use window.btoa' step. From http://pastebin.com/23PLrQ1Q via 
// http://www.modelmetrics.com/tomgersic/using-xmlhttprequest2-in-ios-5-to-download-binary-files-using-html5phonegap/
function base64ArrayBuffer(arrayBuffer) {
    var base64    = '';
    var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    
    var bytes         = new Uint8Array(arrayBuffer);
    var byteLength    = bytes.byteLength;
    var byteRemainder = byteLength % 3;
    var mainLength    = byteLength - byteRemainder;
    
    var a, b, c, d;
    var chunk;
    
    // Main loop deals with bytes in chunks of 3
    for (var i = 0; i < mainLength; i = i + 3) {
        // Combine the three bytes into a single integer
        chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
        
        // Use bitmasks to extract 6-bit segments from the triplet
        a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
        b = (chunk & 258048)   >> 12; // 258048   = (2^6 - 1) << 12
        c = (chunk & 4032)     >>  6; // 4032     = (2^6 - 1) << 6
        d = chunk & 63;               // 63       = 2^6 - 1
        
        // Convert the raw binary segments to the appropriate ASCII encoding
        base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
    }
    
    // Deal with the remaining bytes and padding
    if (byteRemainder == 1) {
        chunk = bytes[mainLength];
        
        a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2
        
        // Set the 4 least significant bits to zero
        b = (chunk & 3)   << 4; // 3   = 2^2 - 1
        
        base64 += encodings[a] + encodings[b] + '=='
    } else if (byteRemainder == 2) {
        chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];
        
        a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
        b = (chunk & 1008)  >>  4; // 1008  = (2^6 - 1) << 4
        
        // Set the 2 least significant bits to zero
        c = (chunk & 15)    <<  2; // 15    = 2^4 - 1
        
        base64 += encodings[a] + encodings[b] + encodings[c] + '=';
    }
    
    return base64;
}

function regLinkClickHandlers() {
    var $j = jQuery.noConflict();
    
    $j('#Image').click(function() {
        getPhotoAndUploadToContact($j(this).attr('data-name'), $j(this).attr('data-id'));
    });
    
    $j('#link_fetch_sfdc_contacts').click(function() {
        SFHybridApp.logToConsole("link_fetch_sfdc_contacts clicked");
        forcetkClient.query("SELECT Id, Name FROM Contact", 
                onSuccessSfdcContactList, onErrorSfdc); 
    });
    
    $j('#link_reset').click(function() {
        SFHybridApp.logToConsole("link_reset clicked");
        $j("#div_device_contact_list").html("");
        $j("#div_sfdc_contact_list").html("");
        $j("#div_sfdc_account_list").html("");
        $j("#console").html("");
    });
    
    $j('#link_logout').click(function() {
        SFHybridApp.logToConsole("link_logout clicked");
        SalesforceOAuthPlugin.logout();
    });
}

// Called when we have a new photo
function onPhotoDataSuccess(imageData, name, contactId) {
    var $j = jQuery.noConflict();

    SFHybridApp.logToConsole("in onPhotoDataSuccess, contactId = "+contactId);
    
    // Update the image on screen
    $j('#Image').attr('src', "data:image/jpeg;base64," + imageData);
    
    // Upload the image data to Content
    $j.mobile.showPageLoadingMsg();
    forcetkClient.create('ContentVersion', {
        "PathOnClient" : name + ".png",
        "VersionData" : imageData
    }, function(data){
        // Now update the Contact record with the new ContentVersion Id
        SFHybridApp.logToConsole('Created ContentVersion ' + data.id);
        forcetkClient.update('Contact', contactId, { 
            "Image_ID__c" : data.id 
        }, function(){
            $j.mobile.hidePageLoadingMsg();
            SFHybridApp.logToConsole('Updated Contact '+contactId);
        }, onErrorSfdc);
    }, onErrorSfdc);    
}

// Take picture using device camera and retrieve image as base64-encoded string
function getPhotoAndUploadToContact(name, contactId) {
    SFHybridApp.logToConsole("in capturePhoto, contactId = "+contactId);
    
    $j('#Image').attr('data-old-src', $j('#Image').attr('src'));
    $j('#Image').attr('src', "images/camera.png");
    
    navigator.camera.getPicture(function(imageData){
        onPhotoDataSuccess(imageData, name, contactId);
    }, function(errorMsg){
        // Most likely error is user cancelling out of camera
        $j('#dialog-text').html(errorMsg);
        $j.mobile.changePage('#jqm-dialog');
        $j('#Image').attr('src', $j('#Image').attr('data-old-src'));
        $j('#Image').removeAttr('data-old-src');
    }, {
        quality: 50, 
        sourceType: Camera.PictureSourceType.CAMERA,
        destinationType: Camera.DestinationType.DATA_URL
    });
}

// We loaded a single contact for the detail page
function onSuccessSfdcSingleContact(response) {
    var $j = jQuery.noConflict();

    SFHybridApp.logToConsole("onSuccessSfdcSingleContact: Contact " + 
    JSON.stringify(response));
    
    // Populate screen fields
    var contact = response.records[0];
    $j('#Name').html(contact.Name);
    $j('#AccountName').html(contact.Account.Name);
    $j('#Phone').html('<a href="tel:'+contact.Phone+'">'+contact.Phone+'</a>');
    
    //Set up image
    $j('#Image').attr('data-id', contact.Id);
    $j('#Image').attr('data-name', contact.Name);
    if (contact.Image_ID__c) {
        // Load image data
        $j('#Image').attr('src', "images/loading.png");
        
        $j.mobile.changePage('#jqm-detail');
        
        forcetkClient.retrieveBlobField("ContentVersion", 
                contact.Image_ID__c, "VersionData", function(response) {
            var base64data = base64ArrayBuffer(response);
            $j('#Image').attr('src', "data:image/png;base64,"+base64data);
            $j.mobile.hidePageLoadingMsg();
        }, onErrorSfdc);
    } else {
        // Display a default image
        $j.mobile.hidePageLoadingMsg();
        $j('#Image').attr('src', "images/blank.png");
        $j.mobile.changePage('#jqm-detail');
    }
}

// We loaded the contact list
function onSuccessSfdcContactList(response) {
    var $j = jQuery.noConflict();
    
    SFHybridApp.logToConsole("onSuccessSfdcContactList: received " + 
            response.totalSize + " contacts");
    
    $j("#div_sfdc_contact_list").html("")
    var ul = $j('<ul data-role="listview" data-inset="true" data-theme="a" data-dividertheme="a"></ul>');
    $j("#div_sfdc_contact_list").append(ul);
    
    ul.append($j('<li data-role="list-divider">Salesforce Contacts: ' + 
            response.totalSize + '</li>'));
    $j.each(response.records, function(i, contact) {
        var id = contact.Id;
        var newLi = $j("<li><a href='#'>" + (i+1) + " - " + contact.Name + "</a></li>");
        newLi.click(function(e){
            e.preventDefault();
            $j.mobile.showPageLoadingMsg();
            forcetkClient.query("SELECT Id, Name, Account.Name, Phone, Image_ID__c "+
                    "FROM Contact WHERE Id = '"+id+"'", 
                    onSuccessSfdcSingleContact, onErrorSfdc);
        });
        ul.append(newLi);
    });
    
    $j("#div_sfdc_contact_list").trigger( "create" )
}

// Oops...
function onErrorSfdc(error) {
    var $j = jQuery.noConflict();

    $j.mobile.hidePageLoadingMsg();
    SFHybridApp.logToConsole("onErrorSfdc: " + JSON.stringify(error));
    alert(JSON.stringify(error));
}