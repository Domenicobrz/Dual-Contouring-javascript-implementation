# Dual-Contouring-javascript-implementation


<img src="https://github.com/Domenicobrz/Dual-Contouring-javascript-implementation/blob/master/screenshots/octree3.png" width="350px">

This javascript implementation takes [Nick's excellent explanations](http://ngildea.blogspot.it/2014/11/implementing-dual-contouring.html) on the inner workings of the algorithm and expands it further in the topics he didn't discuss in depth, such as ContourCellProc's routines and the global variables of the original octree structure  of Tao Ju.

Since a blog post can't be a book, and considering the sheer amount of explanations required to fully grasp the algorithm, he omitted an in depth explanations on the inner isosurface extraction routines which will be discussed here along with a simple implementation of the algorithm in javascript togheter with a raw WebGL renderer to output the extraction results.

We'll define the following order convention for the children of each internal node:
<img src="https://github.com/Domenicobrz/Dual-Contouring-javascript-implementation/blob/master/screenshots/childrenorder.png" width="200px">


We'll start from ContourCellProc(...);

This function acts on internal nodes only, and starts by recursively calling itself on each of its eight children

```javascript
...
for (i = 0; i < 8; i++) {
    ContourCellProc(node.children[i], indexBuffer);
}
...
```

It laters calls ContourFaceProc(...); on the 12 faces adjacent to the children of the current node, highlighted in gray in the following picture

<img src="https://github.com/Domenicobrz/Dual-Contouring-javascript-implementation/blob/master/screenshots/ccpfaces.png" width="250px">

And finishes off by calling ContourEdgeProc(...) on the 6 shared edges depicted in red in the next picture

<img src="https://github.com/Domenicobrz/Dual-Contouring-javascript-implementation/blob/master/screenshots/ccpedges.png" width="250px">