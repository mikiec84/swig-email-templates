var swig = require("swig")
  , boostContent = require("boost").boostContent
  , path = require("path")

module.exports = init;
init.createDummyContext = createDummyContext;

function init(options, cb) {
  options = extend({
    root: path.join(__dirname, "templates"),
    allowErrors: true,
  }, options || {});
  swig.init(options);

  cb(null, render, dummyContext);

  function dummyContext(templateName, cb) {
    // compile file into swig template
    compileTemplate(templateName, function(err, template) {
      if (err) return cb(err);
      // return the tokens
      cb(null, createDummyContext(template));
    });
  }
    
  function render(templateName, context, cb) {
    // compile file into swig template
    compileTemplate(templateName, function(err, template) {
      if (err) return cb(err);
      // render template with context
      renderTemplate(template, context, function(err, html) {
        if (err) return cb(err);
        // validate html and inline all css
        boostContent(html, path.join(options.root, templateName), function(err, html) {
          if (err) return cb(err);
          cb(null, html);
        });
      });
    });
  }
}

function compileTemplate(name, cb) {
  try {
    cb(null, swig.compileFile(name + ".html"));
  } catch (err) {
    cb(err);
  }
}

function renderTemplate(template, context, cb) {
  try {
    cb(null, template.render(context));
  } catch (err) {
    cb(err);
  }
}

var owns = {}.hasOwnProperty;
function extend(obj, src) {
  for (var key in src) if (owns.call(src, key)) obj[key] = src[key];
  return obj;
}

var VAR_TOKEN = 2;
var CONTROL_TOKEN = 1;
var varRegex = /^[a-zA-Z_]/;

function createDummyContext(swigTemplate) {
  var results = {};
  iterate(swigTemplate, addVar);
  return results;

  function addVar(name, value) {
    results[name] = value;
  }
}

function iterate(token, addVar) {
  var tokens = token.tokens;
  if (tokens) tokens.forEach(onChild);

  function onChild(child) {
    var type = child.type;
    var addVarException;
    if (type === VAR_TOKEN) {
      addVar(child.name, child.name);
    } else if (child.name === 'for' && type === CONTROL_TOKEN) {
      addVarException = child.args[0];
      addVar(child.args[2], [addVarException]);
      iterate(child, addVarWithException);
    } else if (child.name === 'if' && type === CONTROL_TOKEN) {
      child.args.forEach(addIfVar);
      iterate(child, addVar);
    } else {
      iterate(child, addVar);
    }

    function addVarWithException(name, value) {
      if (name !== addVarException) addVar(name, value);
    }

    function addIfVar(token) {
      if (varRegex.test(token)) {
        addVar(token, token);
      }
    }
  }
}

