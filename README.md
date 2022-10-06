# Link checker app for Enonic XP

This Enonic XP application adds a widget to your [Enonic XP](https://github.com/enonic/xp) site. This widget lets you check all your content for broken links, both internal (to other content on same site) and external (URL).

## Installation
### Enonic Market
Go into the Enonic XP Application admin tool and install the app from the [Enonic Market](https://market.enonic.com/).

The **Link checker** app will then be available in the widget panel in the content studio.

### Build yourself
Build this app with gradle. In the terminal, from the root of the project, enter `./gradlew build`.
On Windows, just enter `gradlew build` in the command line from the project root.
Next, move the JAR file from /build/libs to your `$XP_HOME/deploy` directory.

The **Link checker** app will then be available in the widget panel in the content studio.

If you update package.json, make sure to run `./gradlew npm_install`.

## How to use this app

After adding this app you should see a new LinkChecker option in detail panel to the top right in the content studio. Selecting a content and pressing the **Start** button will start the process. It will check the current content and all its children content for broken links. You can choose to only check the selected content, only the sub-content of that content or both.

**NB!** The internal data of the content is searched for links, not the corresponding webpage. Check [Siteimprove](https://market.enonic.com/vendors/enonic/siteimprove) app for a more complete check.

The result is cached, so if the content and its children have not been modified since last check it will return the cached result immediatly.

The checking process can be stopped anytime while checking and return the result found so far. This will however not cache any results.

If you select another content while the checker is running, it will continue in the background. If you go back to the content you started on the widget will try to reestablish connection.

A max of 10 broken links are show in the detail panel. If more are found they are detailed in the downloadable spreadsheet.

## Download report

After getting a result you can download it as an Excel spreadsheet.
This has the form:

| displayName | Path | broken link | status
| ------------- | ------------- | ------------- | ------------- |
| Contact us | /en/contact-us | http://www.brokenlink.broken | 404 |
|            |                | https://enonic.com/doesnotexist| 404 |
| Article B | /en/blog/article-b | http://www.example.crash | 500 |
|           |                 | 22c1574a-38f4-4cf444-5fgd9sd | 404 |



### Common status codes

| Status | Meaning |
| ------------- | ------------- |
| 404 | The site could not be found |
| 500 | Internal server error at requested site |
| 526 | Invalid SSL certificate |
| Timeout / 408 | The site took too long to respond |


### HTTPS in Apache2
If you are running HTTPS and you are met with `failed: Error during WebSocket handshake: Unexpected response code: 200`, add the following code to your conf file in your apache server with `mod_rewrite` activated:

```
<VirtualHost *:443>
    ...
    RewriteEngine on
    ...
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteCond %{REQUEST_URI} /admin [NC]
    RewriteRule /admin/(.*) ws://exp:8080/admin/$1 [P,L]

    ...
</VirtualHost>
```


## Releases and Compatibility

| Version | XP version |
|---------| ------------- |
| 3.0.1   | >=7.9.0 |
| 3.0.0   | >=7.9.0 |
| 2.0.1   | >=7.2.0 |
| 2.0.0   | >=7.2.0 |
| 1.0.0   | >=6.12.0 |

Not tested for below 6.12.0

## Changelog
### Version 3.0.1
* Fixed bug with valid external links being listed as "Need manual review".
* Fixed bug with internal links always being listed twice.

### Version 3.0.0

* Possible to use with Content Security Policy (CSP) from Enonic XP version 7.9.0.
* Localization added, so it now supports Norwegian and English.

### Version 2.0.1

* Add support for checking multiple content projects

### Version 2.0.0

* Add functionality for checking all internal links, not just those in HTMLAreas.
* Add checking of internal links to media and image content.
* Upgrade httpClientLib so we don't have to intepret its crashes as status codes at target URL's quite as often.
* Improved clarity in widget panel.


### Version 1.0.0

* First launch
