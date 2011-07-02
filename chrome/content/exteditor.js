/*
The contents of this file are subject to the Mozilla Public
License Version 1.1 (the "License"); you may not use this file
except in compliance with the License. You may obtain a copy of
the License at http://www.mozilla.org/MPL/

Software distributed under the License is distributed on an "AS
IS" basis, WITHOUT WARRANTY OF ANY KIND, either express or
implied. See the License for the specific language governing
rights and limitations under the License.

Alternatively, the contents of this file may be used under the
terms of the GNU General Public License Version 2 or later (the
"GPL"), in which case the provisions of the GPL are applicable 
instead of those above.
*/

//-----------------------------------------------------------------------------
// communication from extension settings to here
function extEditorSettingsObserver() {
    this.id = "extEditorSettingsObserver";
    this.service = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
    this.register();
}
extEditorSettingsObserver.prototype = {
    observe: function(subject, topic, prefString) {

        var data = AFreadPref(prefString);
        switch (prefString) {
            case 'exteditor.default.editor': {
                initButton(data);
                prefNotifierExe = data;
                break;
            }
            case 'exteditor.editor.unicode'        : prefEditorUnicode                    = data; break;
            case 'exteditor.editor.83filename'     : prefEditor83Filename                 = data; break;
            case 'exteditor.headers.edit'          : prefEditHeaders[exteditor_GLOBAL]    = data; break;
            case 'exteditor.headers.edit.subject'  : prefEditHeaders[exteditor_SUBJECT]   = data; break;
            case 'exteditor.headers.edit.to'       : prefEditHeaders[exteditor_TO]        = data; break;
            case 'exteditor.headers.edit.cc'       : prefEditHeaders[exteditor_CC]        = data; break;
            case 'exteditor.headers.edit.bcc'      : prefEditHeaders[exteditor_BCC]       = data; break;
            case 'exteditor.headers.edit.replyto'  : prefEditHeaders[exteditor_REPLY_TO]  = data; break;
            case 'exteditor.headers.edit.newsgroup': prefEditHeaders[exteditor_NEWSGROUP] = data; break;
            default : extEditorError(getLocaleString("UnexpectedPrefString") + ": " + prefString); break;
        }
    },
    register: function() {
        this.service.addObserver(this, this.id, false);
    },
    unregister: function() {
        this.service.removeObserver(this, this.id);
    }
}

//-----------------------------------------------------------------------------
// communication from the asynchronous editor process to update the TB editor window once the external editor returned
function extEditorObserver() {
    this.id = "extEditorObserver";
    this.service = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
    this.register();
}
extEditorObserver.prototype = {
    observe: function(subject, topic, prefString) {
        updateEditor();
    },
    register: function() {
        this.service.addObserver(this, this.id, false);
    },
    unregister: function() {
        this.service.removeObserver(this, this.id);
    }
}

//-----------------------------------------------------------------------------
var strbundle;
function getLocaleString(aName)
{
    try
    {
        if (!strbundle) {
            var strBundleService = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
            strbundle = strBundleService.createBundle("chrome://exteditor/locale/exteditor.properties");
        }

        if (strbundle)
            return strbundle.GetStringFromName(aName);
    }
    catch (e) {
        extEditorError("Cannot get the localized string bundle: " + e);
    }

    return null;
}

//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------

var settingsObserver;
var dirSeparator;
var pathSeparator;
var osType;
var newLine;
var prefNotifierExe;
var prefEditHeaders = new Array;     // hash[headername] = bool
var headersEnd; // to be initialized in initExteditor() with os specific newline
var prefEditorUnicode;  // bool
var prefEditor83Filename;  // bool
var file;
var isEditorDisabled = false;

const exteditor_GLOBAL = "Global";  // just to store the global headers preference
var   exteditor_SUBJECT   = getLocaleString("Subject");
var   exteditor_TO        = getLocaleString("To");
var   exteditor_CC        = getLocaleString("Cc");
var   exteditor_BCC       = getLocaleString("Bcc");
var   exteditor_REPLY_TO  = getLocaleString("Reply-To");
var   exteditor_NEWSGROUP = getLocaleString("Newsgroup");

