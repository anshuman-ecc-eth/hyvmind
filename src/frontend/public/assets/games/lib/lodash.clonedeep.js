/**
 * lodash (Custom Build) - clonedeep
 * https://lodash.com/
 * License: MIT
 */
(function(root,factory){
  if(typeof define==='function'&&define.amd){
    define([],factory);
  }else if(typeof module==='object'&&module.exports){
    module.exports=factory();
  }else{
    root.cloneDeep=factory();
  }
}(this,function(){
  function cloneDeep(value){
    if(typeof value!=='object'||value===null){
      return value;
    }
    if(Array.isArray(value)){
      return value.map(cloneDeep);
    }
    var result={};
    for(var key in value){
      if(Object.prototype.hasOwnProperty.call(value,key)){
        result[key]=cloneDeep(value[key]);
      }
    }
    return result;
  }
  return cloneDeep;
}));
