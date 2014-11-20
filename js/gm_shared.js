/**
 * Shared Javascript for GreaseMonkey scripts
 * Requires: 
// @grant      GM_xmlhttpRequest
// @require    //cdnjs.cloudflare.com/ajax/libs/jquery/2.1.1/jquery.js
 */

// @require    //cdnjs.cloudflare.com/ajax/libs/q.js/1.0.1/q.js
// Q.longStackSupport = true;


/**
 * Execute arbitrary string s as javascript in content context.
 */
function content_exec(s, encapsulated) {
  if (typeof encapsulated == 'undefined')
    encapsulated = true;
  try {
    var script = document.createElement('script');
    script.setAttribute("type", "application/javascript");
    if (encapsulated)
      script.textContent = "(function(){\n" + s + "\n})();";
    else
      script.textContent = s;
    setTimeout(function() {
      document.body.appendChild(script);
      document.body.removeChild(script);
      }, 0);
    return script;
  } catch (e) {
    console.error(e);
  }
  return false;
}


/**
 * Emulate throwing an exception inside a promise chain by return a pre-rejected promise.
 */
var deferred_throw;
(function($) {
  deferred_throw = function(s) {
    var p = $.Deferred();
    p.reject(s);
    return p.promise();
  };
})(jQuery);

/**
 * jQuery Cross-site JSON AJAX Transport
 */
var GM_ajaxTransport;
(function($) {
  GM_ajaxTransport = function(op, oo, jqXHR) {
    var gmXHR = {
      'send': function(headers, completeCallback) {
        var opts = {
          'method': op.type,
          'url': op.url,
          'headers': headers,
          'onload': function(r) {
            // success
            // if (this.aborted) return;
            if (op.gm_debug)
              console.debug('onload', op, r);
            completeCallback(r.status, r.statusText, { 'text': r.responseText }, r.responseHeaders);
          },
          'onerror': function(r) {
            if (op.gm_debug)
              console.debug('onerror', op, r);
            completeCallback(r.status, r.statusText, { 'text': r.responseText }, r.responseHeaders);
          },
          'onabort': function(r) {
            if (op.gm_debug)
              console.debug('onabort', op, r);
            completeCallback(r.status, r.statusText, { 'text': r.responseText }, r.responseHeaders);
          },
          'ontimeout': function(r) {
            if (op.gm_debug)
              console.debug('ontimeout', op, r);
            completeCallback(r.status, r.statusText, { 'text': r.responseText }, r.responseHeaders);
          },
          'onprogress': function(r) {
            if (op.gm_debug)
              console.debug('onprogress', op, r);
          },
          'onreadystatechange': function(r) {
            if (op.gm_debug)
              console.debug('onreadystatechange', op, r);
          },
          };
        if (typeof op.data == 'object')
          opts['data'] = $.param(op.data);
        if (typeof op.data == 'string')
          opts['data'] = op.data;
        if (typeof op.mimeType != 'undefined')
          opts['overrideMimeType'] = op.mimeType;
        if (typeof op.username != 'undefined')
          opts['user'] = op.username;
        if (typeof op.password != 'undefined')
          opts['password'] = op.password;
        if (typeof op.timeout != 'undefined')
          opts['timeout'] = op.timeout;
        gmXHR.xhr = GM_xmlhttpRequest(opts);
      },
      'abort': function() {
        gmXHR.aborted = true;
        gmXHR.xhr.abort();
      },
      'aborted': false,
      };
    return gmXHR;
  };
  
  $.ajaxTransport('xsjson', GM_ajaxTransport);
  $.ajaxTransport('xsjs', GM_ajaxTransport);
  $.ajaxSetup({
    'converters': {
      'text xsjson': $.parseJSON,
      'text xsjs': true,
      },
  });
})(jQuery);