function launchExtEditor() {

// doAction(); return; // debug only, to be removed

    if (prefNotifierExe=="") {
        extEditorError(getLocaleString("PleaseFirstDefineYourEditor"));
        return;
    }

    var subject = document.getElementById('msgSubject').value;
    var content = "";

    if (prefEditHeaders[exteditor_GLOBAL]) {
        // Get the headers
        var msgCompFields = gMsgCompose.compFields;
        Recipients2CompFields(msgCompFields);

        if (prefEditHeaders[exteditor_SUBJECT])   content += exteditor_SUBJECT + ":   " + subject + newLine;
        if (prefEditHeaders[exteditor_TO])        content += exteditor_TO + ":        " + msgCompFields.to + newLine;
        if (prefEditHeaders[exteditor_CC])        content += exteditor_CC + ":        " + msgCompFields.cc + newLine;
        if (prefEditHeaders[exteditor_BCC])       content += exteditor_BCC + ":       " + msgCompFields.bcc + newLine;
        if (prefEditHeaders[exteditor_REPLY_TO])  content += exteditor_REPLY_TO + ":  " + msgCompFields.replyTo + newLine;
        if (prefEditHeaders[exteditor_NEWSGROUP]) content += exteditor_NEWSGROUP + ": " + msgCompFields.newsgroups + newLine;
        content += headersEnd;
    }

    if (isEditAsHtml()) {
        // params in http://mxr.mozilla.org/aviarybranch/source/content/base/public/nsIDocumentEncoder.h  (old)
        //    or in  http://mxr.mozilla.org/comm-central/source/mozilla/content/base/public/nsIDocumentEncoder.idl
        content += GetCurrentEditor().outputToString("text/html", 2);
    } else {
        content += GetCurrentEditor().outputToString("text/plain", 0);
    }
    
    setEditorDisabled(true);
    file = tmpFilename(subject, prefEditor83Filename);
    extEditorWriteFile(content, prefEditorUnicode, file);

    var params = new Array(file);
    editorObserver = new extEditorObserver();
    extEditorRunProgram(prefNotifierExe, params, editorObserver); // non blocking call
}


