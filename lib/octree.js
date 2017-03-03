function Octree(origin, size, maxlevel) {
    "use strict";
    this.origin = origin;
    this.size   = size;
    this.maxlevel = maxlevel;

    this.rootNode = new Node(origin, size, 0);
    this.rootNode.subdivide(maxlevel);
}

Octree.prototype.isosurface = function(isofunction) {
    this.rootNode.isosurface(isofunction);
    this.rootNode.setEmptyNodes();
    this.rootNode.crossingPoints(isofunction);
};







function OctreeRenderer(ctx, octree) {
    "use strict";
    this.ctx = ctx;
    this.octree = octree;
    
    this.view        = -1;
    this.projection  = -1;

    this.vertex_buffer    = [];
    this.index_buffer     = [];

    this.wireframe_buffer     = [];
    this.points_buffer        = [];

    this.oct_wire_program     = this.createOctreeWireframeProgram();
    this.oct_points_program   = this.createOctreePointsProgram();
    this.oct_mesh_program     = this.createOctreeMeshProgram();
    
    this.oct_wireframe_num_verts   = -1;
    this.oct_points_num_verts      = -1;
    this.oct_num_verts             = -1;
    this.oct_num_indexes           = -1;
}

OctreeRenderer.prototype.createOctreeWireframeProgram = function() {
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
    "    depth       = pow((pos.z + 5.0) / 10.0, 2.0) * 0.8 + 0.2;" +
    "}";

    var fragment_shader = 
    "precision mediump float;" +
    "" +
    "varying float depth;" +
    "" +
    "void main() {" +
    "    gl_FragColor = vec4(vec3(depth * 0.3), 1.0);" +
    "}";

    var Program = createProgramFromSource(vertex_shader, fragment_shader, this.ctx);
	Program.a1  = this.ctx.getAttribLocation(Program, "pos");

    Program.projection  = this.ctx.getUniformLocation(Program, "projection");
    Program.view        = this.ctx.getUniformLocation(Program, "view");
      
	Program.buffer = this.ctx.createBuffer();

    return Program;
};

OctreeRenderer.prototype.createOctreePointsProgram = function() {
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
    "    gl_PointSize = 9.0;" +
    "    depth        = pow((pos.z + 5.0) / 10.0, 2.0) * 0.8 + 0.2;" +
    "}";

    var fragment_shader = 
    "precision mediump float;" +
    "" +
    "varying float depth;" +
    "" +
    "void main() {" +
    "    gl_FragColor = vec4(vec3(1.0 * depth, 0.0, 0.0), 1.0);" +
    "}";

    var Program = createProgramFromSource(vertex_shader, fragment_shader, this.ctx);
	Program.a1  = this.ctx.getAttribLocation(Program, "pos");

    Program.projection  = this.ctx.getUniformLocation(Program, "projection");
    Program.view        = this.ctx.getUniformLocation(Program, "view");
      
	Program.buffer = this.ctx.createBuffer();

    return Program;
};

OctreeRenderer.prototype.createOctreeMeshProgram = function() {
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
    "    depth       = pow((pos.z + 5.0) / 10.0, 2.0) * 0.8 + 0.2;" +
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
      
	Program.vbuffer = this.ctx.createBuffer();
    Program.ibuffer = this.ctx.createBuffer();

    return Program;
};

OctreeRenderer.prototype.createOctreeWireframeGeometry = function() {
    "use strict";
    this.octree.rootNode.getWireframeVertices(this.wireframe_buffer);
    this.oct_wireframe_num_verts = this.wireframe_buffer.length / 3;
    this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.oct_wire_program.buffer);
    this.ctx.bufferData(this.ctx.ARRAY_BUFFER, new Float32Array(this.wireframe_buffer), this.ctx.STATIC_DRAW);
};

