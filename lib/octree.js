window.nodes    = [];
window.maxlevel = 2; 
window.root     = -1;

function createOcree() {
    "use strict";
    var origin = new Vec3(0, 0, 0);
    var size   = 10;
    root       = new Node(origin, size, 0);
    root.subdivide();
}

function createOcreeGeometry() {
    window.octreeVertices = [];
    root.getOctreeVertices(octreeVertices);
}

function OctreeRenderer(ctx) {
    this.ctx = ctx;
    this.view_matrix = -1;
    this.projection  = -1;
    this.buffer      = [];
    this.program     = this.createProgram();
}

OctreeRenderer.prototype.createProgram = function() {
    var vertex_shader = 
    "attribute vec3 pos;" +
    "uniform mat4 projection;" +
    "uniform mat4 view;" +
    "" +
    "void main() {" +
    "    gl_Position = projection * view * vec4(pos, 1.0);" +
    "}";

    var Program = createProgramFromSource(vertex_shader, "isfrag", this.ctx);
	Program.a1  = gl.getAttribLocation(Program, "pos");
	Program.a2  = gl.getAttribLocation(Program, "coord");
      
	Program.buffer = gl.createBuffer();
    this.program = Program;
};