//-----------------------------------------------------------------------------
function updateEditor()
{
    var content = extEditorReadFile(file, prefEditorUnicode);
    extEditorDeleteFile(file);
    
    if (content==null) {
        setEditorDisabled(false);
        return;
    }
    
    try {
        var list = content.split(headersEnd);
        var messageText;

        if (prefEditHeaders[exteditor_GLOBAL]) {
            // if headers edition is activated
            if (list.length==1) {
                messageText = content;
            } else {
                messageText = list[1];
                var headersLines = list[0].split(newLine);
                var headerHash = new Array;
                var headerType = "unknown"; // should never be used
                for (var i = 0; i <headersLines.length; i++) {
                    var whichHeader = headersLines[i].split(":");
                    if (whichHeader.length>=2) {
                        headerType = whichHeader.shift().replace(/\s+/g, "").toLowerCase();
                        // if the subject contains ":", the array has more than 2 members...
                        var headerContent = whichHeader.join(":").replace(/^\s+/, "");
                        if (headerHash[headerType] === undefined) {
                            headerHash[headerType] = headerContent;
                        } else {
                            headerHash[headerType] += ","+headerContent;
                        }
                    } else {
                        // if not only spaces or empty line
                        if (/\w/.test(headersLines[i])) {
                            headerHash[headerType] += ","+headersLines[i];
                        }
                    }
                }

                var subject = headerHash[exteditor_SUBJECT.toLowerCase()];
                if (subject !== undefined) {
                    document.getElementById('msgSubject').value = subject;
                    gMsgCompose.compFields.subject = subject;
                }

                var msgCompFields = gMsgCompose.compFields;

                Recipients2CompFields(msgCompFields);

                if (prefEditHeaders[exteditor_TO])        msgCompFields.to         = headerHash[exteditor_TO.toLowerCase()];
                if (prefEditHeaders[exteditor_CC])        msgCompFields.cc         = headerHash[exteditor_CC.toLowerCase()];
                if (prefEditHeaders[exteditor_BCC])       msgCompFields.bcc        = headerHash[exteditor_BCC.toLowerCase()];
                if (prefEditHeaders[exteditor_REPLY_TO])  msgCompFields.replyTo    = headerHash[exteditor_REPLY_TO.toLowerCase()];
                if (prefEditHeaders[exteditor_NEWSGROUP]) msgCompFields.newsgroups = headerHash[exteditor_NEWSGROUP.toLowerCase()];

                CompFields2Recipients(msgCompFields);
            }
        } else {
            // No headers edition here
            messageText = content;
        }
        // Replace \r\n by \n
        if (osType=="win") {
            messageText = messageText.replace(/\r\n/g, "\n");
        }
    } catch(e) {
         // A message could be displayed her, but I don't wan't to bother with localizations...
    } finally {
        setEditorDisabled(false);
    }

    var editor = GetCurrentEditor();

    if (isEditAsHtml()) {
        editor.rebuildDocumentFromSource("");   // is there a Clear() method somewhere ?
        editor.insertHTML(messageText);
    } else {
        // Don't use rebuildDocumentFromSource() here: it turns the editor in a
        // html mode in  which multiple spaces disapear.
        var wholeDocRange = editor.document.createRange();
        var rootNode = editor.rootElement.QueryInterface(Components.interfaces.nsIDOMNode);
        wholeDocRange.selectNodeContents(rootNode);
        editor.selection.addRange(wholeDocRange);
        try {
            editor.selection.deleteFromDocument();
        } catch(e) {
            // The selection did not exist yet. Everything should be fine
        }
        editor.QueryInterface(Components.interfaces.nsIEditorMailSupport).insertTextWithQuotations(messageText);
    }
}

//-----------------------------------------------------------------------------
function extEditorError(msg) {
    msg = "ExtEditor: " + msg;
    alert(msg);
}

//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------

//-----------------------------------------------------------------------------
function tryCloseExtEditor() {
    if (isEditorDisabled) {
        extEditorError(getLocaleString("CloseYourExternalEditorFirst"));
        return false;
    }
    return true;
}

//-----------------------------------------------------------------------------
function initExteditor() {
    if (window.navigator.platform.toLowerCase().indexOf("win") != -1) {
        dirSeparator = '\\';
        pathSeparator = ';';
        osType = 'win';
        newLine = "\r\n";
    } else {
        dirSeparator = '/';
        pathSeparator = ':';
        osType = 'unix';
        newLine = "\n";
    }

    settingsObserver = new extEditorSettingsObserver();

    var editHtmlAsHtml = nsPreferences.getBoolPref('exteditor.html.editAsHtml', true);
    prefNotifierExe                      = nsPreferences.copyUnicharPref('exteditor.default.editor', "");
    prefEditorUnicode                    = nsPreferences.getBoolPref('exteditor.editor.unicode', true);
    prefEditor83Filename                 = nsPreferences.getBoolPref('exteditor.editor.83filename', false);
    prefEditHeaders[exteditor_GLOBAL]    = nsPreferences.getBoolPref('exteditor.headers.edit', true);
    prefEditHeaders[exteditor_SUBJECT]   = nsPreferences.getBoolPref('exteditor.headers.edit.subject', true);
    prefEditHeaders[exteditor_TO]        = nsPreferences.getBoolPref('exteditor.headers.edit.to', true);
    prefEditHeaders[exteditor_CC]        = nsPreferences.getBoolPref('exteditor.headers.edit.cc', true);
    prefEditHeaders[exteditor_BCC]       = nsPreferences.getBoolPref('exteditor.headers.edit.bcc', true); 
    prefEditHeaders[exteditor_REPLY_TO]  = nsPreferences.getBoolPref('exteditor.headers.edit.replyto', false);
    prefEditHeaders[exteditor_NEWSGROUP] = nsPreferences.getBoolPref('exteditor.headers.edit.newsgroup', false);

    initButton(prefNotifierExe, editHtmlAsHtml);
    headersEnd = "-=-=-=-=-=-=-=-=-=# " + getLocaleString("DontRemoveThisLine") + " #=-=-=-=-=-=-=-=-=-" + newLine;
}

