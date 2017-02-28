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


    window.projection = mat4.create();
    window.view       = mat4.create();
    projection        = mat4.perspective(projection, 45, innerWidth / innerHeight, 0.1, 100);

    window.camera = new createCamera();
    window.camera.pos = [0, 5, 20];

    console.time("performance");
    window.octree = new Octree(new Vec3(-5, -5, -5), 10, 5);
    octree.isosurface(function(x,y,z) {

        // var result = 7 * Math.cos(x) - 6 * Math.sin(x * y) * 3 + 10* Math.cos(z * z); /* - 5 * Math.tan(z * z * z * x);*/
        var result = Math.sin(x) + Math.cos(z) - y;
        // var result = Math.sin(x) + Math.cos(z) - Math.tan(y);
        // var result = Math.exp(Math.sin(x) + Math.cos(y)) - Math.sin(Math.exp(x+y)) + Math.tan(z) * z * z;

        return result;
    });

    window.octreeRenderer = new OctreeRenderer(gl, octree);
    octreeRenderer.createOctreeWireframeGeometry();
    octreeRenderer.createOctreePointsGeometry();
    octreeRenderer.createOctreeMeshGeometry();
    octreeRenderer.projection = projection;
    octreeRenderer.view       = view;

    console.timeEnd("performance");


    requestAnimationFrame(draw);
}

var then = 0;
function draw(now) {
    requestAnimationFrame(draw);
    now *= 0.001;
    var deltatime = now - then;
    then = now;

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    octreeRenderer.view = camera.getViewMatrix(deltatime, 0.3);
    // octreeRenderer.drawOctreeWireFrame();
    // octreeRenderer.drawOctreePoints();
    octreeRenderer.drawOctreeMesh();
}