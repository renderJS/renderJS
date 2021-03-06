/**
 * renderJS module.
 *
 * @module renderJS
*/

(function ( $ ) {


  /*
  *************************************************************************
  Private functions
  *************************************************************************
  */

  /**
  @param {string} f - Function name to run. if exist double underscore at the beginning the data is stored using data from jquery
  @param {jQuery} obj - Object that evaluates the function.
  @param {*} args - Arguments passed to the function, if it's an array elements are passed separately.
  */
  var evaluate = function(f, obj, args){
    if(/^__/.test(f)){
      obj.data(f, args);  //internal stored
      return;
    }
    if(f in obj){
      if(typeof obj[f] === 'function'){
        if(Array.isArray(args)){
          obj[f].apply(obj, args);
        }else{
          obj[f](args);
        }
      }else{
        obj[f] = args;
      }
    }
  };

  /**
  @param {jQuery} obj - Object evaluated.
  @param {Object} properties - Object with properties to be evaluated.
  @param {Object[]} [properties.content] - Array with nested objects.
  @param {string} scenario - Scenario.
  */
  var evaluateProperties = function(obj, properties, scenario){
    for(var k in properties){
      if(k === "content"){
        $(obj).renderJS_obj(properties[k], scenario);
      }else if(k === "renderJS" || k==="renderJS_obj"){
        evaluate(k, $(obj), [properties[k], scenario]);
      }else{
        evaluate(k, $(obj), properties[k]);
      }
    }
  };

  /*
  *************************************************************************
  Traits
  *************************************************************************
  */

  $.renderJS_traits = {};

  $.renderJS_traits.wrap = {
    afterAppend: function(scenario, o){
      var obj = $("<" + o.tag + ">");
      evaluateProperties(obj, o);    //siempre se debe ejecutar luego de que el objeto es creado
      $(this).wrap(obj);
    }
  };

  $.renderJS_traits.wrapdiv = {
    afterAppend: function(scenario, o){
      var div = $("<div>");
      evaluateProperties(div, o);    //siempre se debe ejecutar luego de que el objeto es creado
      $(this).wrap(div);
    }
  };

  $.renderJS_traits.labeled = {
    afterAppend: function(scenario, o){
      var lbl = $("<label>");
      evaluateProperties(lbl, o);
      $(this).wrap(lbl);
    }
  };

  /*
  *************************************************************************
  Shortcuts
  *************************************************************************
  */
  $.renderJS_shortcuts = {};

  //initializing shortcuts forms
  var shortcutstemp = ["hidden", "text", "password", "submit", "button", "checkbox", "radio",
                       "color", "date", "datetime", "datetime-local", "email", "month",
                       "number", "range", "search", "tel", "time", "url", "week"];

  for(k in shortcutstemp){
    $.renderJS_shortcuts[shortcutstemp[k]] = {
      tag: "input",
      attr: {
        type: shortcutstemp[k],
      }
    };
  }

  //select has "options" argument for ease of use
  $.renderJS_shortcuts.select = {
    tag: "select",
    afterCreate: function(obj, scenario){
      if(obj.options){
        for(var k in obj.options){
          $("<option>").text(obj.options[k])
                       .val(k)
                       .appendTo(this);
        }
      }
    },
  };

  $.renderJS_shortcuts.center = {
    tag: "div",
    afterAppend: function(scenario){
      var w = $(this).parents().first().width();
      var div = $("<div>").attr("style", "display: -webkit-flex; display: flex")
                          .css({
                            "position": "relative",
                            "top": "50%",
                            "left": "50%",
                            "width": (w/2) + "px",
                            "margin": "0 0 0 -" + (w/4) + "px",
                            "height": "0px",
                            "justify-content": "center",
                            "align-items": "center",
                          });
      $(this).wrap(div);
    }
  }
  
  /*
  $.renderJS_shortcuts.optionGroup = {
    beforeCreate: function(scenario){
      var re = /^([a-zA-Z0-9_]+)(#([a-zA-Z0-9_][a-zA-Z0-9_\.\-]*))?(\[([a-zA-Z_][a-zA-Z0-9_\.\-]*=[^,=]+(,[a-zA-Z_][a-zA-Z0-9_\.\-]*=[^,=]+)*)\])?$/; 
      var m = re.exec(this.type);
      var rtype = Boolean(m[4])?m[4]:"";
      var v = [];
      for(k in this.options){
        var newobj = jQuery.extend(true, {}, this);  //deep copy
        var sid = "";
        if(!Array.isArray(this.options)){
          sid = "#" + k;
        }
        newobj.type = "radio" + sid + rtype;
        delete newobj.options;
        
        var t = this.options;
        var oldAfterAppend = Boolean(newobj.afterAppend) ? newobj.afterAppend: null;
        newobj.afterAppend = function(scenario){
          if(Array.isArray(t)){
            $(this).after(t[$("input[name=" + $(this).attr("name") + "]").length-1]); //TODO: fail, falla si hay mas controles con el mismo nombre
          }else{
            $(this).after(t[$(this).attr("id")]);
          }
          if(oldAfterAppend) oldAfterAppend.call(this, scenario);
        }

        var o = $.renderJS_obj(newobj, scenario);
        v.push(o);
      }
      return v;
    }
  };*/

  //end initialice

  var appendObj = function(container, obj, scenario){
    if(Array.isArray(obj)){
      for(i in obj){
        appendObj(container, obj[i], scenario);
      }
    }else{
      obj.appendTo(container);
      if(obj.data("afterAppend")){
        obj.data("afterAppend").call(obj, scenario);
      }
    }
  };

  $.fn.renderJS_obj = function(obj, scenario){
    this.each(function(){
      var newobj = $.renderJS_obj(obj, scenario);
      appendObj($(this), newobj, scenario);
    });
    return this;
  };
  
  /*
  Funcion para renderizar un objeto y añadirlo al contenedor, es oblitatorio
  que el objeto (parametro obj) a renderizar tenga la propiedad type
  (ver ejemplos en XXX)

  añadido escenarios XD .... realmente me gusta eso
  */
  $.renderJS_obj = function(obj, scenario){

    var v = [];

    if(Array.isArray(obj)){
      for(var k in obj){
        var newobj = $.renderJS_obj(obj[k], scenario);
        if(newobj){
          v.push(newobj);
        }
      }
      return v;
    }else{
      if(typeof obj === 'string'){ 
        return $(document.createTextNode(obj));
      }else{
        //Example of valid type: mytype#myid[attr_1=val_1,attr_2=val_2]
        var re = /^([a-zA-Z0-9_]+)(#([a-zA-Z0-9_][a-zA-Z0-9_\.\-]*))?(\[([a-zA-Z_][a-zA-Z0-9_\.\-]*=[^,=]+(,[a-zA-Z_][a-zA-Z0-9_\.\-]*=[^,=]+)*)\])?$/; 
        var m = re.exec(obj.type);
        var type = m[1];
        var id = m[3];
        var sattr = m[5];

        //añadimos los traits
        if(Boolean(obj.traits) && Object.keys(obj.traits).length > 0){
          
          //si el tipo es un extends no se agregan aca, si no cuando se llama en la generalización
          if(!(type in $.renderJS_shortcuts && Boolean($.renderJS_shortcuts[type].extend))){
          
            var oldBeforeCreate = obj.beforeCreate;
            var oldAfterCreate = obj.afterCreate;
            var oldAfterAppend = obj.afterAppend;
            
            var vBeforeCreate = [];
            var vAfterCreate = [];
            var vAfterAppend = [];
            
            for(var kt in obj.traits){
              var trait = $.renderJS_traits[kt];
              if(trait.beforeCreate){
                vBeforeCreate.push([trait.beforeCreate, obj.traits[kt]]);
              }
              if(trait.afterCreate){
                vAfterCreate.push([trait.afterCreate, obj.traits[kt]]);
              }
              if(trait.afterAppend){
                vAfterAppend.push([trait.afterAppend, obj.traits[kt]]);
              }
            }
            obj.beforeCreate = (function ( e ) {
              return function(scenario){
                var rta = true;
                for(var i in vBeforeCreate){
                  rta &= vBeforeCreate[i][0].call(this, scenario, vBeforeCreate[i][1]);
                }
                if(e){
                  rta &= e.call(this, scenario);
                }
                return rta;
              };
            }( oldBeforeCreate ));
            obj.afterCreate = (function ( e ) {
              return function(obj, scenario){
                for(var i in vAfterCreate){
                  vAfterCreate[i][0].call(this, obj, scenario, vAfterCreate[i][1]);
                }
                if(oldAfterCreate){
                  oldAfterCreate.call(this, obj, scenario);
                }
              };
            }( oldAfterCreate ));
            obj.afterAppend = (function ( e ) {
              return function(scenario){
                for(var i in vAfterAppend){
                  vAfterAppend[i][0].call(this, scenario, vAfterAppend[i][1]);
                }
                if(e){
                  e.call(this, scenario);
                }
              };
            }( oldAfterAppend ));
          }
        }

        //Si beforeCreate retorna falso no se crea el objeto
        if(Boolean(obj.beforeCreate) && !obj.beforeCreate.call(obj, scenario)){
          return;
        }
        //Si el scenario no es uno de los scenarios para el control no se crea
        if(Boolean(obj.scenarios) && obj.scenarios.indexOf(scenario) === -1){
          return;
        }
        
        //TODO: revisar tambien update anque no hace parte de render :(
        //TODO
        //                user  shortcut      extend
        //                      user   sc   user sc extend
        //beforeCreate     OK    OK1   *2     OK1 *2  OK3
        //afterCreate      OK    OK2   OK1    OK2 OK1 OK3
        //afterAppend      OK    OK2   OK1    OK2 OK1 OK3
        //
        // (*) en este caso si existe, retorna los objetos creados :( .... para mi esta mal
        // si retorna objetos creados, se regresan, si retorna true sigue y si retorna false no
        // retorna nada
        //

        //Si el shortcut extiende de otro tipo se crea el objeto de este tipo y luego
        //se ejecutan sus propiedades
        if(type in $.renderJS_shortcuts && Boolean($.renderJS_shortcuts[type].extend)){
          var cloneobj = jQuery.extend(true, {}, obj);  //deep copy
          cloneobj.type = $.renderJS_shortcuts[type].extend + (Boolean(m[2])?m[2]:"") + (Boolean(m[4])?m[4]:"");
          
          //Si el beforeCreate retorna falso no se crea el objeto
          if(Boolean($.renderJS_shortcuts[type].beforeCreate) && !$.renderJS_shortcuts[type].beforeCreate.call(obj, scenario)){
            return;
          }
          var newobj = $.renderJS_obj(cloneobj, scenario);
          evaluateProperties(newobj, $.renderJS_shortcuts[type], scenario);

          if($.renderJS_shortcuts[type].afterCreate){
            $.renderJS_shortcuts[type].afterCreate.call(newobj, obj, scenario);
          }

          if($.renderJS_shortcuts[type].afterAppend){
            if(newobj.data("afterAppend")){
              var oldAfterAppend = newobj.data("afterAppend");
              newobj.data("afterAppend", function(scenario){
                oldAfterAppend.call(this, scenario);
                $.renderJS_shortcuts[type].afterAppend.call(this, scenario);
              });
            }else{
              newobj.data("afterAppend", $.renderJS_shortcuts[type].afterAppend);
            }
          }
          return newobj;
        }

        var tag = (type in $.renderJS_shortcuts) ? $.renderJS_shortcuts[type].tag : type;

        if(type in $.renderJS_shortcuts && Boolean($.renderJS_shortcuts[type].beforeCreate)){
          var rta = $.renderJS_shortcuts[type].beforeCreate.call(obj, scenario);
          //si retorna un objeto, se retorna este objeto y no continua
          //TODO: aca hay un grave error que pasa con los eventos after create y afterappend??
          if(typeof rta === 'object') return rta; 
          if(rta === false) return;
        }

        var newobj = $("<" + tag + ">");

        //Si el tipo es un shortcut entonces hay que construir tambien su esquema
        //y ejecutamos el evento aftercreate por si lo tiene.
        if($.renderJS_shortcuts[type]){
          evaluateProperties(newobj, $.renderJS_shortcuts[type], scenario);
          if($.renderJS_shortcuts[type].afterCreate){
            $.renderJS_shortcuts[type].afterCreate.call(newobj, obj, scenario);
          }
          if($.renderJS_shortcuts[type].afterAppend){
            newobj.data("afterAppend", $.renderJS_shortcuts[type].afterAppend);
          }
        }
        evaluateProperties(newobj, obj, scenario);

        //Asignación de atributos dados en la cadena del type, estos valores tienen
        //prioridad
        if(sattr){
          var vattr = sattr.split(",");
          for(i in vattr){
            var p = vattr[i].split("=");
            newobj.attr(p[0], p[1]);
          }
        }
        if(id) newobj.attr("id", id);

        if(obj.afterCreate){
          obj.afterCreate.call(newobj, obj, scenario);
        }
        if(obj.afterAppend){
          //si ya se creo el evento, debido al shortcut
          if(newobj.data("afterAppend")){
            var oldAfterAppend = newobj.data("afterAppend");
            newobj.data("afterAppend", function(scenario){
              oldAfterAppend.call(this, scenario);
              obj.afterAppend.call(this, scenario);
            });
          }else{
            newobj.data("afterAppend", obj.afterAppend);
          }
        }
        return newobj;
      }
    }
  };

  var _pass_parameters = function(obj, options){
    for(var k in obj){
      if(k === "renderJS"){
        if(options.params){
          obj.renderJS.params = options.params;
        }
      }
      if(typeof obj[k] === 'object' && obj[k]!=null && !(obj instanceof jQuery) && !(obj instanceof HTMLElement)){
        _pass_parameters(obj[k], options);
      }
    }
  }

  $.fn.renderJS = function(options, scenario){
    this.each(function(){
      $.renderJS($(this), options, scenario);
    });
    return this;
  };
  
  $.renderJS = function(container, options, scenario){
    if( ! (options.params)) options.params = {};
    var cloneoptions = jQuery.extend(true, {}, options);  //deep copy
    if( ! (cloneoptions.cache)) cloneoptions.cache = false;
    if( ! (cloneoptions.dataType)) cloneoptions.dataType = "text";
    
    //Recordando el metodo success, si se requiere se ejecuta luego
    var oldSuccess = Boolean(cloneoptions.success) ? cloneoptions.success: null;

    cloneoptions.success = function(data, textStatus, jqXHR){
      if(cloneoptions.render){
        for(k in cloneoptions.render){
          data = data.replace(new RegExp("%" + k + "%", 'g'), cloneoptions.render[k]);
        }
      }
      eval("var foo = " + data);
      _pass_parameters(foo, cloneoptions);
      $(container).renderJS_obj(foo, scenario);

      //TODO: No es necesario en mi opinion
      //ejecutamos el metodo success del usuario añadiendo contenedor y scenario
      //al objeto this
      //this.container = $(container);
      //this.scenario = scenario;
      if(oldSuccess) oldSuccess.call(this, data, textStatus, jqXHR);
    };
    $.ajax(cloneoptions);
  };

}( jQuery ));