//-----------------------------------------------------------------------------
function savePrefEditHtmlAsHtml(flag) {
    nsPreferences.setBoolPref('exteditor.html.editAsHtml', flag);
}

//-----------------------------------------------------------------------------
function tmpDir() {
    var tmpdir;
    try {
        tmpdir = Components.classes["@mozilla.org/file/directory_service;1"].
	             createInstance(Components.interfaces.nsIProperties).
	             get("TmpD", Components.interfaces.nsIFile).target;
    } catch(e) {
        tmpdir = (osType=='unix') ? "/tmp" : "C:\\Temp" ;
    }
    return tmpdir;
}

//-----------------------------------------------------------------------------
function tmpFilename(str, use83filename) {

    var d = new Date();
    var t = d.getTime();
    var fn = tmpDir() + dirSeparator;
    var basenameLenLimit = 80; // limit basename to X chars (don't use values smaller than t.length)

    if (use83filename) {
        fn += t.toString().substr(-8,8) + ".eml";   // Last 8 chars of the time
    } else {
        if (str=="") {
            str = "Untitled";
        } else {
            str = str.replace(/[\s_]+/g,"_").replace(/[^a-zA-Z0-9_\-חיטכךאהןמצפüû]+/g,'').replace(/_+/g,"_");
        }
        var suffix = "_" + t + ".eml";
        fn += str.substr(0, basenameLenLimit - suffix.length) + suffix;
    }   
    return fn;
}

//-----------------------------------------------------------------------------
function setEditorDisabled(flag) {
    var val = flag ? "true" : "false";
    var list = new Array( 'exteditor_bt'
                        , 'cmd_sendNow'
                        , 'cmd_sendLater'
                        , 'cmd_sendButton'
                        , 'cmd_sendWithCheck'
                        , 'cmd_print'
                        , 'cmd_saveDefault'
                        , 'cmd_saveAsFile'
                        , 'cmd_saveAsTemplate'
                        , 'cmd_spelling'
                        , 'menu_Edit'
                        );
    
    for (var i = 0; i <list.length; i++) {
        var elt = document.getElementById(list[i]);
        // exteditor_bt may not have been drag'n dropped
        // in the messenger compose window toolbar --> undefined
        if (elt!=undefined) {
            elt.setAttribute("disabled", val);
        }
    }

    list = new Array( 'content-frame'
                    , 'addressingWidget'
                    , 'msgSubject'
                    );

    for (var i = 0; i <list.length; i++) {
        var elt = document.getElementById(list[i]);
        // exteditor_bt may not have been drag'n dropped
        // in the messenger compose window toolbar --> undefined
        if (elt!=undefined) {
            elt.setAttribute("collapsed", val);
        }
    }
    
    isEditorDisabled = flag;
}

