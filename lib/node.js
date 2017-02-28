var children_offsets/*[8][3]*/ = [
    new Vec3(0, 0, 0),
    new Vec3(0, 0, 1),
    new Vec3(0, 1, 0),
    new Vec3(0, 1, 1),
    new Vec3(1, 0, 0),
    new Vec3(1, 0, 1),
    new Vec3(1, 1, 0),
    new Vec3(1, 1, 1)
];

var edgevmap/*[12][2]*/ = [
    [0, 4], [1, 5], [2, 6], [3, 7],	// x-axis 
    [0, 2], [1, 3], [4, 6], [5, 7],	// y-axis
    [0, 1], [2, 3], [4, 5], [6, 7]  // z-axis
];

var cellProcFaceMask/*[12][3]*/ = [[0, 4, 0], [1, 5, 0], [2, 6, 0], [3, 7, 0], [0, 2, 1], [4, 6, 1], [1, 3, 1], [5, 7, 1], [0, 1, 2], [2, 3, 2], [4, 5, 2], [6, 7, 2]];
var cellProcEdgeMask/*[6][5]*/ = [[0, 1, 2, 3, 0], [4, 5, 6, 7, 0], [0, 4, 1, 5, 1], [2, 6, 3, 7, 1], [0, 2, 4, 6, 2], [1, 3, 5, 7, 2]];

var faceProcFaceMask/*[3][4][3]*/ = [
    [[4, 0, 0], [5, 1, 0], [6, 2, 0], [7, 3, 0]],
    [[2, 0, 1], [6, 4, 1], [3, 1, 1], [7, 5, 1]],
    [[1, 0, 2], [3, 2, 2], [5, 4, 2], [7, 6, 2]]
];

var faceProcEdgeMask/*[3][4][6]*/ = [
    [[1, 4, 0, 5, 1, 1], [1, 6, 2, 7, 3, 1], [0, 4, 6, 0, 2, 2], [0, 5, 7, 1, 3, 2]],
    [[0, 2, 3, 0, 1, 0], [0, 6, 7, 4, 5, 0], [1, 2, 0, 6, 4, 2], [1, 3, 1, 7, 5, 2]],
    [[1, 1, 0, 3, 2, 0], [1, 5, 4, 7, 6, 0], [0, 1, 5, 0, 4, 1], [0, 3, 7, 2, 6, 1]]
];

var processEdgeMask/*[3][4]*/ = [[3, 2, 1, 0], [7, 5, 6, 4], [11, 10, 9, 8]];

var edgeProcEdgeMask/*[3][2][5]*/ = [
    [[3, 2, 1, 0, 0], [7, 6, 5, 4, 0]],
    [[5, 1, 4, 0, 1], [7, 3, 6, 2, 1]],
    [[6, 4, 2, 0, 2], [7, 5, 3, 1, 2]],
];

var MATERIAL_AIR = 0.0;
var MATERIAL_INTERNAL = 1.0;
var MAX_CROSSINGS = 6;
/*
    @position    dictates the 'bottom-left' origin of this node in 3D space
    @size        length of each edge for all 3 axys
    @level       how deep inside the octree this node resides. level 0 means the current node is the root
 */
function Node(position, size, level) {
    "use strict";
    this.size = size;
    this.origin = position;
    this.level = level;
    this.type = "internal";
    this.empty = false;
    // used to index this node vertex inside an index buffer
    this.index = -1;         


    this.children = [];
    this.vertices = [];
    this.material = [];
    this.signs = [];

    // glmatrix expects arrays instead of Vec3s
    this.qefpositions = [];
    this.qefnormals = [];

    this.qefresult = new Vec3(0, 0, 0);
}

Node.prototype.subdivide = function (maxlevel) {
    "use strict";
    var i;

    // assigning this node's vertices positions
    for (i = 0; i < 8; i++) {
        this.vertices.push(new Vec3(
            this.origin.x + children_offsets[i].x * this.size,
            this.origin.y + children_offsets[i].y * this.size,
            this.origin.z + children_offsets[i].z * this.size
        ));
    }

    /*  displays a possible octree subdivision, used for debugging*/
    /* if(Math.random() < 0.3) {
        this.type = "leaf";
        return;
    } */


    // we can further subdivide the octree
    if (this.level < maxlevel) {
        for (i = 0; i < 8; i++) {
            var ofs = children_offsets[i];
            var hsize = this.size / 2;
            var childpos = new Vec3(this.origin.x + ofs.x * hsize,
                                    this.origin.y + ofs.y * hsize,
                                    this.origin.z + ofs.z * hsize);

            this.children[i] = new Node(childpos, hsize, this.level + 1);
            this.children[i].subdivide(maxlevel);
        }
        return;
    }

    // if we get here, we're on a leaf node
    this.type = "leaf";

    // initialize the qef result as the center of this leaf node
    this.qefresult.x = this.origin.x + this.size / 2;
    this.qefresult.y = this.origin.y + this.size / 2;
    this.qefresult.z = this.origin.z + this.size / 2;
};