/**
 * jQuery.deparam()
 * is an extraction of the deparam method from Ben Alman's jQuery BBQ
 * http://benalman.com/projects/jquery-bbq-plugin/
 * https://github.com/chrissrogers/jquery-deparam/blob/master/jquery-deparam.js
*/
(function ($) {
  jQuery.deparam = function (querystring, coerce) {
    var re = /^([^=]*)(?:=(.*))?$/;
    var obj = {},
        coerce_types = { 'true': !0, 'false': !1, 'null': null };
    if (querystring[0] == '?')
      querystring = querystring.substring(1);
    var pairs = querystring.replace(/\+/g, ' ').split(/&|;/);
      
    // Iterate over all name=value pairs.
    jQuery.each(pairs, function (i, s) {
      var pair = re.exec(s),
          key = decodeURIComponent(pair[1]),
          // If key is more complex than 'foo', like 'a[]' or 'a[b][c]', split it
          // into its component parts.
          keys = key.split(']['),
          keys_last = keys.length - 1;      
      // If the first keys part contains [ and the last ends with ], then []
      // are correctly balanced.
      if (keys[0].contains('[') && keys[keys_last].endsWith(']')) {
        // Remove the trailing ] from the last keys part.
        keys[keys_last] = keys[keys_last].replace(/\]$/, '');
        // Split first keys part into two parts on the [ and add them back onto
        // the beginning of the keys array.
        keys = keys.shift().split('[').concat(keys);
        keys_last = keys.length - 1;
      } else {
        // Basic 'foo' style key.
        keys_last = 0;
      }
        
      // Are we dealing with a name=value pair, or just a name?
      if (typeof pair[2] != 'undefined') {
        var val = decodeURIComponent(pair[2]);
          
        // Coerce values.
        if (coerce) {
          val = val && !isNaN(val) ? +val // number
              : val === 'undefined' ? undefined // undefined
              : coerce_types[val] !== undefined ? coerce_types[val] // true, false, null
              : val; // string
        }
          
        if (keys_last) {
          // Complex key, build deep object structure based on a few rules:
          // * The 'cur' pointer starts at the object top-level.
          // * [] = array push (n is set to array length), [n] = array if n is
          // numeric, otherwise object.
          // * If at the last keys part, set the value.
          // * For each keys part, if the current level is undefined create an
          // object or array based on the type of the next keys part.
          // * Move the 'cur' pointer to the next level.
          // * Rinse & repeat.
          var cur = obj;
          for (var j = 0; j <= keys_last; ++j) {
            key = keys[j] === '' ? cur.length : keys[j];
            cur = cur[key] = j < keys_last
              ? cur[key] || (keys[j + 1] && isNaN(keys[j + 1]) ? {} : [])
              : val;
          }
        } else {
          // Simple key, even simpler rules, since only scalars and shallow
          // arrays are allowed.
            
          if (jQuery.isArray(obj[key])) {
            // val is already an array, so push on the next value.
            obj[key].push(val);
              
          } else if (typeof obj[key] != 'undefined') {
            // val isn't an array, but since a second value has been specified,
            // convert val into an array.
            obj[key] = [obj[key], val];
              
          } else {
            // val is a scalar.
            obj[key] = val;
          }
        }
          
      } else if (key) {
        // No value was defined, so set something meaningful.
        obj[key] = coerce
          ? undefined
          : '';
      }
    });
      
    return obj;
  };
})(jQuery);


/**
 * Canonicalize a query string (alphabetize keys)
 */
var canonical_url;
(function($) {
  canonical_url = function(u) {
    if (u.indexOf('?') < 0)
      return u;
    var s = u.substring(u.indexOf('?'));
    s = s.replace(';', '&');
    var o = $.deparam(s);
    var p = {};
    Object.keys(o)
      .map(function(e, i, a) { return [e, o[e]]; })
      .sort()
      .forEach(function(e, i, a){ p[e[0]] = e[1]; })
      ;
    if (p.action == 'view' && typeof p.view != 'undefined')
      delete p.view;
    return u.substring(0, u.indexOf('?')) + '?' + $.param(p);
  };
})(jQuery);


/**
 * Javascript dynamic loader for Greasemonkey.
 * 
 */
var GM_require;
(function($) {
  /**
   * GM_require('<url>');
   * 
   * If the module is in the cache, return the cached copy (as a promise)
   * Retrieve the URL (GM_XHR)
   * eval()
   * Update cache
   */
  GM_require = function(u) {
    try {
      var m = GM_require.cache[u];
      if (typeof m != 'undefined')
        return m;

      var p = $.ajax(u, {
          'dataType': 'xsjs',
          'headers': { 'Accept': 'application/javascript;q=0.9,*/*;q=0.8', },
          })
        .then(function(s, t, jqXHR){
          GM_require.cache[u] = $.when(GM_require.loadSource(u, s));
          return GM_require.cache[u];
        }, function(jqXHR, t, e){
          console.error(e);
          return undefined;
        });
      return p;
    } catch (e) {
      console.error('Exception thrown in GM_require()');
      console.error(e);
    }
  };

  GM_require.cache = { };

  GM_require.loadSource = function(u, s) {
    try {
      return eval(s);
    } catch (err) {
      throw 'GM_require.loadSource(): eval of module ' + u + ' failed: ' + err.message;
    }
    return null;
  };
})(jQuery);
