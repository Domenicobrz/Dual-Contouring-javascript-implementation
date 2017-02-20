window.addEventListener("load", Start);

function Start() {
    "use strict";
    var canvas = document.getElementById("canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    window.gl = canvas.getContext('experimental-webgl');
    var names = ["webgl", "experimental-webgl", "webkit-3d", "mozwebgl"];

    for(var i in names)
    {
        try 
        {
            gl = canvas.getContext(names[i], {stencil: true, premultipliedAlpha: false});
  
            if (gl && typeof gl.getParameter == "function") 
            {
                /* WebGL is enabled */
                break;
            }
        } catch(e) { }
    }

    createOcree();
    createOcreeGeometry();
}