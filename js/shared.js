/**
 * Shared Javascript
 * Requires: 
// @require    //cdnjs.cloudflare.com/ajax/libs/jquery/2.1.4/jquery.js
 */

/**
 * jQuery.deparam()
 * is an extraction of the deparam method from Ben Alman's jQuery BBQ
 * http://benalman.com/projects/jquery-bbq-plugin/
 * https://github.com/chrissrogers/jquery-deparam/blob/master/jquery-deparam.js
*/
(function ($) {
  $.deparam = function (querystring, coerce) {
    var re = /^([^=]*)(?:=(.*))?$/;
    var obj = {},
        coerce_types = { 'true': !0, 'false': !1, 'null': null };
    if (querystring[0] == '?')
      querystring = querystring.substring(1);
    var pairs = querystring.replace(/\+/g, ' ').split(/&|;/);
      
    // Iterate over all name=value pairs.
    //$.each(pairs, function (i, s) {
    Array.forEach(pairs, function (s, i, arr) {
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
            
          if (Array.isArray(obj[key])) { // $.isArray
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