/*
    Assigns the isovalues at every vertex of a leaf node
    by running the provided isofunction which will take the 
    vertex position

    @isofunction:   a function which will check the isovalue of
                    the current vertex from it's position, whose parameters are
                    x, y, z and should return either a positive or negative number
 */
Node.prototype.isosurface = function (isofunction) {
    "use strict";
    var i = 0;

    // forward isosurface extraction to children
    if (this.type !== "leaf") {
        for (i = 0; i < 8; i++) {
            this.children[i].isosurface(isofunction);
        }
        return;
    }

    // if we get here, we're on a leaf node
    for (i = 0; i < 8; i++) {
        this.signs[i] = isofunction(this.vertices[i].x,
                                    this.vertices[i].y,
                                    this.vertices[i].z);

        this.material[i] = this.signs[i] >= 0 ? MATERIAL_AIR : MATERIAL_INTERNAL;
    }
};

Node.prototype.setEmptyNodes = function () {
    "use strict";

    var i = 0;
    if (this.type !== "leaf") {
        for (i = 0; i < 8; i++)
            this.children[i].setEmptyNodes();
    }

    if (this.type === "leaf") {
        var material_air_count = 0;
        var material_internal_count = 0;
        for (i = 0; i < 8; i++) {
            if (this.material[i] === MATERIAL_AIR) {
                material_air_count++;
            } else {
                material_internal_count++;
            }
        }

        if (material_air_count === 8 || material_internal_count === 8) {
            this.empty = true;
        }

        // nothing else to do on a leaf node at this point
        return;
    }


    // if even one of our children is not empty, neither this cell is
    this.empty = true;
    for (i = 0; i < 8; i++) {
        if (!this.children[i].empty) {
            this.empty = false;
            break;
        }
    }
};










/* the following functions will be used for rendering only. 
   they're not related to the structure of an octree's node.
   I didn't merge those with the OctreeRenderer class since
   it was easier to debug nodes this way
 */



/*
    Used for debugging. 
    Will recursively fill the provided buffer with this node's line vertices
    and the vertices of each child.

    @buffer an array filled with lines vertices
 */
Node.prototype.getWireframeVertices = function (buffer) {
    "use strict";
    var i = 0;

    if (this.empty) return;

    // construct the 12 edges lines from this node's vertices
    for (i = 0; i < 12; i++) {
        var v1_index = edgevmap[i][0];
        var v2_index = edgevmap[i][1];

        buffer.push(this.vertices[v1_index].x,
                    this.vertices[v1_index].y,
                    this.vertices[v1_index].z,
                
                    this.vertices[v2_index].x,
                    this.vertices[v2_index].y,
                    this.vertices[v2_index].z);
    }

    // forward octreeVertices extraction to children
    if (this.type !== "leaf") {
        for (i = 0; i < 8; i++) {
            this.children[i].getWireframeVertices(buffer);
        }
    }
};

/*
    Used for debugging
 */
Node.prototype.getPointVertices = function (buffer) {
    "use strict";
    var i = 0;

    if (this.empty) return;

    // forward octreeVertices extraction to children
    if (this.type !== "leaf") {
        for (i = 0; i < 8; i++) {
            this.children[i].getPointVertices(buffer);
        }
        return;
    }

    // returns only the sign of the first vertex for now
    buffer.push(this.qefresult.x,
        this.qefresult.y,
        this.qefresult.z);
};

/*
    will assign vertices values and indexes to bufferObject
    @bufferObject will hold a flat buffer to push vertices positions and 
                  a currentIndex property to increment after each leaf is 
                  evaluated

    it expects a bufferObject Object with the following properties:
    {
        vertexbuffer: @type array
        currentIndex: @type number
    }
    since the currentIndex state needs to persist between recursive calls
 */
Node.prototype.assignIndexes = function (bufferObject) {
    "use strict";

    // forward assignment to leaf only
    var i = 0;
    if (this.type !== "leaf") {
        for (i = 0; i < 8; i++) {
            this.children[i].assignIndexes(bufferObject);
        }
        return;
    }



    // if we get here we're on a leaf node

    // we could decide to index and store only nodes with sign changes 
    // if(this.empty) return;

    bufferObject.vertexbuffer.push(this.qefresult.x,
                                   this.qefresult.y,
                                   this.qefresult.z);

    this.index = bufferObject.currentIndex;
    bufferObject.currentIndex++;
};