//-----------------------------------------------------------------------------
function initButton(editorExe, editHtmlAsHtml) {
    var editorName;
    if (/notepad/.test(editorExe)) {
        editorName = "Notepad";
    } else if (/nedit/.test(editorExe)) {
        editorName = "NEdit";
    } else if (/emacs/.test(editorExe)) {
        editorName = "Emacs";
    } else if (/gvim/.test(editorExe)) {
        editorName = "Gvim";
    } else if (/vim/.test(editorExe)) {
        editorName = "Vim";
    } else if (/vi/.test(editorExe)) {
        editorName = "Vi";
    } else {
        editorName= editorExe.substring(editorExe.lastIndexOf(dirSeparator)+1, editorExe.length);
        editorName = editorName.replace(/"/g, "");
        if (osType=="win") {
            editorName = editorName.replace(/\.(exe|EXE)$/, "");
        }
    }
    
        var bt = document.getElementById('exteditor_bt');
        // The External editor button has not been drag'n dropped
        // in the messenger compose window toolbar.
        // The user may prefer typing Ctrl-E and not see the button...
        if (bt!=undefined) {
            bt.setAttribute("label", editorName);
            // Hide or show the HTML dropdown menu
            if (IsHTMLEditor()) {
                bt.setAttribute("type", "menu-button");
            } else {
                bt.removeAttribute("type");
            }
            // select the item menu according to the preference
            if (editHtmlAsHtml!=undefined) {
                document.getElementById('exteditor_editAsHtml').setAttribute('checked', editHtmlAsHtml);
                document.getElementById('exteditor_editAsPlain').setAttribute('checked', ! editHtmlAsHtml);
            }
        }

}

//-----------------------------------------------------------------------------
function isEditAsHtml() {
    // why is this checked attribute returned as a string rather than as a bool ???
    return (
        IsHTMLEditor() && 
        document.getElementById('exteditor_editAsHtml').getAttribute('checked') == "true"
    );
}

//-----------------------------------------------------------------------------
function extEditorDeleteFile(filename) {
    var file = Components.classes["@mozilla.org/file/local;1"].
               createInstance(Components.interfaces.nsILocalFile);
    file.initWithPath(filename);
    if (file.exists()) {
        try {
            file.remove(false);
        }
        catch (e) {
            extEditorError(getLocaleString("CantDeleteFile") + " '" + file.path + "': " + e);
        }
    }
}

//-----------------------------------------------------------------------------
function extEditorWriteFile(data, isUnicode, filename) {
    try {
        var file = Components.classes["@mozilla.org/file/local;1"].
                   createInstance(Components.interfaces.nsILocalFile);
        file.initWithPath(filename);
        try {
            /* raises an error if the file already exists */
            file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0600);
        }
        catch (e) { 
            extEditorError(getLocaleString("CantCreateTmpFile") + " '" + filename + "': " + e);
            return false;
        }
        
        if (isUnicode) {
            var uc = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].
                     createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
            uc.charset = "UTF-8";
            var data = uc.ConvertFromUnicode(data);
        }
        var stream = Components.classes["@mozilla.org/network/file-output-stream;1"].
                     createInstance(Components.interfaces.nsIFileOutputStream);
        var PR_WRONLY = 0x02;
        stream.init(file, PR_WRONLY, 0600, 0);
        stream.write(data, data.length);
        stream.flush()
        stream.close();
    }
    catch (e) {
        extEditorError(getLocaleString("CantWriteFile") + " '" + filename + "': " + e);
        return false;
    }
    return true;
}

//-----------------------------------------------------------------------------
function extEditorReadFile(filename, isUnicode) {
    var MODE_RDONLY = 0x01;
    var PERM_IRUSR = 00400;
    
    try {
        var file = Components.classes["@mozilla.org/file/local;1"].
                   createInstance(Components.interfaces.nsILocalFile);
        file.initWithPath(filename);
        if (file.exists() && file.isReadable()) {
            var is = Components.classes["@mozilla.org/network/file-input-stream;1"].
                     createInstance(Components.interfaces.nsIFileInputStream);
            is.init(file, MODE_RDONLY, PERM_IRUSR, 0);
            var sis = Components.classes["@mozilla.org/scriptableinputstream;1"].
                createInstance(Components.interfaces.nsIScriptableInputStream);
            sis.init(is);
            var data = sis.read(sis.available());
            sis.close();
            is.close();

            if (isUnicode) {
                var uc = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].
                         createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
                uc.charset = "UTF-8";
                try {
                    data = uc.ConvertToUnicode(data);
                } catch (e) {
                    extEditorError(getLocaleString("CouldNotConvertFromUnicode"));
                }
            }
            return data;
        }
        else {
            extEditorError(getLocaleString("TmpFileDoesntExistOrNotReadable") + ": '" + filename + "'");
            return null;
        }
    }
    catch (e) {
        extEditorError(getLocaleString("CantReadFile") + " '" + filename + "': " + e);
    }
    return null;
}

