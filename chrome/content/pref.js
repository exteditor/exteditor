// This needs: chrome://global/content/nsUserSettings.js

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
        alert("Cannot get the localized string bundle: " + e);
    }

    return null;
}

//-----------------------------------------------------------------------------
function AFgetPrefString(objId) {
    var obj = document.getElementById(objId);
    return obj.getAttribute("prefstring");
}

//-----------------------------------------------------------------------------
function AFreadPref(prefStr, defValue) {
    var typ = nsPreferences.mPrefService.getPrefType(prefStr);
    if (typ & 128) {
        return nsPreferences.getBoolPref(prefStr, defValue);
    } else if (typ & 64) {
        return nsPreferences.getIntPref(prefStr, defValue);
    } else if (typ & 32) {
        return nsPreferences.copyUnicharPref(prefStr, defValue);
    } else {
        alert(prefStr + ": " + getLocaleString("PrefTypeNotSupported") + ": " + typ);
    }
}

//-----------------------------------------------------------------------------
function AFreadObjPref(objId, defValue) {
    var obj = document.getElementById(objId);
    var atr = obj.getAttribute("prefattribute");

    if (atr=="") return;

    var val = AFgetObjPref(objId, defValue);
    eval("obj."+atr+"=val");
}

//-----------------------------------------------------------------------------
function AFgetObjPref(objId, defValue) {
    var obj = document.getElementById(objId);
    var typ = obj.getAttribute("preftype");
    var atr = obj.getAttribute("prefattribute");
    var str = obj.getAttribute("prefstring");

    if ((typ=="")||(atr=="")||(str=="")) return;

    var val;
    if (typ=="bool") {
        val=nsPreferences.getBoolPref(str, defValue);
    } else if (typ=="int") {
        val=nsPreferences.getIntPref(str, defValue);
    } else if (typ=="string") {
        val=nsPreferences.copyUnicharPref(str, defValue);
    } else {
        alert(objId + ": " + getLocaleString("PrefTypeNotSupported") + ": " + typ);
        return;
    }
    return val;
}

//-----------------------------------------------------------------------------
function AFwriteObjPref(objId) {
    var obj = document.getElementById(objId);
    var typ = obj.getAttribute("preftype");
    var atr = obj.getAttribute("prefattribute");
    var str = obj.getAttribute("prefstring");

    if ((typ=="")||(atr=="")||(str=="")) return;

    var val;
    eval("val=obj."+atr);

    if (typ=="bool") {
        nsPreferences.setBoolPref(str, val);
    } else if (typ=="int") {
        nsPreferences.setIntPref(str, val);
    } else if (typ=="string") {
        nsPreferences.setUnicharPref(str, val);
    } else {
        alert(objId + ": " + getLocaleString("PrefTypeNotSupported") + ": " + typ);
        return;
    }
}
