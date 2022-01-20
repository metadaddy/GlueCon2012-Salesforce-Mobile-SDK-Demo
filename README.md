# GlueCon 2012 Salesforce Mobile SDK Demo

As first presented in [We Don’t Need No Stinkin App Server! Building a Two-Tier Mobile App](https://www.slideshare.net/metadaddy/we-dont-need-no-stinkin-app-server-building-a-twotier-mobile-app-13063405); a session at [Gluecon 2012](http://gluecon.com/2012/); and later in the Touch Stadium at Dreamforce 2012.

Install the [Salesforce Mobile SDK](http://wiki.developerforce.com/page/Mobile_SDK) (this latest version of the demo runs on version 1.3 of the Mobile SDK) and create a new "Hybrid Force.com App" project according to instructions in the  [README](https://github.com/forcedotcom/SalesforceMobileSDK-iOS/blob/master/readme.md). Clone this project and drop the files into your hybrid app's folder, overwriting `forcetk.js`, `index.html` and `inline.js`, and creating a new `images` folder.

You will also need to [create a Force.com Developer Edition environment](developer.force.com/join) and add two custom fields to the standard Contact object:

* **ImageId** - text field, length = 18
* **Image** - formula field, type = text, formula:

        IF( ImageId__c != null , 
            HYPERLINK('/' & ImageId__c, 
                IMAGE( '/sfc/servlet.shepherd/version/download/' & ImageId__c, '', 150, 100)) , 
            IMAGE('' , '' , 0 , 0))