//-----------------------------------------------------------------------------
function extEditorRunProgram(executable, args, observer) {
    if (executable == null) {
        return false; // no command is set
    }

    var list = analyzeCmdLine(executable);
    executable = list.shift().replace(/(^\s+)|(\s+$)/g,'');
    while(list.length>0) args.unshift(list.pop());

    // Special handling of vb or java scripts
    if (osType=="win" && /\.(vbs|js)$/.test(executable)) {
        args.unshift(executable);
        executable = "wscript.exe";
    }

    // replace any null or undefined value by an empty string
    for (i = 0; i < args.length; i++) { 
        if (args[i]==null || args[i]==undefined) {
            args[i]="";
        }
    }

    try {
        var exec = Components.classes["@mozilla.org/file/local;1"].
                   createInstance(Components.interfaces.nsILocalFile);
        var pr = Components.classes["@mozilla.org/process/util;1"].
                 createInstance(Components.interfaces.nsIProcess);

        // If executable is an absolute path, run it or fail.  If not, then
        // look for it in $PATH.
        if (executable.indexOf(dirSeparator)!=-1) {
            exec.initWithPath(executable);
            if (! exec.exists()) {
                extEditorError(getLocaleString("ExeDoesntExist") + ": '" + executable + "'");
                return false;
            }
        } else {
            try {
                var env = Components.classes["@mozilla.org/process/environment;1"].
                          getService(Components.interfaces.nsIEnvironment);
                var path = env.get("PATH").split(pathSeparator);
                var found = false;
                for (i = 0; i < path.length; i++) {
                    try {
                        exec.initWithPath(path[i]);
                        exec.appendRelativePath(executable);
                        if (exec.exists()) {
                            found = true;
                            break;
                        }
                    } catch (e) {
                        // do nothing
                    }
                }
            } catch (e) {
                // do nothing
            }
            if (!found) {
                extEditorError(getLocaleString("ExeNotInPath") + ": '" + executable + "'");
                return false;
            }
        }

        pr.init(exec);
        pr.runAsync(args, args.length, observer);
    }
    catch (e) {
        extEditorError(getLocaleString("CantRunExe") + ": '" + 
                   executable + "' (args: " + args.join(" ") + "): " + e);
        return false;
    }
    return true;
}


//-----------------------------------------------------------------------------
// Parses a cmd line and return a list of tokens:
//  - tokens are created from the line split on spaces
//  - spaces inside quotes don't split the line
//-----------------------------------------------------------------------------
function analyzeCmdLine(str)
{
    var args = new Array;
    str = str.replace(/\s+/, " ");
    var quote = "";
    var buffer = "";
    
    for (var i=0; i< str.length; i++) {
        var car = str[i];
        switch (car) {
            case "'":
            case '"':
                if (quote=="") {
                    quote = car;
                } else {
                    args.push(buffer);
                    buffer = "";
                    quote = "";
                }
                break;
            case " ":
                if (quote=="") {
                    if (buffer!="") {
                        args.push(buffer);
                        buffer = "";
                    }
                } else {
                    buffer += " ";
                }
                break;
            default:
                buffer += car;
                break;
        }
    }
    if (buffer!="") {
        args.push(buffer);
        buffer = "";
    }
    return args;  
}

//-----------------------------------------------------------------------------
function printList(titre, array)
{
    var msg = titre +"\nNb elements: " + array.length + "\n";
    for (i = 0; i < array.length; i++) { 
        msg += "\n" + i + ": " + array[i];
    }
    extEditorError(msg);
}
