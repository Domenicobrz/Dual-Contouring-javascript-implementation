function Octree(origin, size, maxlevel) {
    "use strict";
    this.origin = origin;
    this.size   = size;
    this.maxlevel = maxlevel;

    this.rootNode = new Node(origin, size, 0);
    this.rootNode.subdivide(maxlevel);
}







function OctreeRenderer(ctx) {
    this.ctx = ctx;
    
    this.view        = -1;
    this.projection  = -1;

    this.buffer      = [];
    this.program     = this.createProgram();
    this.num_verts   = -1;
}

OctreeRenderer.prototype.createProgram = function() {
    "use strict";

    var vertex_shader = 
    "attribute vec3 pos;" +
    "uniform mat4 projection;" +
    "uniform mat4 view;" +
    "" +
    "varying float depth;" +
    "" +
    "void main() {" +
    "    vec4 ndcpos = projection * view * vec4(pos, 1.0);" +
    "    gl_Position = ndcpos;" +
    "    depth       = pow(pos.z / 10.0, 2.0) * 0.8 + 0.2;" +
    "}";

    var fragment_shader = 
    "precision mediump float;" +
    "" +
    "varying float depth;" +
    "" +
    "void main() {" +
    "    gl_FragColor = vec4(vec3(depth, depth, depth), 1.0);" +
    "}";

    var Program = createProgramFromSource(vertex_shader, fragment_shader, this.ctx);
	Program.a1  = this.ctx.getAttribLocation(Program, "pos");

    Program.projection  = this.ctx.getUniformLocation(Program, "projection");
    Program.view        = this.ctx.getUniformLocation(Program, "view");
      
	Program.buffer = this.ctx.createBuffer();

    return Program;
};

OctreeRenderer.prototype.createOcreeGeometry = function(rootNode) {
    "use strict";
    rootNode.getVertices(this.buffer);
    this.num_verts = this.buffer.length / 3;
    this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.program.buffer);
    this.ctx.bufferData(this.ctx.ARRAY_BUFFER, new Float32Array(this.buffer), this.ctx.STATIC_DRAW);
};

OctreeRenderer.prototype.draw = function() {
    "use strict";
    this.ctx.useProgram(this.program);
    this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.program.buffer);

    this.ctx.enableVertexAttribArray(this.program.a1);
    this.ctx.vertexAttribPointer(this.program.a1, 3, this.ctx.FLOAT, false, 0, 0);

    this.ctx.uniformMatrix4fv(this.program.projection, false, this.projection);
    this.ctx.uniformMatrix4fv(this.program.view,       false, this.view);

    this.ctx.enable(this.ctx.DEPTH_TEST);
    this.ctx.drawArrays(this.ctx.LINES, 0, this.num_verts);
    this.ctx.disable(this.ctx.DEPTH_TEST);
};