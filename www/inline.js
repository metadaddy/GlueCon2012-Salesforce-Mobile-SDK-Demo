//Sample code for Hybrid REST Explorer
function regLinkClickHandlers() {
    var $j = jQuery.noConflict();
    var logToConsole = cordova.require("salesforce/util/logger").logToConsole;
    $j('#Image').click(function() {
        getPhotoAndUploadToContact($j(this).attr('data-name'), $j(this).attr('data-id'));
    });

    $j('#link_fetch_sfdc_contacts').click(function() {
        logToConsole("link_fetch_sfdc_contacts clicked");
        forcetkClient.query("SELECT Id, Name FROM Contact", onSuccessSfdcContacts, onErrorSfdc);
    });

    $j('#link_reset').click(function() {
        logToConsole("link_reset clicked");
        $j("#div_sfdc_contact_list").html("");
        $j("#console").html("");
    });

    $j('#link_logout').click(function() {
        logToConsole("link_logout clicked");
        var sfOAuthPlugin = cordova.require("salesforce/plugin/oauth");
        sfOAuthPlugin.logout();
    });
}

// Called when we have a new photo
function onPhotoDataSuccess(imageData, name, contactId) {
    var $j = jQuery.noConflict();

    SFHybridApp.logToConsole("in onPhotoDataSuccess, contactId = " + contactId);

    // Update the image on screen
    $j('#Image').attr('src', "data:image/jpeg;base64," + imageData);

    // Upload the image data to Chatter files
    $j.mobile.showPageLoadingMsg();
    forcetkClient.create('ContentVersion', {
        "Origin": "H",
        "PathOnClient": name + ".png",
        "VersionData": imageData
    }, function(data) {
        // Now update the Contact record with the new ContentVersion Id
        SFHybridApp.logToConsole('Created ContentVersion ' + data.id);
        forcetkClient.update('Contact', contactId, {
            "ImageId__c": data.id
        }, function() {
            SFHybridApp.logToConsole('Updated Contact ' + contactId);
            forcetkClient.apexrest('/makeContentPublic', function() {
                SFHybridApp.logToConsole('Updated perms ' + data.id);
                $j.mobile.hidePageLoadingMsg();
            }, onErrorSfdc, 'POST', {
                "contentVersionId": data.id
            })
        }, onErrorSfdc);
    }, onErrorSfdc);
}

// Take picture using device camera and retrieve image as base64-encoded string
function getPhotoAndUploadToContact(name, contactId) {
    var $j = jQuery.noConflict();

    SFHybridApp.logToConsole("in capturePhoto, contactId = " + contactId);

    $j('#Image').attr('data-old-src', $j('#Image').attr('src'));
    $j('#Image').attr('src', "images/camera.png");

    navigator.camera.getPicture(function(imageData) {
        onPhotoDataSuccess(imageData, name, contactId);
    }, function(errorMsg) {
        // Most likely error is user cancelling out of camera
        onPhotoDataError(errorMsg);
    }, {
        quality: 50,
        correctOrientation: true,
        sourceType: Camera.PictureSourceType.CAMERA,
        destinationType: Camera.DestinationType.DATA_URL
    });
}

// We loaded a single contact for the detail page
function onSuccessSfdcSingleContact(response) {
    var $j = jQuery.noConflict();

    SFHybridApp.logToConsole("onSuccessSfdcSingleContact: Contact " + JSON.stringify(response));

    // Populate screen fields
    var contact = response.records[0];
    $j('#Name').html(contact.Name);
    $j('#AccountName').html(contact.Account.Name);
    $j('#Phone').html('<a href="tel:' + contact.Phone + '">' + contact.Phone + '</a>');

    //Set up image
    $j('#Image').attr('data-id', contact.Id);
    $j('#Image').attr('data-name', contact.Name);
    if (contact.ImageId__c) {
        // Load image data
        $j('#Image').attr('src', "images/loading.png");

        $j.mobile.changePage('#jqm-detail');

        forcetkClient.retrieveBlobField("ContentVersion", contact.ImageId__c, "VersionData", function(response) {
            var base64data = base64ArrayBuffer(response);
            $j('#Image').attr('src', "data:image/png;base64," + base64data);
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
function onSuccessSfdcContacts(response) {
    var $j = jQuery.noConflict();
    cordova.require("salesforce/util/logger").logToConsole("onSuccessSfdcContacts: received " + response.totalSize + " contacts");

    $j("#div_sfdc_contact_list").html("")
    var ul = $j('<ul data-role="listview" data-inset="true" data-theme="a" data-dividertheme="a"></ul>');
    $j("#div_sfdc_contact_list").append(ul);

    ul.append($j('<li data-role="list-divider">Salesforce Contacts: ' + response.totalSize + '</li>'));
    $j.each(response.records, function(i, contact) {
        var id = contact.Id;
        var newLi = $j("<li><a href='#'>" + (i + 1) + " - " + contact.Name + "</a></li>");
        newLi.click(function(e) {
            e.preventDefault();
            $j.mobile.showPageLoadingMsg();
            forcetkClient.query("SELECT Id, Name, Account.Name, Phone, ImageId__c " + "FROM Contact WHERE Id = '" + id + "'", onSuccessSfdcSingleContact, onErrorSfdc);
        });
        ul.append(newLi);
    });

    $j("#div_sfdc_contact_list").trigger("create")
}

// Show error page
function onPhotoDataError(errorMsg) {
    var $j = jQuery.noConflict();

    $j('#dialog-text').html(errorMsg);
    $j.mobile.changePage('#jqm-dialog');
    $j('#Image').attr('src', $j('#Image').attr('data-old-src'));
    $j('#Image').removeAttr('data-old-src');
}

// Oops...
function onErrorSfdc(error) {
    var $j = jQuery.noConflict();

    $j.mobile.hidePageLoadingMsg();
    cordova.require("salesforce/util/logger").logToConsole("onErrorSfdc: " + JSON.stringify(error));
    alert(JSON.stringify(error));
}
