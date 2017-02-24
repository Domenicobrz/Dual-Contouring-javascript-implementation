var children_offsets/*[8][3]*/ = [
    new Vec3(0,0,0),
    new Vec3(0,0,1),
    new Vec3(0,1,0),
    new Vec3(0,1,1),
    new Vec3(1,0,0),
    new Vec3(1,0,1),
    new Vec3(1,1,0),
    new Vec3(1,1,1)
];

var edgevmap/*[12][2]*/ = [
	[0,4], [1,5], [2,6], [3,7],	// x-axis 
	[0,2], [1,3], [4,6], [5,7],	// y-axis
	[0,1], [2,3], [4,5], [6,7]  // z-axis
];

/*
    @position    dictates the 'bottom-left' origin of this node in 3D space
    @size        length of each edge for all 3 axys
    @level       how deep inside the octree this node resides. level 0 means the current node is the root
 */
function Node(position, size, level) {
    "use strict";
    this.size     = size;
    this.origin   = position;
    this.level    = level;
    this.type     = "internal";  
    this.empty    = false;
    this.index    = -1;         // used to index this node vertex inside an index buffer

    
    this.children = [];
    this.vertices = [];
    this.signs    = [];
    this.qefresult = new Vec3(0,0,0);
}

Node.prototype.subdivide = function(maxlevel) {
    "use strict";
    var i;

    // assigning this node's vertices positions
    for(i = 0; i < 8; i++) {
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
    if(this.level < maxlevel) {
        for(i = 0; i < 8; i++) {
            var ofs      = children_offsets[i];
            var hsize    = this.size / 2;
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
Node.prototype.isosurface = function(isofunction) {
    "use strict";
    var i = 0;

    // forward isosurface extraction to children
    if(this.type != "leaf") {
        for(i = 0; i < 8; i++) {
            this.children[i].isosurface(isofunction);
        }
        return;
    }

    // if we get here, we're on a leaf node
    for(i = 0; i < 8; i++) {
        this.signs[i] = isofunction(this.vertices[i].x, 
                                    this.vertices[i].y,
                                    this.vertices[i].z );
    }
};

Node.prototype.setEmptyNodes = function() {
    "use strict";

     var i = 0;
     if(this.type != "leaf") {
         for(i = 0; i < 8; i++)
            this.children[i].setEmptyNodes();
     }

     if(this.type == "leaf") {
        var db = 1.5;
        if(this.origin.x > db && this.origin.y > db && this.origin.z > db) {
            var y = 0;
        }

        var material_air_count = 0;
        var material_internal_count = 0;
        for(i = 0; i < 8; i++) {
            if(this.signs[i] === 0) {
                material_air_count++;
            } else {
                material_internal_count++;
            }
        }

        if(material_air_count === 8 || material_internal_count === 8) {
            this.empty = true;
        }

        // nothing else to do on a leaf node at this point
        return;
     }


     // if even one of our children is not empty, neither this cell is
     this.empty = true;
     for(i = 0; i < 8; i++) {
         if(!this.children[i].empty) {
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
Node.prototype.getWireframeVertices = function(buffer) {
    "use strict";
    var i = 0;

    if(this.empty) return;

    // construct the 12 edges lines from this node's vertices
    for(i = 0; i < 12; i++) {
        var v1_index = edgevmap[i][0];
        var v2_index = edgevmap[i][1];
        
        buffer.push( this.vertices[v1_index].x,
                     this.vertices[v1_index].y,
                     this.vertices[v1_index].z,
                     
                     this.vertices[v2_index].x,
                     this.vertices[v2_index].y,
                     this.vertices[v2_index].z );
    }

    // forward octreeVertices extraction to children
    if(this.type != "leaf") {
        for(i = 0; i < 8; i++) {
            this.children[i].getWireframeVertices(buffer);
        }
    }
};

/*
    Used for debugging
 */
Node.prototype.getPointVertices = function(buffer) {
    "use strict";
    var i = 0;

    if(this.empty) return;

    // forward octreeVertices extraction to children
    if(this.type != "leaf") {
        for(i = 0; i < 8; i++) {
            this.children[i].getPointVertices(buffer);
        }
        return;
    }

    // returns only the sign of the first vertex for now
    buffer.push( this.qefresult.x,
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
Node.prototype.assignIndexes = function(bufferObject) {
    "use strict";

    // forward assignment to leaf only
    var i = 0;
    if(this.type != "leaf") {
        for(i = 0; i < 8; i++) {
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