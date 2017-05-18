# Purpose

Thunderbird mail client extension which allows to open and edit your messages in an external text editor such as **NEdit**, **emacs**, etc...  

# Installation

The External Editor button is not visible by default; you must customize your composer toolbar:  

*   Open the compose window
*   Select the menu **View/Toolbars/Customize...**, or right click on the toolbar and select **Customize...**
*   Drag and Drop the new icon **External Editor** on your toolbar
*   Click **OK**  

Then, open the extension option window and set your editor (without path or with an absolute path)  

# Usage

Just click on the extension button or use the keyboard shortcut (Ctrl-E), edit your message in your editor (while editing, the compose window is disabled), save, close, and the message will be updated in the compose window.  
Emacs users can install this [major mode](http://os.inf.tu-dresden.de/~mp26/download/tbemail.el) designed for EE (look [here](http://os.inf.tu-dresden.de/~mp26/emacs.shtml) for details).  

## HTML Edition

When editing a HTML message, the External Editor button provides a drop-down menu allowing to edit as HTML (thus keeping all text enhancements), or as plain text.  

## Unicode support

Starting with version 0.6, unicode is supported. You must set unicode encoding in the Compose window **before** launching External Editor: Menu **Options/Character Encoding: Unicode (UTF-8)**.  

## Headers Edition  

Headers can be edited in the external editor, given as a comma separated list in a paragraph before the message content.  

Supported headers are: `Subject, To, Cc, Bcc, Reply-To, Newsgroup.`

    Subject:  Here is the subject  
    To:       adressTo1, adressTo2  
    Cc:       adressCc1  
    Bcc:  
    Reply-To:  
    -=-=-=-=-=-=-=-=-=# Don't remove this line #=-=-=-=-=-=-=-=-=-  
    ... the mail content begins here ...

But you can then modify it, use multiple lines, and add as many headers type as you want. Example:  

    To: adresseTo1, adresseTo2  
    adresseTo3  
    adresseTo4, adresseTo5  
    Cc: adresseCc1  
    adresseCc2, adresseCc3  
    To:adresseTo6  
    To:adresseTo7  
    ...  
    -=-=-=-=-=-=-=-=-=# Don't remove this line #=-=-=-=-=-=-=-=-=-

# Warnings

*   Your external editor **must** run in foreground, i.e. must not return before you close the file.  
    *   NEdit: use `"nedit"` or `"nc -wait"`
    *   gvim: use `"gvim --nofork"`
    *   and for vim: use `"xterm -e vim"`

# Supported platforms

External Editor has been tested on Windows (XP) and Linux. It also works on Mac OSX, beginning with Thunderbird 1.1.

# How to build

Make sure you have perl and zip installed on your system and run:

    make

# Interesting posts and reference

* http://globs.org/thread.php?lng=en&pg=1037&fid=7&cat=1
* http://globs.org/thread.php?lng=en&pg=2655&fid=2&cat=1
* http://globs.org/thread.php?lng=en&pg=231&fid=10&cat=1
* https://developer.mozilla.org/en-US/docs/XUL