/*
    Will compute this node's crossing points linearly and it's normal 
    with finite differences
*/
Node.prototype.crossingPoints = function(isofunction) {

    var i = 0;
    if(this.type !== "leaf") {
        for(i = 0; i < 8; i++) {
            this.children[i].crossingPoints(isofunction);
        }
        return;
    }

    var edgeCount = 0;
    for (i = 0; i < 12 && edgeCount < MAX_CROSSINGS; i++) {
        var v1 = edgevmap[i][0];
        var v2 = edgevmap[i][1];

        var s1 = this.material[v1];
        var s2 = this.material[v2];

        if ((s1 === MATERIAL_AIR && s2 === MATERIAL_AIR) ||
            (s1 === MATERIAL_INTERNAL && s2 === MATERIAL_INTERNAL)) {
            // no zero crossing on this edge
            continue;
        }

        var p1 = this.vertices[v1];
        var p2 = this.vertices[v2];


        // compute zero crossing point Linearly
        var t = Math.abs(this.signs[v1] / (this.signs[v2] - this.signs[v1]));
        var p = [
            p1.x + (p2.x - p1.x) * t,
            p1.y + (p2.y - p1.y) * t,
            p1.z + (p2.z - p1.z) * t
        ];
        this.qefpositions[edgeCount] = p;


        // compute surface normal with finite differences and find the rate of change
        var h  = 0.001;
        var dx = isofunction(p[0] + h, p[1], p[2]) - isofunction(p[0] - h, p[1], p[2]);
        var dy = isofunction(p[0], p[1] + h, p[2]) - isofunction(p[0], p[1] - h, p[2]);
        var dz = isofunction(p[0], p[1], p[2] + h) - isofunction(p[0], p[1], p[2] - h);
        this.qefnormals[edgeCount] = [dx, dy, dz];
        vec3.normalize(this.qefnormals[edgeCount], this.qefnormals[edgeCount]);

        edgeCount++;
    }

    var averagePos = [0,0,0];
    var averageNormal = [0,0,0];
    for(var i = 0; i < this.qefpositions.length; i++) {
        averagePos[0] += this.qefpositions[i][0];
        averagePos[1] += this.qefpositions[i][1];
        averagePos[2] += this.qefpositions[i][2];
    }

    averagePos[0] /= this.qefpositions.length;
    averagePos[1] /= this.qefpositions.length;
    averagePos[2] /= this.qefpositions.length;

    this.qefresult.x = averagePos[0];
    this.qefresult.y = averagePos[1];
    this.qefresult.z = averagePos[2];
};


/*
    Countour Cell Procs routines may receive more than one child, 
    we can't therefore add them as Node.prototype's memebers
 */

function ContourCellProc(node, indexBuffer) {
    if (!node) {
        return;
    }

    var i = 0;
    var j = 0;
    if (node.type === "internal") {
        for (i = 0; i < 8; i++) {
            ContourCellProc(node.children[i], indexBuffer);
        }

        for (i = 0; i < 12; i++) {
            faceNodes = [-1, -1];
            var c0 = cellProcFaceMask[i][0];
            var c1 = cellProcFaceMask[i][1];

            faceNodes[0] = node.children[c0];
            faceNodes[1] = node.children[c1];

            ContourFaceProc(faceNodes, cellProcFaceMask[i][2], indexBuffer);
        }

        for (i = 0; i < 6; i++) {
            edgeNodes = [-1, -1, -1, -1];
            c = [
                cellProcEdgeMask[i][0],
                cellProcEdgeMask[i][1],
                cellProcEdgeMask[i][2],
                cellProcEdgeMask[i][3],
            ];

            for (j = 0; j < 4; j++) {
                edgeNodes[j] = node.children[c[j]];
            }

            ContourEdgeProc(edgeNodes, cellProcEdgeMask[i][4], indexBuffer);
        }
    }
}