OctreeRenderer.prototype.createOctreePointsGeometry = function() {
    "use strict";
    this.octree.rootNode.getPointVertices(this.points_buffer);
    this.oct_points_num_verts = this.points_buffer.length / 3;
    this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.oct_points_program.buffer);
    this.ctx.bufferData(this.ctx.ARRAY_BUFFER, new Float32Array(this.points_buffer), this.ctx.STATIC_DRAW);
};

OctreeRenderer.prototype.createOctreeMeshGeometry = function() {
    "use strict";
    this.octree.rootNode.assignIndexes({ vertexbuffer: this.vertex_buffer, currentIndex: 0});
    this.oct_num_verts = this.vertex_buffer.length / 3;
    this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.oct_mesh_program.vbuffer);
    this.ctx.bufferData(this.ctx.ARRAY_BUFFER, new Float32Array(this.vertex_buffer), this.ctx.STATIC_DRAW);


    ContourCellProc(this.octree.rootNode, this.index_buffer);
    this.oct_num_indexes = this.index_buffer.length;
    this.ctx.bindBuffer(this.ctx.ELEMENT_ARRAY_BUFFER, this.oct_mesh_program.ibuffer);
    this.ctx.bufferData(this.ctx.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.index_buffer), this.ctx.STATIC_DRAW);
};

OctreeRenderer.prototype.drawOctreeWireFrame = function() {
    "use strict";
    this.ctx.useProgram(this.oct_wire_program);
    this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.oct_wire_program.buffer);

    this.ctx.enableVertexAttribArray(this.oct_wire_program.a1);
    this.ctx.vertexAttribPointer(this.oct_wire_program.a1, 3, this.ctx.FLOAT, false, 0, 0);

    this.ctx.uniformMatrix4fv(this.oct_wire_program.projection, false, this.projection);
    this.ctx.uniformMatrix4fv(this.oct_wire_program.view,       false, this.view);

    this.ctx.enable(this.ctx.DEPTH_TEST);
    this.ctx.drawArrays(this.ctx.LINES, 0, this.oct_wireframe_num_verts);
    this.ctx.disable(this.ctx.DEPTH_TEST);
};

OctreeRenderer.prototype.drawOctreePoints = function() {
    "use strict";
    this.ctx.useProgram(this.oct_points_program);
    this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.oct_points_program.buffer);

    this.ctx.enableVertexAttribArray(this.oct_points_program.a1);
    this.ctx.vertexAttribPointer(this.oct_points_program.a1, 3, this.ctx.FLOAT, false, 0, 0);

    this.ctx.uniformMatrix4fv(this.oct_points_program.projection, false, this.projection);
    this.ctx.uniformMatrix4fv(this.oct_points_program.view,       false, this.view);

    this.ctx.enable(this.ctx.DEPTH_TEST);
    this.ctx.drawArrays(this.ctx.POINTS, 0, this.oct_points_num_verts);
    this.ctx.disable(this.ctx.DEPTH_TEST);
};  

OctreeRenderer.prototype.drawOctreeMesh = function() {
    "use strict";
    this.ctx.useProgram(this.oct_mesh_program);
    this.ctx.bindBuffer(this.ctx.ELEMENT_ARRAY_BUFFER, this.oct_mesh_program.ibuffer);
    this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.oct_mesh_program.vbuffer);

    this.ctx.enableVertexAttribArray(this.oct_mesh_program.a1);
    this.ctx.vertexAttribPointer(this.oct_mesh_program.a1, 3, this.ctx.FLOAT, false, 0, 0);

    this.ctx.uniformMatrix4fv(this.oct_mesh_program.projection, false, this.projection);
    this.ctx.uniformMatrix4fv(this.oct_mesh_program.view,       false, this.view);

    this.ctx.enable(this.ctx.DEPTH_TEST);
    this.ctx.drawElements(this.ctx.TRIANGLES, this.oct_num_indexes, this.ctx.UNSIGNED_SHORT, 0);
    this.ctx.disable(this.ctx.DEPTH_TEST);
};