function ContourFaceProc(nodes, dir, indexBuffer) {
    if (!nodes[0] || !nodes[1]) {
        return;
    }

    // TODO: check if tao ju declared that no leaf node could access this statement and that
    // both nodes needs to be internal
    var i = 0;
    var j = 0;
    var c = [];
    if (nodes[0].type === "internal" ||
        nodes[1].type === "internal") {
        for (i = 0; i < 4; i++) {
            var faceNodes = [-1, -1];
            c = [
                faceProcFaceMask[dir][i][0],
                faceProcFaceMask[dir][i][1]
            ];

            for (j = 0; j < 2; j++) {
                if (nodes[j].type !== "internal") {
                    faceNodes[j] = nodes[j];
                }
                else {
                    faceNodes[j] = nodes[j].children[c[j]];
                }
            }

            ContourFaceProc(faceNodes, faceProcFaceMask[dir][i][2], indexBuffer);
        }

        var orders/*[2][4]*/ =
            [
                [0, 0, 1, 1],
                [0, 1, 0, 1]
            ];
		/*
		const int faceProcEdgeMask[3][4][6] = {
			{{1,4,0,5,1,1},{1,6,2,7,3,1},{0,4,6,0,2,2},{0,5,7,1,3,2}},
			{{0,2,3,0,1,0},{0,6,7,4,5,0},{1,2,0,6,4,2},{1,3,1,7,5,2}},
			{{1,1,0,3,2,0},{1,5,4,7,6,0},{0,1,5,0,4,1},{0,3,7,2,6,1}}
		};*/
        for (i = 0; i < 4; i++) {
            var edgeNodes = [-1, -1, -1, -1];
            c = [
                faceProcEdgeMask[dir][i][1],
                faceProcEdgeMask[dir][i][2],
                faceProcEdgeMask[dir][i][3],
                faceProcEdgeMask[dir][i][4]
            ];

            var order = orders[faceProcEdgeMask[dir][i][0]];
            for (j = 0; j < 4; j++) {
                if (nodes[order[j]].type === "leaf") {
                    edgeNodes[j] = nodes[order[j]];
                }
                else {
                    edgeNodes[j] = nodes[order[j]].children[c[j]];
                }
            }

            ContourEdgeProc(edgeNodes, faceProcEdgeMask[dir][i][5], indexBuffer);
        }
    }
}

function ContourEdgeProc(nodes, dir, indexBuffer) {
    // se anche UNO dei nodi che ci sono arrivati non esiste, return.
    if (!nodes[0] || !nodes[1] || !nodes[2] || !nodes[3]) {
        return;
    }


    var i = 0;
    var j = 0;
    if (nodes[0].type !== "internal" &&
        nodes[1].type !== "internal" &&
        nodes[2].type !== "internal" &&
        nodes[3].type !== "internal") {
        ContourProcessEdge(nodes, dir, indexBuffer);
    }
    else {
        for (i = 0; i < 2; i++) {
            edgeNodes = [-1, -1, -1, -1];
            var c = [
                // se uno dei nodi non è leaf, qual è il children di questo nodo 
                // che puo' essere apparato agli altri leaf per formare 4 nodi da
                // passare di nuovo a contourEdgeProc(); ?
                edgeProcEdgeMask[dir][i][0],
                edgeProcEdgeMask[dir][i][1],
                edgeProcEdgeMask[dir][i][2],
                edgeProcEdgeMask[dir][i][3]
            ];

            for (j = 0; j < 4; j++) {
                if (nodes[j].type === "leaf") {
                    edgeNodes[j] = nodes[j];
                }
                else {
                    edgeNodes[j] = nodes[j].children[c[j]];
                }
            }

            ContourEdgeProc(edgeNodes, edgeProcEdgeMask[dir][i][4], indexBuffer);
        }
    }
}

function ContourProcessEdge(nodes, dir, indexBuffer) {
    var minSize = 1000000;		// arbitrary big number
    var minIndex = 0;
    var indices = [-1, -1, -1, -1];
    var flip = false;
    var signChange = [false, false, false, false];

    var i = 0;
    for (i = 0; i < 4; i++) {

        // edge in comune con i 4 nodi
        var edge = processEdgeMask[dir][i];
        // vertici di quest'edge
        var c1 = edgevmap[edge][0];
        var c2 = edgevmap[edge][1];

        // signs di questi vertici
        var m1 = nodes[i].material[c1];
        var m2 = nodes[i].material[c2];

        var flip = m1 !== MATERIAL_AIR;

        indices[i] = nodes[i].index;

        signChange[i] = (m1 === MATERIAL_AIR && m2 === MATERIAL_INTERNAL) ||
            (m1 === MATERIAL_INTERNAL && m2 === MATERIAL_AIR);
    }

    if (signChange[0]) {
        if (!flip) {
            indexBuffer.push(indices[0]);
            indexBuffer.push(indices[1]);
            indexBuffer.push(indices[3]);

            indexBuffer.push(indices[0]);
            indexBuffer.push(indices[3]);
            indexBuffer.push(indices[2]);
        }
        else {
            indexBuffer.push(indices[0]);
            indexBuffer.push(indices[3]);
            indexBuffer.push(indices[1]);

            indexBuffer.push(indices[0]);
            indexBuffer.push(indices[2]);
            indexBuffer.push(indices[3]);
        }
    }
}